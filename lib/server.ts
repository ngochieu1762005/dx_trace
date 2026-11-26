/*
 * DX-TRACE | Workspace isolation, revisions and command persistence
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File lib/server.ts
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {withWorkspace} from './workspace-queue.mjs';
import {env, getSessionUser} from '../selfhost/runtime.mjs';
import {seedDemo,expandTraining} from './demo.mjs';
import {initial,apply,DomainError,insights} from './domain.mjs';
export const db=()=>{if(!env.DB)throw new DomainError('Cơ sở dữ liệu chưa sẵn sàng',503);return env.DB};
export const q=(sql:string,...args:any[])=>db().prepare(sql).bind(...args);
export const hash=async(value:string|ArrayBuffer)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function ctx(request:Request){
 const u=await getSessionUser();if(!u)throw new DomainError('Vui lòng đăng nhập bằng tài khoản kho',401);
 let m:any=await q('SELECT * FROM members WHERE id=?',u.userId).first();
 if(!m){const invite:any=await q('SELECT * FROM invitations WHERE email=?',u.email.toLowerCase()).first();const wid=invite?.workspace||'ws-'+await hash(u.userId);
 await db().batch([...(invite?[]:[q('INSERT OR IGNORE INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)',wid,u.userId,JSON.stringify(initial()),new Date().toISOString())]),q('INSERT OR IGNORE INTO members(id,workspace,email,name,role) VALUES(?,?,?,?,?)',u.userId,wid,u.email,u.displayName,invite?.role||'owner')]);m=await q('SELECT * FROM members WHERE id=?',u.userId).first()}
 if(m.role==='disabled')throw new DomainError('Quyền truy cập đã bị thu hồi. Liên hệ chủ không gian.',403);
 const base=await read(m.workspace);
 const training=new URL(request.url).searchParams.get('area')==='training';
 const useBase=Boolean(base.data.demo)===training;
 const workspace=useBase?m.workspace:m.workspace+(training?':training':':live');
 if(!useBase){
   const now=new Date().toISOString();
   const fresh=training?seedDemo(initial(),now):initial();
   await q('INSERT OR IGNORE INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)',workspace,base.owner,JSON.stringify(fresh),now).run();
 }
 if(training){
   for(let attempt=0;attempt<6;attempt++){
     const row=await read(workspace);
     if(!row.data.demo || row.data.trainingEdition>=2)break;
     const next=expandTraining(row.data,new Date().toISOString());
     const result=await q('UPDATE workspaces SET state=?,revision=revision+1 WHERE id=? AND revision=?',JSON.stringify(next),workspace,row.revision).run();
     if(result.meta.changes)break;
   }
 }
 return {...m,organization:m.workspace,workspace};
}
export async function read(workspace:string){const r:any=await q('SELECT * FROM workspaces WHERE id=?',workspace).first();if(!r)throw new DomainError('Không gian không tồn tại',404);return {...r,data:JSON.parse(r.state)}}
export async function snapshot(c:any){const r=await read(c.workspace);const s=r.data;delete s.requests;delete s.models;delete s.records;return {...s,revision:r.revision,me:{name:c.name,email:c.email,role:c.role},members:(await q('SELECT id,name,email,role FROM members WHERE workspace=?',c.organization).all()).results,alerts:insights(s),capabilities:{storage:true,uploads:!!env.BUCKET,ai:!!(env as any).AI_API_KEY,scanner:!!(env as any).FILE_SCAN_URL},serverTime:new Date().toISOString()}}
export async function change(c:any,cmd:string,b:any,key:string){
 return withWorkspace(c.workspace,()=>changeUnlocked(c,cmd,b,key));
}
async function changeUnlocked(c:any,cmd:string,b:any,key:string){
 if(!key||key.length>100)throw new DomainError('Thiếu mã yêu cầu duy nhất',400);
 const fingerprint=await hash(cmd+JSON.stringify(b));const entity=cmd.split('.')[0].slice(0,3).toUpperCase()+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
 for(let attempt=0;attempt<6;attempt++){
  const r=await read(c.workspace);const previous=r.data.requests[key];if(previous){if(previous.fingerprint!==fingerprint)throw new DomainError('Mã yêu cầu đã dùng cho thao tác khác',409);return previous.result}
  const sensorKey=JSON.stringify([c.workspace,b.device,b.id]);
  if(cmd==='sensor.ingest'){
   const old:any=await q('SELECT fingerprint,payload FROM sensor_history WHERE key=?',sensorKey).first();
   if(old){
    if(old.fingerprint!==fingerprint)throw new DomainError('Mã số đo đã dùng với nội dung khác',409);
    return {id:JSON.parse(old.payload).id,duplicate:true};
   }
  }
  const out=apply(r.data,cmd,b,{role:c.role,actor:c.email||c.name,now:new Date().toISOString(),entity});
  out.state.requests[key]={fingerprint,result:out.result};const keys=Object.keys(out.state.requests);while(keys.length>600)delete out.state.requests[keys.shift()!];
  const last:any=await q('SELECT hash FROM audit_ledger WHERE workspace=? ORDER BY seq DESC LIMIT 1',c.workspace).first();
  const previousHash=last?.hash||'0'.repeat(64),created=new Date().toISOString();
  const payload=JSON.stringify({action:cmd,actor:c.email||c.name,entity:out.result.id,created,...(cmd.startsWith('quality.')?{quality:b}:{})});
  const digest=await hash(previousHash+'\n'+(r.revision+1)+'\n'+payload);
  const ledger=q('INSERT INTO audit_ledger(workspace,seq,previous,hash,payload,created) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)',c.workspace,r.revision+1,previousHash,digest,payload,created,c.workspace,r.revision);
  const revisionUpdate=()=>q('UPDATE workspaces SET state=?,revision=revision+1 WHERE id=? AND revision=?',JSON.stringify(out.state),c.workspace,r.revision);
  if(cmd==='sensor.ingest'&&!('duplicate' in out.result)){
   const reading=out.state.readings.find((v:any)=>v.id===out.result.id);
   reading.archived=true;
   let kept=0;
   out.state.readings=out.state.readings.filter((v:any)=>v.device!==b.device||!v.archived||++kept<=3);
   // Keep alarm-generating samples in the workspace audit. Routine samples have their own durable history.
   if(out.state.incidents.length===r.data.incidents.length)out.state.events.shift();
   const insert=q('INSERT INTO sensor_history(key,workspace,device,recorded,fingerprint,payload) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)',
    sensorKey,c.workspace,b.device,reading.recorded,fingerprint,JSON.stringify(reading),c.workspace,r.revision);
   const results=await db().batch([insert,ledger,revisionUpdate()]);
   if(results[2].meta.changes===1)return out.result;
  }else if((await db().batch([ledger,revisionUpdate()]))[1].meta.changes===1)return out.result;
 }
 throw new DomainError('Dữ liệu đang được cập nhật đồng thời. Vui lòng thử lại.',409)
}
