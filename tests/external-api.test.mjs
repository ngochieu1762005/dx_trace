/* DX-TRACE | External OIDC resource gateway regression tests.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {once} from 'node:events';
import {externalConfig,createExternalApi} from '../selfhost/external-api.mjs';

const INTERNAL='x'.repeat(64);
const ENV={DX_GATEWAY_APP_TOKEN:INTERNAL,DX_EXTERNAL_ISSUER:'https://id.example.test/realms/warehouse',
 DX_EXTERNAL_AUDIENCE:'dx-trace-external-api',DX_EXTERNAL_CLIENTS_FILE:'/tmp/policy.json'};
const POLICY=JSON.stringify({version:1,clients:[{clientId:'licensed-integrator',models:['maintenance'],requestsPerMinute:2}]});
const makeConfig=(overrides={},policy=POLICY)=>externalConfig({...ENV,...overrides},()=>policy);
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const JWK={...publicKey.export({format:'jwk'}),kid:'test-key',alg:'RS256',use:'sig'};
const start=async srv=>{srv.listen(0,'127.0.0.1');await once(srv,'listening');return 'http://127.0.0.1:'+srv.address().port;};
const close=async srv=>{srv.closeAllConnections();await new Promise((done,reject)=>srv.close(e=>e?reject(e):done()));};
const now=1_800_000_000_000;
const jwt=(override={},key=privateKey)=>{
 const h=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'test-key'})).toString('base64url');
 const p=Buffer.from(JSON.stringify({iss:ENV.DX_EXTERNAL_ISSUER,aud:ENV.DX_EXTERNAL_AUDIENCE,azp:'licensed-integrator',
  sub:'oidc-real-subject',email:'staff@example.test',email_verified:true,
  scope:'openid dxtrace.records.read',iat:Math.floor(now/1000)-30,
  exp:Math.floor(now/1000)+300,...override})).toString('base64url');
 const signature=sign('RSA-SHA256',Buffer.from(h+'.'+p),key).toString('base64url');
 return h+'.'+p+'.'+signature;
};
const fakeFetch=(calls)=>async(url,opts)=>{
 const target=String(url);
 if(target.includes('/certs'))return Response.json({keys:[JWK]});
 calls.push({target,opts});
 return new Response(JSON.stringify({ok:true,via:'gateway'}),{
  status:200,headers:{'content-type':'application/json','set-cookie':'NEVER_EXPOSE=1'}
 });
};
test('external API policy rejects insecure deployment and missing allowlists',()=>{
 assert.throws(()=>makeConfig({DX_GATEWAY_APP_TOKEN:'short'}),/strong internal/);
 assert.throws(()=>makeConfig({DX_EXTERNAL_ISSUER:'http://bad.example/realms/warehouse'}),/HTTPS/);
 assert.throws(()=>makeConfig({DX_EXTERNAL_GATEWAY_URL:'http://public.example:8082'}),/private gateway/);
 assert.throws(()=>makeConfig({},'{"version":1,"clients":[]}'),/1–100 clients/);
 assert.throws(()=>makeConfig({},'{"version":1,"clients":[{"clientId":"a","models":["x"],"requestsPerMinute":1001}]}'),/invalid or duplicate/);
 assert.equal(makeConfig().clients.get('licensed-integrator').models.has('maintenance'),true);
});
test('Keycloak RS256 signature, audience, scope and model ACL guard external read-only endpoints',async()=>{
 const calls=[],audits=[],config=makeConfig();
 const srv=createExternalApi(config,{fetcher:fakeFetch(calls),clock:()=>now,audit:line=>audits.push(JSON.parse(line))});
 const base=await start(srv);
 const auth={authorization:'Bearer '+jwt()};
 try{
  assert.equal((await fetch(base+'/v1/health')).status,401);
  assert.equal((await fetch(base+'/v1/health',{headers:{authorization:'Basic xxx'}})).status,401);
  assert.equal((await fetch(base+'/v1/models/maintenance/records',{headers:auth,method:'POST'})).status,405);
  assert.equal((await fetch(base+'/v2/models/maintenance/records',{headers:auth})).status,404);
  assert.equal((await fetch(base+'/v1/models/quality/records',{headers:auth})).status,403);
  assert.equal((await fetch(base+'/v1/models/maintenance/records?unexpected=1',{headers:auth})).status,400);
  assert.equal((await fetch(base+'/v1/models/maintenance/records?limit=1&limit=2',{headers:auth})).status,400);
  const ok=await fetch(base+'/v1/models/maintenance/records?limit=2',{headers:{...auth,'x-forwarded-user':'attacker','x-dx-core-token':'forged'}});
  assert.equal(ok.status,200);
  assert.equal(ok.headers.get('set-cookie'),null);
  assert.match(await ok.text(),/gateway/);
  assert.equal(calls[0].target,'http://gateway-api:8082/api/models/maintenance/records?limit=2');
  assert.equal(calls[0].opts.headers['x-forwarded-user'],'oidc-real-subject');
  assert.equal(calls[0].opts.headers['x-forwarded-email'],'staff@example.test');
  assert.equal(calls[0].opts.headers['x-dx-core-token'],INTERNAL);
  assert.equal((await fetch(base+'/v1/models/maintenance/records',{headers:auth})).status,200);
  const denied=await fetch(base+'/v1/models/maintenance/records',{headers:auth});
  assert.equal(denied.status,429);
  assert.equal(denied.headers.get('retry-after'),'60');
  assert.equal((await fetch(base+'/v1/health',{headers:auth})).status,200);
  for(const claim of [{aud:'other'},{exp:Math.floor(now/1000)-1},{email_verified:false},
    {scope:'openid email'},{azp:'unregistered'},{iss:'https://attacker.example/realms/warehouse'}]){
   assert.equal((await fetch(base+'/v1/health',{headers:{authorization:'Bearer '+jwt(claim)}})).status,401);
  }
  const altered=jwt().split('.');
  altered[1]=Buffer.from(JSON.stringify({sub:'other'})).toString('base64url');
  assert.equal((await fetch(base+'/v1/health',{headers:{authorization:'Bearer '+altered.join('.')}})).status,401);
  assert.equal(calls.length,3);
  assert.ok(audits.some(event=>event.clientId==='licensed-integrator'&&event.status===429));
  assert.equal(JSON.stringify(audits).includes('staff@example.test'),false);
 }finally{await close(srv);}
});
