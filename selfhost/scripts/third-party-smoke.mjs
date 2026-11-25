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
