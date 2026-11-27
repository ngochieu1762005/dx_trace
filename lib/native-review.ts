/* DX-TRACE | Native Flowable review API. SPDX-License-Identifier: MIT */
import {readFile} from 'node:fs/promises';
import {q,hash} from './server.ts';
import {withWorkspace} from './workspace-queue.mjs';
import {PlatformError} from './platform.mjs';
const fail=(s:number,m:string):never=>{throw new PlatformError(m,s)};
const definition='dxtrace_native_review_v1';
const roles:Record<string,string[]>={quality:['owner','manager'],inventory:['owner','manager','warehouse'],approval:['owner','manager']};
export const nativeReviewPolicy={id:'dxtrace.native-review',version:2,creatorMayApprove:false,roles};
const base=()=>{const url=process.env.DX_FLOWABLE_URL;
 if(url!=='http://flowable:8080/flowable-rest/service'||(process.env.DX_FLOWABLE_API_PASSWORD||'').length<32)
  fail(503,'Native Flowable runtime is not configured');
 return url;};
async function call(path:string,init:RequestInit={},format='json'){
 const url=base(); let response:Response;
 try{response=await fetch(url+path,{...init,redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{authorization:'Basic '+Buffer.from('dxtrace-workflow:'+process.env.DX_FLOWABLE_API_PASSWORD).toString('base64'),...init.headers}});}
 catch{return fail(503,'Workflow engine unavailable; reconcile before retrying writes');}
 if(!response.ok)return fail(response.status===404?404:response.status===409?409:502,'Workflow engine rejected the operation');
 let text:string;
 try{text=await response.text();}
 catch{return fail(503,'Workflow response interrupted; reconcile before retrying writes');}
 if(text.length>2*1024*1024)fail(502,'Workflow engine response exceeds limit');
 if(format==='text'||!text)return format==='text'?text:null;
 try{return JSON.parse(text);}
 catch{return fail(502,'Workflow engine returned an invalid response; reconcile before retrying writes');}
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
async function definitionMetadata(c:any,id:string){
 const metadata=await call('/repository/process-definitions/'+encodeURIComponent(id));
 if(metadata.id!==id||metadata.tenantId!==await tenant(c)||metadata.key!==definition||!Number.isInteger(metadata.version))
  fail(409,'Workflow definition does not match the tenant review');
 return {id:metadata.id,key:metadata.key,version:metadata.version,deploymentId:metadata.deploymentId};
}
async function view(c:any,id:string){
 const row=await visible(c,id),history=await lookup(c,row.business_key);
 if(!history||history.id!==id)fail(503,'Workflow history not available');
 const who=await actor(c);
 const tasks=history.endTime?[]:(await query('/runtime/tasks',{processInstanceId:id,size:'20'})).data;
 return {id,reference:row.reference,status:history.endTime?'ended':'running',endedAt:history.endTime||null,
  outcome:history.endActivityId||null,definition:await definitionMetadata(c,history.processDefinitionId),
  decisions:await decisions(c,id),
  tasks:tasks.filter((t:any)=>roles[t.taskDefinitionKey]?.includes(c.role)).map((t:any)=>({id:t.id,step:t.taskDefinitionKey,name:t.name,assigned:!!t.assignee,canComplete:row.creator!==who&&(!t.assignee||t.assignee===who)})),engine:'Flowable OSS'};
}
async function decisions(c:any,id:string){
 const rows=(await q('SELECT * FROM native_review_actions WHERE workspace=? AND instance_id=? ORDER BY created,task_id',c.workspace,id).all()).results;
 return rows.map((r:any)=>({taskId:r.task_id,subject:r.subject,actor:r.actor,actorLabel:r.actor_label,role:r.role,
  step:r.step,approved:!!r.approved,reason:r.reason,status:r.status,recordedAt:r.created,completedAt:r.completed}));
}

// A timed-out completion can have committed in Flowable. Adopt it only when
// both task history and the exact submitted process variables agree with the
// durable, authorized intent. Never infer success from a missing runtime task.
async function reconcileCompletion(c:any,row:any){
 let task:any;
 try{task=await call('/history/historic-task-instances/'+encodeURIComponent(row.task_id));}
 catch(error:any){if(error.status===404)return false;throw error;}
 if(!task?.endTime)return false;
 if(task.processInstanceId!==row.instance_id||task.taskDefinitionKey!==row.step||task.assignee!==row.actor)
  fail(409,'Completed task does not match the recorded review intent');
 const history=await query('/history/historic-variable-instances',{processInstanceId:row.instance_id,size:'100'});
 if(history.total>history.data.length)fail(503,'Incomplete workflow variable history; operator reconciliation required');
 const expected:Record<string,any>={
  [row.step+'Approved']:!!row.approved,[row.step+'Reviewer']:row.actor,[row.step+'Reason']:row.reason
 };
 for(const [name,value] of Object.entries(expected)){
  const variables=history.data.filter((item:any)=>item.processInstanceId===row.instance_id&&!item.taskId&&item.variable?.name===name);
  if(variables.length!==1||variables[0].variable.value!==value)
   fail(409,'Workflow result does not match the recorded review intent');
 }
 await q("UPDATE native_review_actions SET status='completed',completed=? WHERE workspace=? AND task_id=? AND fingerprint=?",
  task.endTime,c.workspace,row.task_id,row.fingerprint).run();
 return true;
}

export async function nativeReviewEvidence(c:any,id:string){
 if(!['owner','manager','warehouse'].includes(c.role))fail(403,'Review access denied');
 const row=await visible(c,id),history=await lookup(c,row.business_key);
 if(!history||history.id!==id)fail(503,'Workflow history not available');
 const path='/repository/process-definitions/'+encodeURIComponent(history.processDefinitionId);
 const metadata=await definitionMetadata(c,history.processDefinitionId);
 const bpmn=await call(path+'/resourcedata',{},'text');
 const taskHistory=await query('/history/historic-task-instances',{processInstanceId:id,size:'100'});
 const variableHistory=await query('/history/historic-variable-instances',{processInstanceId:id,size:'100'});
 if(taskHistory.total>taskHistory.data.length||variableHistory.total>variableHistory.data.length)
  fail(503,'Incomplete workflow history; evidence cannot be captured');
 const taskRows=taskHistory.data.filter((t:any)=>t.processInstanceId===id);
 const variableRows=variableHistory.data.filter((v:any)=>v.processInstanceId===id);
 const intents=(await q('SELECT * FROM native_review_actions WHERE workspace=? AND instance_id=?',c.workspace,id).all()).results;
 for(const intent of intents){
  if(taskRows.some((t:any)=>t.id===intent.task_id&&t.endTime)){
   if(!await reconcileCompletion(c,intent))fail(503,'Completed review history is not yet consistent');
  }else if(history.endTime){
   fail(409,'Workflow ended without confirming the recorded task decision');
  }
 }
 return {engine:'Flowable OSS',instanceId:id,businessKey:row.business_key,creator:row.creator,
  definition:{id:metadata.id,key:metadata.key,version:metadata.version,deploymentId:metadata.deploymentId},
  bpmn,history:{id:history.id,startTime:history.startTime,endTime:history.endTime||null,endActivityId:history.endActivityId||null},
  tasks:taskRows.map((t:any)=>({id:t.id,step:t.taskDefinitionKey,assignee:t.assignee,startTime:t.startTime,endTime:t.endTime||null})),
  variables:variableRows.map((v:any)=>({name:v.variable?.name,value:v.variable?.value,taskId:v.taskId||null})),
  decisions:await decisions(c,id),policy:nativeReviewPolicy};
}
export async function nativeReview(c:any,req:Request,key:string,action:string,recall?:{incident:string,reporter:string},appReference?:string){
 if(!['owner','manager','warehouse'].includes(c.role))fail(403,'Review access denied');base();
 if(key && key!=='start'){
  const binding=await visible(c,key);
  if(binding.reference.startsWith('appkit/') && binding.reference!==appReference)fail(404,'Review not found');
 }
 if(req.method==='GET'&&key&&!action)return view(c,key);
 if(req.method!=='POST')return fail(404,'Unknown review route');
 return withWorkspace(c.workspace,async()=>{
  const body=await req.json();
  if(key==='start'&&!action){
   const idem=req.headers.get('idempotency-key')||'';
   const reference=typeof body?.reference==='string'?body.reference.trim():'';
   if(!idem||idem.length>100||!reference||reference.length>120)fail(422,'Reference and idempotency key required');
   if(reference.startsWith('appkit/')&&reference!==appReference)fail(403,'Use the record handover endpoint');
   const who=await actor(recall?{...c,id:recall.reporter}:c);
   const businessKey=appReference?await hash(JSON.stringify([c.workspace,appReference])):recall?await hash(JSON.stringify(['quality-recall',c.workspace,recall.incident])):await hash(c.workspace+'\n'+who+'\n'+idem);
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
   const inserted=await q('INSERT OR IGNORE INTO native_review_requests(workspace,business_key,fingerprint,creator,reference) VALUES(?,?,?,?,?)',c.workspace,businessKey,fingerprint,who,reference).run();
   if(!inserted.meta.changes)fail(409,'Start already reserved; retry the same request to reconcile');
   const instance=await post('/runtime/process-instances',{processDefinitionId,businessKey,variables:[{name:'creator',value:who,type:'string'}]});
   if(typeof instance?.id!=='string')fail(503,'Uncertain start outcome');
   await q('UPDATE native_review_requests SET instance_id=? WHERE workspace=? AND business_key=?',instance.id,c.workspace,businessKey).run();
   return view(c,instance.id);
  }
  if(!key||action!=='complete')return fail(404,'Unknown review action');
  const row=await visible(c,key),who=await actor(c);
  if(row.creator===who)fail(403,'Creator cannot approve own review');
  if(typeof body?.taskId!=='string'||typeof body.approved!=='boolean'||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>500)fail(422,'Task, boolean decision and reason required');
  const reason=body.reason.trim(),fingerprint=await hash(JSON.stringify([key,body.taskId,who,body.approved,reason]));
  let intent:any=await q('SELECT * FROM native_review_actions WHERE workspace=? AND task_id=?',c.workspace,body.taskId).first();
  if(intent){
   if(intent.actor!==who||intent.instance_id!==key||intent.fingerprint!==fingerprint)
    fail(409,'Task has a different recorded decision; refresh workflow history');
   if(!roles[intent.step]?.includes(c.role))fail(403,'Role cannot perform this task');
   if(intent.status==='completed')return view(c,key);
  }
  const tasks=(await query('/runtime/tasks',{processInstanceId:key,size:'20'})).data;
  const task=tasks.find((t:any)=>t.id===body.taskId);
  if(!task){
   if(intent&&await reconcileCompletion(c,intent))return view(c,key);
   fail(409,'Task no longer active; refresh workflow history');
  }
  if(task.processInstanceId!==key)fail(409,'Task belongs to a different review');
  if(!roles[task.taskDefinitionKey]?.includes(c.role))fail(403,'Role cannot perform this task');
  if(task.assignee&&task.assignee!==who)fail(409,'Task assigned to another reviewer');
  if(!intent){
   const created=new Date().toISOString();
   const inserted=await q(`INSERT OR IGNORE INTO native_review_actions
    (workspace,task_id,instance_id,actor,subject,actor_label,role,fingerprint,step,approved,reason,created)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,c.workspace,task.id,key,who,c.id,c.email||c.name||c.id,c.role,
    fingerprint,task.taskDefinitionKey,body.approved?1:0,reason,created).run();
   if(!inserted.meta.changes)fail(409,'Task decision already reserved; retry the same request to reconcile');
   intent=await q('SELECT * FROM native_review_actions WHERE workspace=? AND task_id=?',c.workspace,task.id).first();
  }
  const path='/runtime/tasks/'+encodeURIComponent(task.id);
  try{
   if(!task.assignee)await post(path,{action:'claim',assignee:who});
   await post(path,{action:'complete',variables:[
     {name:task.taskDefinitionKey+'Approved',type:'boolean',value:body.approved},
     {name:task.taskDefinitionKey+'Reviewer',type:'string',value:who},
     {name:task.taskDefinitionKey+'Reason',type:'string',value:reason}
   ]});
  }catch(error){
   if(await reconcileCompletion(c,intent))return view(c,key);
   throw error;
  }
  // Persist what the engine acknowledged. Lost responses are handled above;
  // refreshes will return the same decision without submitting another write.
  await q("UPDATE native_review_actions SET status='completed',completed=? WHERE workspace=? AND task_id=? AND fingerprint=?",
   new Date().toISOString(),c.workspace,task.id,fingerprint).run();
  return view(c,key);
 });
}
