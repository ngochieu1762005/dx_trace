/* DX-TRACE | Indexed, transactional model storage. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {withWorkspace} from './workspace-queue.mjs';
import {q,db,hash} from './server.ts';
import {applyPlatform,planModel,platformView,PlatformError,recordScope} from './platform.mjs';
const fail=(m:string,s=422)=>{throw new PlatformError(m,s)};
const actor=(c:any)=>({role:c.role,actor:c.email||c.name,now:new Date().toISOString()});
export async function models(c:any){return (await q('SELECT payload FROM platform_models WHERE workspace=? ORDER BY id',c.workspace).all()).results.map((r:any)=>JSON.parse(r.payload))}
export async function plan(c:any,definition:any){
 if(c.role!=='owner')fail('Cần quyền chủ không gian',403);
 const all=await models(c),records=(await q('SELECT payload FROM platform_records WHERE workspace=? AND model=?',c.workspace,definition?.id||'').all()).results.map((r:any)=>JSON.parse(r.payload));
 return planModel({models:all,records},definition);
}
export async function queryRecords(c:any,params:URLSearchParams){
 const all=await models(c),visible=platformView({models:all,records:[]},actor(c)).models;
 const model=params.get('model');if(model&&!visible.some((m:any)=>m.id===model))fail('Không tìm thấy mô hình',404);
 const limit=Number(params.get('limit')||50),offset=Number(params.get('offset')||0);
 if(!Number.isInteger(limit)||limit<1||limit>200||!Number.isInteger(offset)||offset<0)fail('Phân trang không hợp lệ');
 const selected=visible.filter((m:any)=>!model||m.id===model),clauses:string[]=[],args:any[]=[c.workspace];
 for(const m of selected){const own=recordScope(m.definition,c.role)==='own';clauses.push('(model=?'+(own?' AND actor=?':'')+')');args.push(m.id);if(own)args.push(c.email||c.name)}
 if(!clauses.length)return {models:visible,records:[],summary:{total:0,overdue:0,byStatus:{}},page:{limit,offset,total:0,hasMore:false}};
 let where='workspace=? AND ('+clauses.join(' OR ')+')';
 const now=new Date().toISOString();
 const terminals=selected.flatMap((m:any)=>m.definition.workflow.terminal.map((s:string)=>[m.id,s]));
 const overdue='due_at IS NOT NULL AND due_at<?'+(terminals.length?' AND NOT ('+terminals.map(()=>'(model=? AND status=?)').join(' OR ')+')':'');
 const overdueArgs=[now,...terminals.flat()];
 const count=async(sql:string,a:any[])=>Number((await q(sql,...a).first())?.n||0);
 const total=await count('SELECT COUNT(*) n FROM platform_records WHERE '+where,args);
 const late=await count('SELECT COUNT(*) n FROM platform_records WHERE '+where+' AND '+overdue,[...args,...overdueArgs]);
 const byStatus=Object.fromEntries((await q('SELECT status,COUNT(*) n FROM platform_records WHERE '+where+' GROUP BY status',...args).all()).results.map((r:any)=>[r.status,r.n]));
 if(params.get('open')==='1'&&terminals.length){where+=' AND NOT ('+terminals.map(()=>'(model=? AND status=?)').join(' OR ')+')';args.push(...terminals.flat())}
 const status=params.get('status');if(status==='overdue'){where+=' AND '+overdue;args.push(...overdueArgs)}else if(status&&status!=='all'){where+=' AND status=?';args.push(status)}
 const search=params.get('q')?.trim();if(search){if(search.length>200)fail('Từ khóa quá dài');where+=" AND (id LIKE ? ESCAPE '\\' OR json_extract(payload,'$.data') LIKE ? ESCAPE '\\')";const term='%'+search.replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term)}
 const filtered=await count('SELECT COUNT(*) n FROM platform_records WHERE '+where,args);
 const ordering=params.get('order')==='due'?'CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,due_at,updated DESC,id':'updated DESC,id';
 const records=(await q('SELECT payload FROM platform_records WHERE '+where+' ORDER BY '+ordering+' LIMIT ? OFFSET ?',...args,limit,offset).all()).results.map((r:any)=>JSON.parse(r.payload));
 return {models:visible,records:platformView({models:all,records},actor(c)).records,summary:{total,overdue:late,byStatus},page:{limit,offset,total:filtered,hasMore:offset+limit<filtered}};
}
export async function changePlatform(c:any,cmd:string,b:any,key:string){
 return withWorkspace(c.workspace,()=>changePlatformUnlocked(c,cmd,b,key));
}
async function changePlatformUnlocked(c:any,cmd:string,b:any,key:string){
 if(!key||key.length>100)fail('Thiếu mã yêu cầu duy nhất',400);
 const who=c.email||c.name,fingerprint=await hash(cmd+JSON.stringify(b)),entity='REC-'+crypto.randomUUID();
 for(let attempt=0;attempt<6;attempt++){
  const revision=(await q('SELECT revision FROM workspaces WHERE id=?',c.workspace).first()).revision;
  const prior=await q('SELECT * FROM platform_commands WHERE workspace=? AND key=?',c.workspace,key).first();
  if(prior){if(prior.fingerprint!==fingerprint||prior.actor!=='*'&&prior.actor!==who)fail('Mã yêu cầu đã được sử dụng',409);return JSON.parse(prior.result)}
  const all=await models(c);
  const records=cmd==='platform.apply'?(await q('SELECT payload FROM platform_records WHERE workspace=? AND model=?',c.workspace,b.definition?.id||'').all()).results:cmd==='platform.create'?[]:(await q('SELECT payload FROM platform_records WHERE workspace=? AND model=? AND id=?',c.workspace,b.model,b.id||'').all()).results;
  const state={models:all,records:records.map((r:any)=>JSON.parse(r.payload))};
  const now=new Date().toISOString(),result=applyPlatform(state,cmd,b,{...actor(c),now,entity});
  const value=cmd==='platform.apply'?state.models.find((m:any)=>m.id===result.id):state.records.find((r:any)=>r.id===result.id);
  const content=JSON.stringify(value);if(Buffer.byteLength(content)>524288)fail('Hồ sơ hoặc lịch sử mô hình vượt 512 KiB');
  const previous=(await q('SELECT hash FROM audit_ledger WHERE workspace=? ORDER BY seq DESC LIMIT 1',c.workspace).first())?.hash||'0'.repeat(64);
  const payload=JSON.stringify({action:cmd,actor:who,entity:result.id,created:now}),digest=await hash(previous+'\n'+(revision+1)+'\n'+payload);
  const guard=' WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)';
  const write=cmd==='platform.apply'?q('INSERT INTO platform_models(workspace,id,payload) SELECT ?,?,?'+guard+' ON CONFLICT(workspace,id) DO UPDATE SET payload=excluded.payload',c.workspace,result.id,content,c.workspace,revision):q('INSERT INTO platform_records(workspace,model,id,actor,status,updated,due_at,payload) SELECT ?,?,?,?,?,?,?,?'+guard+' ON CONFLICT(workspace,model,id) DO UPDATE SET status=excluded.status,updated=excluded.updated,due_at=excluded.due_at,payload=excluded.payload',c.workspace,value.model,value.id,value.createdBy,value.status,value.updated,value.dueAt||null,content,c.workspace,revision);
  const statements=[write,q('INSERT INTO platform_commands(workspace,key,actor,fingerprint,result,created) SELECT ?,?,?,?,?,?'+guard,c.workspace,key,who,fingerprint,JSON.stringify(result),now,c.workspace,revision),q('INSERT INTO audit_ledger(workspace,seq,previous,hash,payload,created) SELECT ?,?,?,?,?,?'+guard,c.workspace,revision+1,previous,digest,payload,now,c.workspace,revision),q('UPDATE workspaces SET revision=revision+1 WHERE id=? AND revision=?',c.workspace,revision)];
  if((await db().batch(statements))[3].meta.changes===1)return result;
 }
 fail('Dữ liệu đang thay đổi, hãy tải lại',409);
}

/** Profile only records already visible to the same caller's model listing.
 * No example values or identities are returned. SQLite reads in this method
 * are one aggregate statement, not an unbounded JS scan. */
