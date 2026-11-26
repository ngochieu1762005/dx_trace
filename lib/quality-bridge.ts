/* DX-TRACE | Transactional quality-to-warehouse escalation.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {withWorkspace} from './workspace-queue.mjs';
import {q,db,hash,read} from './server.ts';
import {canRead} from './platform.mjs';
import {apply,DomainError} from './domain.mjs';
import {decisionSnapshot} from './evidence-capture.mjs';
import {evidenceInsert} from './evidence-store.ts';

const fail=(message:string,status=409):never=>{throw new DomainError(message,status)};

/** One transaction links the reviewed record, quarantines its lot and journals the decision. */
export async function escalateQuality(c:any,id:string,body:any,key:string){
 if(!['owner','manager'].includes(c.role))fail('Cần quyền quản lý để chuyển kiểm định thành sự cố',403);
 if(!key||key.length>100)fail('Thiếu mã yêu cầu duy nhất',400);
 if(!body||!Number.isSafeInteger(body.version)||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>1500||!['medium','high','critical'].includes(body.severity))fail('Cần phiên bản, lý do và mức ưu tiên hợp lệ',422);
 const who=c.email||c.name,command='quality.escalate';
 const fingerprint=await hash(command+JSON.stringify({id,...body}));
 return withWorkspace(c.workspace,async()=>{
  for(let attempt=0;attempt<6;attempt++){
   const workspace=await read(c.workspace),revision=workspace.revision;
   const previousCommand=await q('SELECT * FROM platform_commands WHERE workspace=? AND key=?',c.workspace,key).first();
   if(previousCommand){
    if(previousCommand.actor!==who||previousCommand.fingerprint!==fingerprint)fail('Mã yêu cầu đã được sử dụng');
    return JSON.parse(previousCommand.result);
   }
   const model=await q('SELECT payload FROM platform_models WHERE workspace=? AND id=?',c.workspace,'quality').first();
   if(!model||!JSON.parse(model.payload).definition.permissions.read.includes(c.role))fail('Không tìm thấy mô hình kiểm định',404);
   const stored=await q('SELECT payload FROM platform_records WHERE workspace=? AND model=? AND id=?',c.workspace,'quality',id).first();
   if(!stored)fail('Không tìm thấy hồ sơ kiểm định',404);
   const record=JSON.parse(stored.payload),sourceRecord=structuredClone(record);
   if(!canRead(JSON.parse(model.payload).definition,record,{role:c.role,actor:who}))fail('Không có quyền đọc hồ sơ kiểm định',403);
   if(record.version!==body.version)fail('Hồ sơ đã thay đổi, hãy tải lại');
   if(record.status!=='rejected')fail('Chỉ chuyển hồ sơ đã thẩm định không đạt');
   if(record.warehouseIncident)fail('Hồ sơ đã được liên kết với sự cố');
   const lot=workspace.data.lots.find((item:any)=>item.id===body.lot);
   if(!lot)fail('Không tìm thấy lô trong kho hiện tại',404);
   if(record.data.lot!==lot.code)fail('Mã lô trong phiếu kiểm định không khớp lô được chọn',422);
   const now=new Date().toISOString(),reason=body.reason.trim();
   let state=workspace.data;
   const open=state.incidents.find((item:any)=>item.lot===lot.id&&item.status!=='closed');
   const incidentId=open?.id||'INC-'+crypto.randomUUID();
   if(!open){
    state=apply(state,'incident.create',{lot:lot.id,severity:body.severity,reason:'Kiểm định '+id+': '+reason},{role:c.role,actor:who,now,entity:incidentId}).state;
   }else{
    state.events.unshift({id:crypto.randomUUID(),actor:who,action:command,entity:incidentId,detail:'Liên kết kiểm định '+id+' với sự cố đang mở của '+lot.code,created:now});
   }
   const incident=state.incidents.find((item:any)=>item.id===incidentId);
   if(!open&&process.env.DX_FLOWABLE_URL){
    incident.review={engine:'Flowable',ticket:await hash(JSON.stringify(['quality',c.workspace,id,incidentId])),reporter:c.id,instance:null,outcome:null};
   }
   record.warehouseIncident={id:incidentId,lot:lot.id,lotCode:lot.code,actor:who,created:now,reason};
   record.history.push({action:command,actor:who,created:now,incident:incidentId,reason});
   record.version++;record.updated=now;
   const content=JSON.stringify(record),warehouseContent=JSON.stringify(state);
   if(Buffer.byteLength(content)>524288||warehouseContent.length>1800000)fail('Dữ liệu vượt giới hạn lưu trữ',422);
   const result={id,version:record.version,incident:incidentId,lot:lot.id,reused:!!open,...(incident.review?{flowable:true}:{})};
   const previous=(await q('SELECT hash FROM audit_ledger WHERE workspace=? ORDER BY seq DESC LIMIT 1',c.workspace).first())?.hash||'0'.repeat(64);
   const payload=JSON.stringify({action:command,actor:who,entity:id,incident:incidentId,lot:lot.id,reason,created:now});
   const digest=await hash(previous+'\n'+(revision+1)+'\n'+payload);
   const evidence=await evidenceInsert(c,decisionSnapshot({context:c,command,body:{...body,id},before:workspace.data,after:state,
    result:{id:incidentId},eventEntity:id,seq:revision+1,created:now,extraSources:[{id:'quality-record',kind:'reviewed-quality-record',origin:'platform_records/quality/'+id,data:sourceRecord}]}),
    {seq:revision+1,previous,hash:digest,payload},revision);
   const guard=' WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)';
   const statements=[
    q('UPDATE platform_records SET payload=?,updated=? WHERE workspace=? AND model=? AND id=? AND EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)',content,now,c.workspace,'quality',id,c.workspace,revision),
    q('INSERT INTO platform_commands(workspace,key,actor,fingerprint,result,created) SELECT ?,?,?,?,?,?'+guard,c.workspace,key,who,fingerprint,JSON.stringify(result),now,c.workspace,revision),
    q('INSERT INTO audit_ledger(workspace,seq,previous,hash,payload,created) SELECT ?,?,?,?,?,?'+guard,c.workspace,revision+1,previous,digest,payload,now,c.workspace,revision),
    ...(evidence?[evidence]:[]),
    q('UPDATE workspaces SET state=?,revision=revision+1 WHERE id=? AND revision=?',warehouseContent,c.workspace,revision)
   ];
   if((await db().batch(statements)).at(-1).meta.changes===1)return result;
  }
  fail('Kho đang thay đổi, hãy tải lại');
 });
}
