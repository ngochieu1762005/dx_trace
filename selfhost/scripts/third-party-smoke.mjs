/* SPDX-License-Identifier: MIT
 * Disposable-stack acceptance; never run against production business records.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const gateway='http://gateway-api:8082';
const flow='http://flowable:8080/flowable-rest/service';
const appKey=process.env.DX_GATEWAY_APP_TOKEN;
const coreKey=process.env.DX_CORE_TOKEN;
const password=process.env.DX_FLOWABLE_API_PASSWORD;
assert.ok(appKey?.length>=32 && coreKey?.length>=32 && appKey!==coreKey && password?.length>=32);
const auth='Basic '+Buffer.from('dxtrace-workflow:'+password).toString('base64');
const poll=async(fn,description,attempts=120)=>{
  for(let i=0;i<attempts;i++){
    try{const result=await fn();if(result)return result;}catch{}
    await sleep(2000);
  }
  throw Error('Timeout: '+description);
};
const fetchSafe=(url,init={})=>fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(10000)});
const request=(path,init={})=>fetchSafe(flow+path,{...init,headers:{authorization:auth,...init.headers}});
const json=async(path,init={})=>{
  const res=await request(path,init);
  assert.ok(res.ok,'Flowable status '+res.status+' on '+path);
  return res.json();
};
const headers={'x-dx-core-token':appKey};
await poll(async()=>{const res=await fetchSafe(gateway+'/api/health',{headers});return res.ok;},'APISIX to Core');
for(const value of [undefined,'invalid',coreKey]){
  const res=await fetchSafe(gateway+'/api/health',{headers:value?{'x-dx-core-token':value}:{}});
  assert.ok([401,403,404].includes(res.status),'invalid credentials must not reach Core');
}
assert.equal((await fetchSafe(gateway+'/not-an-api',{headers})).status,404);
assert.ok([404,405].includes((await fetchSafe(gateway+'/api/health',{method:'DELETE',headers})).status));
const health=await fetchSafe(gateway+'/api/health',{headers});
assert.equal(health.status,200);
assert.equal(health.headers.get('cache-control'),'no-store');
await assert.rejects(()=>fetchSafe('http://core:8081/api/health',{headers}));
console.log('PASS APISIX routing, service credentials and Core network isolation');
await poll(async()=>{const res=await request('/repository/deployments?size=1');return res.ok;},'Flowable database and API');
const denied=await fetchSafe(flow+'/repository/deployments?size=1');
assert.equal(denied.status,401);
const tenant='acceptance-'+randomUUID();
const form=new FormData();
form.append('file',new Blob([await readFile('/checks/acceptance.bpmn20.xml')]),'acceptance.bpmn20.xml');
form.append('tenantId',tenant);
const deploy=await json('/repository/deployments',{method:'POST',body:form});
try{
  const instances=await json('/repository/process-definitions?deploymentId='+encodeURIComponent(deploy.id));
  assert.equal(instances.data.length,1);
  const instance=await json('/runtime/process-instances',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({processDefinitionId:instances.data[0].id,businessKey:tenant})
  });
  const tasks=()=>json('/runtime/tasks?processInstanceId='+encodeURIComponent(instance.id));
  const first=await tasks();
  assert.equal(first.data.length,2);
  assert.deepEqual(first.data.map(t=>t.taskDefinitionKey).sort(),['inventory','quality']);
  const complete=async(id)=>{
    const res=await request('/runtime/tasks/'+encodeURIComponent(id),{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'complete'})
    });
    assert.ok(res.ok,'task completion failed: '+res.status);
  };
  await complete(first.data[0].id);
  const second=await tasks();
  assert.equal(second.data.length,1,'parallel join must wait');
  await complete(second.data[0].id);
  await poll(async()=>{
    const history=await json('/history/historic-process-instances/'+encodeURIComponent(instance.id));
    return !!history.endTime;
  },'Flowable timer and process completion',40);
  console.log('PASS real Flowable BPMN deployment, parallel tasks, timer and history');
}finally{
  const res=await request('/repository/deployments/'+encodeURIComponent(deploy.id)+'?cascade=true',{method:'DELETE'});
  assert.ok(res.ok,'acceptance deployment cleanup failed');
}


// All business calls below cross the actual APISIX gateway, using synthetic
// identities ONLY inside this disposable trusted test network.
const stamp=randomUUID(),owner='owner-'+stamp,manager='manager-'+stamp,staff='staff-'+stamp,outsider='outsider-'+stamp;
async function api(path,who=owner,body,key=randomUUID(),expected=200){
 const response=await fetchSafe(gateway+'/api/'+path,{method:body===undefined?'GET':'POST',
 headers:{...headers,'x-forwarded-user':who,'x-forwarded-email':who+'@example.invalid','idempotency-key':key,'content-type':'application/json'},
 body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal(response.status,expected,path+' returned '+response.status);
 return response.json();
}
await api('state');
await api('members',owner,{email:manager+'@example.invalid',role:'manager'});
await api('members',owner,{email:staff+'@example.invalid',role:'warehouse'});
await api('state',manager);await api('state',staff);
const app=JSON.parse(await readFile('/checks/supplier-review.json','utf8'));
const plan=await api('apps/plan',owner,{manifest:app});
assert.equal(plan.baseVersion,0);
await api('apps/install',owner,{manifest:app,baseVersion:plan.baseVersion});
assert.ok((await api('apps')).applications.some(a=>a.id===app.metadata.id));
assert.equal((await api('apps',outsider)).applications.length,0);
const rec=await api('models/supplier_review/records',staff,{data:{supplier:'Fixture supplier',reference:'TEST-1',risk:'Thấp'}});
assert.ok(rec.id);
assert.equal((await api('models/supplier_review/records',manager)).records.length,1);
await api('models/supplier_review/records',outsider,undefined,randomUUID(),404);
console.log('PASS independent supplier application installation, record creation and tenant isolation through APISIX');
const idem=randomUUID(),body={reference:'TEST-REVIEW'};
const started=await api('flowable-review/start',owner,body,idem);
assert.ok(started.id);assert.deepEqual(started.tasks.map(t=>t.step).sort(),['inventory','quality']);
assert.equal((await api('flowable-review/start',owner,body,idem)).id,started.id);
await api('flowable-review/start',owner,{reference:'different'},idem,409);
const path='flowable-review/'+encodeURIComponent(started.id),quality=started.tasks.find(t=>t.step==='quality'),inventory=started.tasks.find(t=>t.step==='inventory');
const decision=t=>({taskId:t.id,approved:true,reason:'Acceptance fixture'});
await api(path,outsider,undefined,randomUUID(),404);
await api(path+'/complete',owner,decision(quality),randomUUID(),403);
await api(path+'/complete',staff,decision(quality),randomUUID(),403);
await api(path+'/complete',staff,decision(inventory));
assert.equal((await api(path,manager)).tasks.length,1);
await api(path+'/complete',manager,decision(quality));
const final=await poll(async()=>{const v=await api(path,manager);return v.tasks.find(t=>t.step==='approval');},'native review timer',40);
const ended=await api(path+'/complete',manager,decision(final));
assert.equal(ended.status,'ended');
assert.equal(ended.tasks.length,0);
await api(path+'/complete',manager,decision(final),randomUUID(),409);
console.log('PASS native Flowable API: idempotent start, tenant denial, roles, no self-approval, parallel join, timer, final approval');


// IT/OT: a synthetic device has its own key, not an SSO or Core credential.
// Create a lot, transmit three real HTTP samples, verify lineage and incident.
const supplier=await api('partners',owner,{name:'Fixture supplier',kind:'supplier'});
const lot=await api('lots',owner,{code:'TEST-COLD-'+stamp,product:'Acceptance only',supplier:supplier.id,quantity:100,unit:'kg',expiry:new Date(Date.now()+86400000*30).toISOString().slice(0,10),location:'Fixture warehouse',min_temp:2,max_temp:8});
const device=await api('devices',owner,{name:'Synthetic test sensor',lot:lot.id});
const send=async(body,token=device.token,status=200)=>{
 const result=await fetchSafe(gateway+'/api/ingest',{method:'POST',headers:{...headers,'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});
 assert.equal(result.status,status,'sensor ingest status');
 return result.json();
};
const reading={id:'sample-'+randomUUID(),temperature:12,recorded:new Date().toISOString()};
await send(reading,'invalid',401);
const initial=await send(reading);
assert.equal((await send(reading)).id,initial.id);
await send({...reading,temperature:13},device.token,409);
for(let i=0;i<2;i++)await send({id:'sample-'+randomUUID(),temperature:12,recorded:new Date().toISOString()});
const history=await api('sensor-history/'+device.id);
assert.equal(history.readings.length,3);
const lineagePath='sensor-lineage/'+device.id+'?reading='+encodeURIComponent(reading.id);
const lineage=await api(lineagePath);
assert.equal(lineage.lot,lot.id);assert.equal(lineage.reading.id,initial.id);
await api(lineagePath,staff,undefined,randomUUID(),403);
await api(lineagePath,outsider,undefined,randomUUID(),404);
assert.ok((await api('state')).incidents.some(i=>i.lot===lot.id));
await api('devices/'+device.id+'/revoke',owner,{});
await send({...reading,id:randomUUID()},device.token,401);
console.log('PASS IT/OT: per-device key, replay/conflict, telemetry history, lineage, threshold incident, revocation');

// A quality failure is one business case across APISIX, policy, Flowable and storage.
const recallLot=await api('lots',owner,{code:'FAIL-'+stamp,product:'Test pump seal',supplier:supplier.id,quantity:5,unit:'pcs',expiry:'2099-01-01',location:'Fixture',min_temp:2,max_temp:8});
const destination=await api('partners',owner,{name:'Fixture recipient',kind:'destination'});
const report={lot:recallLot.id,reason:'Inspection failed',severity:'high'}, reportKey=randomUUID();
const reported=await api('quality-recalls/start',staff,report,reportKey);
const recallPath='quality-recalls/'+reported.incident;
assert.equal((await api('quality-recalls/start',staff,report,reportKey)).workflow.id,reported.workflow.id);
assert.equal((await api('state')).lots.find(l=>l.id===recallLot.id).status,'quarantine');
await api('shipments',owner,{lot:recallLot.id,destination:destination.id,quantity:1},randomUUID(),409);
await api('incidents/'+reported.incident+'/approve',manager,{},randomUUID(),409);
await api(recallPath,outsider,undefined,randomUUID(),404);
const work=(await api(recallPath,manager)).workflow.tasks;
assert.deepEqual(work.map(t=>t.step).sort(),['inventory','quality']);
await api(recallPath+'/complete',staff,decision(work.find(t=>t.step==='inventory')),randomUUID(),403);
for(const task of work) await api(recallPath+'/complete',manager,decision(task));
const approval=await poll(async()=>(await api(recallPath,manager)).workflow.tasks.find(t=>t.step==='approval'),'recall approval after timer',40);
const accepted=await api(recallPath+'/complete',manager,decision(approval));
assert.equal(accepted.workflow.outcome,'accepted');
await api(recallPath+'/sync',manager,{});
assert.equal((await api('state')).lots.find(l=>l.id===recallLot.id).status,'recall');
const proof=await api('audit-ledger/export');
assert.ok(JSON.stringify(proof).includes(reported.workflow.id));
assert.equal((await api('audit-ledger/verify')).valid,true);
console.log('PASS failed inspection, quarantine, shipping block, manager decision, idempotent projection and audit');

const packageRoot='/checks/maintenance/';
const manifest={apiVersion:'dxtrace.io/v1',kind:'Application',metadata:{name:'maintenance',version:'1.0.0'},
  spec:{schemas:['schemas/asset.json','schemas/maintenance.json'],workflows:['workflows/maintenance.bpmn'],
    permissions:['asset:read','asset:create','maintenance:read','maintenance:create','maintenance:approve'],
    routes:[{path:'/maintenance',service:'maintenance-portal'}],audit:{enabled:true}}};
const files={};
for(const path of [...manifest.spec.schemas,...manifest.spec.workflows])files[path]=await readFile(packageRoot+path,'utf8');
const pack={manifest,files};
await api('packages/maintenance/install',owner,{revision:0,package:pack});
const registered=await api('portals/maintenance',staff);
assert.equal(registered.route.path,'/maintenance');
const page=await fetchSafe(gateway+'/appkit-ui/'+registered.route.service,{headers});
assert.equal(page.status,200);assert.match(await page.text(),/portal.mjs/);
await api('portals/maintenance',outsider,undefined,randomUUID(),404);
const webPage='/maintenance';
const appWeb=(identity)=>fetchSafe('http://app:8080'+webPage,{headers:identity?{'x-forwarded-user':identity,'x-forwarded-email':identity+'@example.invalid'}:{}});
assert.equal((await appWeb()).status,401);
assert.equal((await appWeb(outsider)).status,404);
const installedPage=await appWeb(staff);
assert.equal(installedPage.status,200);assert.match(await installedPage.text(),/portal.mjs/);
await api('packages/maintenance/uninstall',owner,{revision:1});
assert.equal((await appWeb(staff)).status,404);
await api('portals/maintenance',owner,undefined,randomUUID(),404);
console.log('PASS registered maintenance route resolves an independent portal through APISIX');


const qualityApp=JSON.parse(await readFile('/checks/quality.json','utf8'));
await api('apps/install',owner,{manifest:qualityApp,baseVersion:0});
const qcCode='QC-'+stamp;
const qcLot=await api('lots',owner,{code:qcCode,product:'Inspection fixture',supplier:supplier.id,quantity:1,unit:'pcs',expiry:'2099-01-01',location:'QC',min_temp:2,max_temp:8});
const inspection=await api('models/quality/records',staff,{data:{lot:qcCode,finding:'Seal failed'}});
await api('models/quality/transition',staff,{id:inspection.id,version:1,target:'submitted'});
await api('models/quality/transition',manager,{id:inspection.id,version:2,target:'rejected',reason:'Inspection failed'});
const escalation=await api('quality/'+inspection.id+'/escalate',manager,{version:3,lot:qcLot.id,reason:'Damaged seal',severity:'high'});
assert.equal(escalation.flowable,true);
const reviewPath='quality-recalls/'+escalation.incident;
const qcWorkflow=(await api(reviewPath,owner)).workflow;
assert.ok(qcWorkflow.id);
const qcDecision=task=>({taskId:task.id,approved:task.step!=='quality',reason:'Retain quarantine and investigate'});
for(const task of qcWorkflow.tasks)await api(reviewPath+'/complete',owner,qcDecision(task));
const rejected=await api(reviewPath,owner);
assert.equal(rejected.outcome,'rejected');
const held=(await api('state')).lots.find(l=>l.id===qcLot.id);
assert.equal(held.status,'quarantine');
console.log('PASS Quality Portal inspection escalation, Flowable rejection and retained quarantine');
