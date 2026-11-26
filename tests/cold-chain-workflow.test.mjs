/* DX-TRACE | Durable simulated sensor alarm and Flowable response-loss recovery.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('sensor alarm commits quarantine before Flowable recovery and retry never duplicates sample or review',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'dx-cold-chain-'));
 process.env.DATA_DIR=dir;
 process.env.DX_FLOWABLE_URL='http://flowable:8080/flowable-rest/service';
 process.env.DX_FLOWABLE_API_PASSWORD='synthetic-cold-chain-test-'.repeat(3);
 const {identity}=await import('../selfhost/runtime.mjs');
 const {GET,POST}=await import('../app/api/[...path]/route.ts');
 const {q,hash}=await import('../lib/server.ts');
 const {decisionSnapshot}=await import('../lib/evidence-capture.mjs');
 const original=globalThis.fetch;
 t.after(async()=>{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});});
 const user={userId:'cold-chain-owner',email:'cold@example.test',displayName:'Cold chain owner'};
 const request=(path,body,headers={})=>identity.run(user,()=>{
  const req=new Request('http://localhost/api/'+path,{method:body?'POST':'GET',headers:{'idempotency-key':crypto.randomUUID(),...headers},body:body?JSON.stringify(body):undefined});
  return (body?POST:GET)(req);
 });
 async function call(path,body,status=200,headers={}){const res=await request(path,body,headers);assert.equal(res.status,status,await res.clone().text());return res.json();}
 await call('state');
 const workspace=(await q('SELECT workspace FROM members WHERE id=?',user.userId).first()).workspace;
 const tenant=await hash(workspace),definition='dxtrace_native_review_v1:1:cold-fixture';
 let offline=true,starts=0,history=null,loseStartResponse=true;
 globalThis.fetch=async(input,options={})=>{
  assert.equal(new URL(input).origin,'http://flowable:8080');
  if(offline)throw Error('Injected Flowable outage');
  const url=new URL(input),path=url.pathname.replace('/flowable-rest/service','');
  if(path==='/repository/process-definitions')return Response.json({data:[{id:definition,key:'dxtrace_native_review_v1',tenantId:tenant,version:1}]});
  if(path==='/repository/process-definitions/'+encodeURIComponent(definition))return Response.json({id:definition,key:'dxtrace_native_review_v1',tenantId:tenant,version:1,deploymentId:'cold-deploy'});
  if(path==='/runtime/process-instances'){
   starts++;const body=JSON.parse(options.body);
   history={id:'cold-process',businessKey:body.businessKey,tenantId:tenant,processDefinitionId:definition,startTime:new Date().toISOString(),endTime:null};
   if(loseStartResponse){loseStartResponse=false;throw Error('Flowable committed the process; response was lost');}
   return Response.json(history);
  }
  if(path==='/history/historic-process-instances')return Response.json({data:history?[history]:[]});
  if(path==='/runtime/tasks')return Response.json({data:[{id:'cold-task-quality',processInstanceId:'cold-process',taskDefinitionKey:'quality',name:'Quality review',assignee:null}]});
  throw Error('Unexpected fake engine route '+path);
 };
 const supplier=await call('partners',{name:'Synthetic supplier',kind:'supplier'});
 const destination=await call('partners',{name:'Synthetic destination',kind:'destination'});
 const lot=await call('lots',{code:'SYNTHETIC-COLD',product:'Milk',supplier:supplier.id,quantity:10,unit:'box',expiry:'2099-12-31',location:'A',min_temp:2,max_temp:8});
 const device=await call('devices',{lot:lot.id,name:'Simulated temperature sensor'});
 const headers={authorization:'Bearer '+device.token};
 const reading=index=>({id:'synthetic-'+index,temperature:12.4,recorded:new Date(Date.now()-3000+index*1000).toISOString(),synthetic:index===0});
 await call('ingest',reading(0),200,headers);await call('ingest',reading(1),200,headers);
 const sample=reading(2);
 const pending=await call('ingest',sample,202,headers);
 assert.equal(pending.workflowPending,true);assert.ok(pending.incident);
 let state=await call('state');
 assert.equal(state.lots.find(l=>l.id===lot.id).status,'quarantine');
 assert.equal(state.incidents.length,1);assert.equal(state.readings.length,3);
 assert.equal(state.incidents[0].review.trigger,'cold-chain');
 assert.equal(state.incidents[0].review.instance,null);
 assert.equal(state.readings.some(r=>r.synthetic===true),true);
 assert.equal(state.readings.some(r=>r.synthetic!==true),true,'fixture contains a mixed simulated and unmarked window');
 assert.equal(state.incidents[0].synthetic,true,'any simulated input makes the alarm synthetic');
 const alarmSnapshot=JSON.parse((await q("SELECT payload FROM evidence_decisions WHERE workspace=? AND kind='sensor.ingest'",workspace).first()).payload).snapshot;
 assert.equal(alarmSnapshot.decision.simulated,true,'newest unmarked sample cannot relabel a mixed-input proof as real');
 assert.equal((await q('SELECT COUNT(*) AS n FROM sensor_history WHERE workspace=?',workspace).first()).n,3);
 await call('shipments',{lot:lot.id,destination:destination.id,quantity:1},409);
 assert.equal(starts,0,'unreachable engine must not undo a committed alarm');
 offline=false;
 const lostResponse=await call('ingest',sample,202,headers);
 assert.equal(lostResponse.incident,pending.incident);assert.equal(starts,1);
 const recovered=await call('ingest',sample,200,headers);
 assert.equal(recovered.incident,pending.incident);assert.equal(recovered.workflow,'cold-process');
 assert.equal(recovered.workflowPending,false);assert.equal(starts,1,'history reconciliation must not restart the process');
 await call('ingest',sample,200,headers);
 assert.equal(starts,1);
 state=await call('state');
 assert.equal(state.incidents.length,1);assert.equal(state.readings.length,3);
 assert.equal(state.incidents[0].review.instance,'cold-process');
 assert.equal(state.lots.find(l=>l.id===lot.id).status,'quarantine');
 assert.equal((await q('SELECT COUNT(*) AS n FROM sensor_history WHERE workspace=?',workspace).first()).n,3);
 const events=(await q('SELECT payload FROM audit_ledger WHERE workspace=?',workspace).all()).results.map(row=>JSON.parse(row.payload));
 assert.equal(events.filter(e=>e.action==='sensor.ingest').length,3);
 assert.equal(events.filter(e=>e.action==='quality.bind').length,1);
 await call('ingest',{...sample,temperature:20},409,headers);
 // A later business decision keeps the input label even though its own HTTP
 // body contains no sensor fields. This is a capture regression, not a claim
 // that this fixture executed the human approvals in Flowable.
 const after=structuredClone(state);
 after.incidents[0].status='approved';after.incidents[0].review.outcome='accepted';after.lots[0].status='recall';
 const followOn=decisionSnapshot({context:{workspace,id:user.userId,email:user.email,role:'owner'},
  command:'quality.project',body:{id:pending.incident,instance:'cold-process',outcome:'accepted'},
  before:state,after,result:{id:pending.incident},seq:state.revision+1,created:new Date().toISOString()});
 assert.equal(followOn.decision.simulated,true,'follow-on decision retains the synthetic-input marker');
});
