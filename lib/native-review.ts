/* DX-TRACE | Native Flowable review API. SPDX-License-Identifier: MIT */
import {readFile} from 'node:fs/promises';
import {q,hash} from './server.ts';
import {withWorkspace} from './workspace-queue.mjs';
import {PlatformError} from './platform.mjs';
const fail=(s:number,m:string):never=>{throw new PlatformError(m,s)};
const definition='dxtrace_native_review_v1';
const roles:Record<string,string[]>={quality:['owner','manager'],inventory:['owner','manager','warehouse'],approval:['owner','manager']};
const base=()=>{const url=process.env.DX_FLOWABLE_URL;
 if(url!=='http://flowable:8080/flowable-rest/service'||(process.env.DX_FLOWABLE_API_PASSWORD||'').length<32)
  fail(503,'Native Flowable runtime is not configured');
 return url;};
async function call(path:string,init:RequestInit={}){
 const url=base(); let response:Response;
 try{response=await fetch(url+path,{...init,redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{authorization:'Basic '+Buffer.from('dxtrace-workflow:'+process.env.DX_FLOWABLE_API_PASSWORD).toString('base64'),...init.headers}});}
 catch{return fail(503,'Workflow engine unavailable; reconcile before retrying writes');}
 if(!response.ok)return fail(response.status===404?404:response.status===409?409:502,'Workflow engine rejected the operation');
 const text=await response.text();return text?JSON.parse(text):null;
}
const post=(path:string,value:any)=>call(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});
const query=(path:string,params:Record<string,string>)=>call(path+'?'+new URLSearchParams(params));
const actor=(c:any)=>hash(c.workspace+'\n'+c.id);
const tenant=(c:any)=>hash(c.workspace);
async function deployed(c:any){
 const tid=await tenant(c);
 const find=async()=>{const r=await query('/repository/process-definitions',{key:definition,tenantId:tid,latest:'true',size:'10'});
  return r.data.find((x:any)=>x.key===definition&&x.tenantId===tid);};
 let d=await find();if(d)return d.id;
 const form=new FormData();form.append('tenantId',tid);form.append('file',new Blob([await readFile(new URL('../selfhost/flowable/review.bpmn20.xml',import.meta.url),'utf8')]),'review.bpmn20.xml');
 await call('/repository/deployments',{method:'POST',body:form});
 d=await find();if(!d)return fail(503,'Workflow definition not found after deployment');return d.id;
}
async function lookup(c:any,businessKey:string){
 const tid=await tenant(c);
 const r=await query('/history/historic-process-instances',{businessKey,tenantId:tid,size:'10'});
 const matches=r.data.filter((x:any)=>x.businessKey===businessKey&&x.tenantId===tid);
 if(matches.length>1)fail(409,'Duplicate engine instances; manual reconciliation required');
 return matches[0];
}
async function visible(c:any,id:string){
 const row:any=await q('SELECT * FROM native_review_requests WHERE workspace=? AND instance_id=?',c.workspace,id).first();
 if(!row)fail(404,'Review not found');
 return row;
}
async function view(c:any,id:string){
 const row=await visible(c,id),history=await lookup(c,row.business_key);
 if(!history||history.id!==id)fail(503,'Workflow history not available');
 const tasks=history.endTime?[]:(await query('/runtime/tasks',{processInstanceId:id,size:'20'})).data;
 return {id,reference:row.reference,status:history.endTime?'ended':'running',endedAt:history.endTime||null,
  outcome:history.endActivityId||null,tasks:tasks.filter((t:any)=>roles[t.taskDefinitionKey]?.includes(c.role)).map((t:any)=>({id:t.id,step:t.taskDefinitionKey,name:t.name,assigned:!!t.assignee})),engine:'Flowable OSS'};
}
export async function nativeReview(c:any,req:Request,key:string,action:string,recall?:{incident:string,reporter:string}){
 if(!['owner','manager','warehouse'].includes(c.role))fail(403,'Review access denied');base();
 if(req.method==='GET'&&key&&!action)return view(c,key);
 if(req.method!=='POST')return fail(404,'Unknown review route');
 return withWorkspace(c.workspace,async()=>{
  const body=await req.json();
  if(key==='start'&&!action){
   const idem=req.headers.get('idempotency-key')||'';
   const reference=typeof body?.reference==='string'?body.reference.trim():'';
   if(!idem||idem.length>100||!reference||reference.length>120)fail(422,'Reference and idempotency key required');
   const who=await actor(recall?{...c,id:recall.reporter}:c);
   const businessKey=recall?await hash(JSON.stringify(['quality-recall',c.workspace,recall.incident])):await hash(c.workspace+'\n'+who+'\n'+idem);
   const fingerprint=await hash(reference);
   const row:any=await q('SELECT * FROM native_review_requests WHERE workspace=? AND business_key=?',c.workspace,businessKey).first();
   if(row){
    if(row.fingerprint!==fingerprint)fail(409,'Idempotency key reused with different input');
    if(row.instance_id)return view(c,row.instance_id);
    const old=await lookup(c,businessKey);
    if(!old)fail(409,'Start outcome uncertain; operator reconciliation required; do not resubmit');
    await q('UPDATE native_review_requests SET instance_id=? WHERE workspace=? AND business_key=?',old.id,c.workspace,businessKey).run();
    return view(c,old.id);
   }
   const processDefinitionId=await deployed(c);
   await q('INSERT INTO native_review_requests(workspace,business_key,fingerprint,creator,reference) VALUES(?,?,?,?,?)',c.workspace,businessKey,fingerprint,who,reference).run();
   const instance=await post('/runtime/process-instances',{processDefinitionId,businessKey,variables:[{name:'creator',value:who,type:'string'}]});
   if(typeof instance?.id!=='string')fail(503,'Uncertain start outcome');
   await q('UPDATE native_review_requests SET instance_id=? WHERE workspace=? AND business_key=?',instance.id,c.workspace,businessKey).run();
   return view(c,instance.id);
  }
  if(!key||action!=='complete')return fail(404,'Unknown review action');
  const row=await visible(c,key),who=await actor(c);
  if(row.creator===who)fail(403,'Creator cannot approve own review');
  if(typeof body?.taskId!=='string'||typeof body.approved!=='boolean'||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500)fail(422,'Task, boolean decision and reason required');
  const tasks=(await query('/runtime/tasks',{processInstanceId:key,size:'20'})).data;
  const task=tasks.find((t:any)=>t.id===body.taskId);
  if(!task)fail(409,'Task no longer active; refresh workflow history');
  if(!roles[task.taskDefinitionKey]?.includes(c.role))fail(403,'Role cannot perform this task');
  if(task.assignee&&task.assignee!==who)fail(409,'Task assigned to another reviewer');
  const path='/runtime/tasks/'+encodeURIComponent(task.id);
  if(!task.assignee)await post(path,{action:'claim',assignee:who});
  await post(path,{action:'complete',variables:[
    {name:task.taskDefinitionKey+'Approved',type:'boolean',value:body.approved},
    {name:task.taskDefinitionKey+'Reviewer',type:'string',value:who},
    {name:task.taskDefinitionKey+'Reason',type:'string',value:body.reason.trim()}
  ]});
  return view(c,key);
 });
}