export async function profileModel(c:any,id:string){
 const m=(await models(c)).find((x:any)=>x.id===id&&x.definition.permissions.read.includes(c.role));
 if(!m)fail('Không tìm thấy mô hình',404);
 const fields=m.definition.fields,select=['COUNT(*) AS total','MAX(updated) AS latest'],bind:any[]=[];
 for(let i=0;i<fields.length;i++){
  const f=fields[i],path='$.data.'+f.key;
  select.push("COALESCE(SUM(CASE WHEN json_extract(payload,?) IS NOT NULL AND json_extract(payload,?) <> '' THEN 1 ELSE 0 END),0) AS filled_"+i);
  bind.push(path,path);
 }
 const own=recordScope(m.definition,c.role)==='own';
 const row=await q('SELECT '+select.join(',')+' FROM platform_records WHERE workspace=? AND model=?'+(own?' AND actor=?':''),
   ...bind,c.workspace,id,...(own?[c.email||c.name]:[])).first();
 const total=Number(row.total);
 return {model:id,version:m.version,total,latest:row.latest??null,
   fields:fields.map((f:any,i:number)=>({key:f.key,label:f.label,required:!!f.required,
     conditional:!!f.requiredWhen,present:Number(row['filled_'+i]),missing:total-Number(row['filled_'+i])}))};
}
