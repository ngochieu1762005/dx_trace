/* DX-TRACE | Gateway boundary regression tests. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer,request} from 'node:http';
import {createGateway,gatewayConfig} from '../selfhost/api-gateway.mjs';
const APP='a'.repeat(64),CORE='b'.repeat(64);
const start=async srv=>{srv.listen(0,'127.0.0.1');await once(srv,'listening');return 'http://127.0.0.1:'+srv.address().port;};
const close=async srv=>{srv.closeAllConnections();await new Promise((ok,bad)=>srv.close(e=>e?bad(e):ok()));};
test('configuration rejects same secrets and public upstreams',()=>{
  assert.throws(()=>gatewayConfig({DX_GATEWAY_APP_TOKEN:APP,DX_CORE_TOKEN:APP}));
  assert.throws(()=>gatewayConfig({DX_GATEWAY_APP_TOKEN:APP,DX_CORE_TOKEN:CORE,DX_GATEWAY_CORE_URL:'https://public.example'}));
  assert.equal(gatewayConfig({DX_GATEWAY_APP_TOKEN:APP,DX_CORE_TOKEN:CORE}).coreUrl.hostname,'core');
});
test('gateway authenticates app, swaps Core secret, filters headers and enforces policy',async()=>{
  const seen=[];
  const core=createServer(async(req,res)=>{
    let body='';for await(const c of req)body+=c;
    seen.push({path:req.url,headers:req.headers,body});
    if(req.url.startsWith('/api/redirect')){res.writeHead(302,{location:'https://attacker.invalid'}).end();return;}
    res.writeHead(200,{'content-type':'application/json','set-cookie':'should-not-leak=1'}).end(JSON.stringify({ok:true}));
  });
  const coreUrl=await start(core);
  let now=1_000_000;
  const gateway=createGateway(gatewayConfig({DX_GATEWAY_APP_TOKEN:APP,DX_CORE_TOKEN:CORE,DX_GATEWAY_CORE_URL:coreUrl,DX_GATEWAY_REQUESTS_PER_MINUTE:'2'}),{clock:()=>now});
  const base=await start(gateway);
  const h={'x-dx-core-token':APP,'x-forwarded-user':'account-1','x-forwarded-email':'owner@example.test'};
  try{
    assert.equal((await fetch(base+'/api/models')).status,403);
    assert.equal((await fetch(base+'/api/models',{headers:{'x-dx-core-token':CORE}})).status,403);
    assert.equal((await fetch(base+'/bad',{headers:h})).status,404);
    assert.equal((await fetch(base+'/api/models',{headers:h,method:'DELETE'})).status,405);
    const response=await fetch(base+'/api/models?state=1',{headers:{...h,'x-unsafe-header':'user-injected'}});
    assert.equal(response.status,200);
    assert.equal(response.headers.get('set-cookie'),null,'upstream cookies must never leak');
    assert.equal(seen[0].headers['x-dx-core-token'],CORE);
    assert.equal(seen[0].headers['x-forwarded-user'],'account-1');
    assert.equal(seen[0].headers['x-unsafe-header'],undefined);
    assert.equal(seen[0].path,'/api/models?state=1');
    assert.equal((await fetch(base+'/api/redirect',{headers:h})).status,502);
    const limited=await fetch(base+'/api/models',{headers:h});
    assert.equal(limited.status,429);
    assert.equal(limited.headers.get('retry-after'),'60');
    assert.equal((await fetch(base+'/api/health',{headers:h})).status,200,'health excluded from quota');
    now+=60_000;
    const posted=await fetch(base+'/api/update',{method:'POST',headers:{...h,'content-type':'application/json'},body:'{"safe":true}'});
    assert.equal(posted.status,200);
    assert.equal(seen.at(-1).body,'{"safe":true}');
    const oversizedStatus=await new Promise((ok,bad)=>{
      const req=request(base+'/api/upload',{method:'POST',headers:{...h,'content-length':'7000000'}},res=>{res.resume();ok(res.statusCode);});
      req.on('error',bad);req.flushHeaders();
    });
    assert.equal(oversizedStatus,413);
  }finally{await close(gateway);await close(core);}
});