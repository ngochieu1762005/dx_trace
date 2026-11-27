/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Native review fault injection (fake Flowable transport, real SQLite).
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('Flowable recovery preserves intents, reconciles response loss and fences competing decisions',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'dx-native-recovery-'));
 process.env.DATA_DIR=dir;
 process.env.DX_FLOWABLE_URL='http://flowable:8080/flowable-rest/service';
 process.env.DX_FLOWABLE_API_PASSWORD='synthetic-transport-test-'.repeat(3);
 const {nativeReview,nativeReviewEvidence}=await import('../lib/native-review.ts');
 const {q,hash}=await import('../lib/server.ts');
 const originalFetch=globalThis.fetch;
 t.after(async()=>{globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true});});
 const c={workspace:'native-test',id:'creator',email:'creator@example.test',role:'owner'};
 const reviewer={...c,id:'reviewer',email:'reviewer@example.test',role:'manager'};
 const other={...reviewer,id:'second',email:'second@example.test'};
 const tenant=await hash(c.workspace),definition='dxtrace_native_review_v1:7:test';
 const bpmn=await readFile(new URL('../selfhost/flowable/review.bpmn20.xml',import.meta.url),'utf8');
 const instances=new Map(),tasks=new Map(),historicTasks=new Map(),variables=new Map();
 let starts=0,completes=0,loseStart=false,loseStartBody=false,loseComplete=false,offline=false,noStartCommit=false;
 const response=value=>Response.json(value);
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input);
  assert.equal(url.origin,'http://flowable:8080');
  assert.equal(options.redirect,'error');
  if(offline)throw Error('Injected connection loss');
  const path=url.pathname.replace('/flowable-rest/service','');
  const body=options.body&&typeof options.body==='string'?JSON.parse(options.body):null;
  if(path==='/repository/process-definitions')return response({data:[{id:definition,key:'dxtrace_native_review_v1',tenantId:tenant,version:7}]});
  if(path==='/repository/process-definitions/'+encodeURIComponent(definition))return response({id:definition,key:'dxtrace_native_review_v1',tenantId:tenant,version:7,deploymentId:'deploy-7'});
  if(path==='/repository/process-definitions/'+encodeURIComponent(definition)+'/resourcedata')return new Response(bpmn);
  if(path==='/runtime/process-instances'){
   starts++;
   if(noStartCommit)throw Error('Disconnected before engine commit');
   const id='process-'+starts;
   const instance={id,businessKey:body.businessKey,tenantId:tenant,processDefinitionId:definition,startTime:'2026-11-26T00:00:00Z',endTime:null};
   instances.set(id,instance);
   for(const step of ['quality','inventory'])tasks.set(id+'-'+step,{id:id+'-'+step,processInstanceId:id,taskDefinitionKey:step,name:step,assignee:null});
   variables.set(id,new Map());
   if(loseStart){loseStart=false;throw Error('Engine committed; response lost');}
   if(loseStartBody){
    loseStartBody=false;
    return new Response(new ReadableStream({start(controller){controller.error(Error('Connection dropped after response headers'));}}),{status:201});
   }
   return response(instance);
  }
  if(path==='/history/historic-process-instances')return response({data:[...instances.values()].filter(i=>i.businessKey===url.searchParams.get('businessKey')&&i.tenantId===url.searchParams.get('tenantId'))});
  if(path==='/runtime/tasks')return response({data:[...tasks.values()].filter(x=>x.processInstanceId===url.searchParams.get('processInstanceId'))});
  if(path.startsWith('/runtime/tasks/')){
   const id=decodeURIComponent(path.slice('/runtime/tasks/'.length)),task=tasks.get(id);
   if(!task)return responseError(404);
   if(body.action==='claim'){
    if(task.assignee&&task.assignee!==body.assignee)return responseError(409);
    task.assignee=body.assignee;return new Response(null,{status:204});
   }
   if(body.action==='complete'){
    completes++;tasks.delete(id);
    historicTasks.set(id,{...task,endTime:'2026-11-26T00:00:01Z'});
    for(const variable of body.variables)variables.get(task.processInstanceId).set(variable.name,variable.value);
    if(loseComplete){loseComplete=false;throw Error('Task committed; response lost');}
    return new Response(null,{status:204});
   }
  }
  if(path==='/history/historic-task-instances'){
   const data=[...historicTasks.values()].filter(x=>x.processInstanceId===url.searchParams.get('processInstanceId'));
   return response({data,total:data.length});
  }
  if(path.startsWith('/history/historic-task-instances/')){
   const task=historicTasks.get(decodeURIComponent(path.split('/').at(-1)));
   return task?response(task):responseError(404);
  }
  if(path==='/history/historic-variable-instances'){
   const id=url.searchParams.get('processInstanceId');
   const data=[...(variables.get(id)||[])].map(([name,value])=>({processInstanceId:id,taskId:null,variable:{name,value}}));
   return response({data,total:data.length});
  }
  throw Error('Unexpected fake engine request '+path);
 };
 function responseError(status){return Response.json({error:'injected'},{status});}
 function invoke(who,key,action,body,idem='same-start'){
  const req=new Request('http://localhost/api/flowable-review/'+key+(action?'/'+action:''),{
   method:body?'POST':'GET',headers:{'idempotency-key':idem},body:body?JSON.stringify(body):undefined
  });
  return nativeReview(who,req,key,action);
 }

 loseStart=true;
 await assert.rejects(()=>invoke(c,'start','',{reference:'RC-2026-001'}),{status:503});
 assert.equal(starts,1);
 const adopted=await invoke(c,'start','',{reference:'RC-2026-001'});
 assert.equal(adopted.id,'process-1');assert.equal(starts,1,'lost start response must not create a second instance');
 assert.equal(adopted.definition.version,7);
 await assert.rejects(()=>invoke(c,'start','',{reference:'changed'}),{status:409});
 await assert.rejects(()=>invoke({...reviewer,workspace:'other-tenant'},adopted.id,''),{status:404});
 const decision={taskId:'process-1-quality',approved:true,reason:'Independent inspection passed'};
 await assert.rejects(()=>invoke(c,adopted.id,'complete',decision),{status:403});
 await assert.rejects(()=>invoke({...reviewer,role:'warehouse'},adopted.id,'complete',decision),{status:403});

 loseComplete=true;
 const recovered=await invoke(reviewer,adopted.id,'complete',decision);
 assert.equal(completes,1);
 assert.equal(recovered.decisions[0].status,'completed');
 assert.equal(recovered.decisions[0].subject,'reviewer');
 assert.equal(recovered.decisions[0].role,'manager');
 assert.equal(recovered.decisions[0].completedAt,'2026-11-26T00:00:01Z');
 await invoke(reviewer,adopted.id,'complete',decision);
 assert.equal(completes,1,'replaying an acknowledged task must not submit a second completion');
 await assert.rejects(()=>invoke(reviewer,adopted.id,'complete',{...decision,approved:false}),{status:409});
 await assert.rejects(()=>invoke(other,adopted.id,'complete',decision),{status:409});
 const simultaneous=await Promise.allSettled([reviewer,other].map(who=>invoke(who,adopted.id,'complete',{
  taskId:'process-1-inventory',approved:true,reason:'Inventory counted'
 })));
 assert.equal(simultaneous.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(simultaneous.find(x=>x.status==='rejected').reason.status,409);
 assert.equal(completes,2);

 const evidence=await nativeReviewEvidence(reviewer,adopted.id);
 assert.equal(evidence.definition.version,7);
 assert.equal(evidence.bpmn,bpmn,'capture deployed resource bytes rather than guessing local template version');
 assert.equal(evidence.decisions.length,2);
 assert.equal(evidence.variables.find(x=>x.name==='qualityApproved').value,true);
 await assert.rejects(()=>nativeReviewEvidence({...reviewer,workspace:'outsider'},adopted.id),{status:404});

 loseStartBody=true;
 await assert.rejects(()=>invoke(c,'start','',{reference:'body-loss'},'body-loss-start'),{status:503});
 const bodyLossStarts=starts;
 assert.equal((await invoke(c,'start','',{reference:'body-loss'},'body-loss-start')).id,'process-'+bodyLossStarts);
 assert.equal(starts,bodyLossStarts,'loss after headers must also reconcile without a second start');

 // Engine unreachable before a start commit is indistinguishable from a late
 // commit. Preserve the intent and require reconciliation, never restart blind.
 noStartCommit=true;
 await assert.rejects(()=>invoke(c,'start','',{reference:'uncertain'},'uncertain-start'),{status:503});
 const before=starts;
 noStartCommit=false;
 await assert.rejects(()=>invoke(c,'start','',{reference:'uncertain'},'uncertain-start'),{status:409});
 assert.equal(starts,before);
 offline=true;
 await assert.rejects(()=>invoke(reviewer,adopted.id,''),{status:503});
 offline=false;
 assert.equal((await invoke(reviewer,adopted.id,'')).id,adopted.id);

 // A forged or externally changed engine result cannot satisfy a durable intent.
 const row=await q('SELECT * FROM native_review_actions WHERE workspace=? AND task_id=?',c.workspace,decision.taskId).first();
 await q("UPDATE native_review_actions SET status='pending',completed=NULL WHERE workspace=? AND task_id=?",c.workspace,decision.taskId).run();
 variables.get(adopted.id).set('qualityApproved',false);
 await assert.rejects(()=>invoke(reviewer,adopted.id,'complete',decision),{status:409});
 assert.equal((await q('SELECT status FROM native_review_actions WHERE workspace=? AND task_id=?',c.workspace,row.task_id).first()).status,'pending');
});
