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
