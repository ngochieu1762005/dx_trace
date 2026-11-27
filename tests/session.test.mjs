/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Authentication recovery regression tests. SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {signInUrl, sessionRequest} from '../public/shared/session.mjs';

test('sign-in preserves training workspace and scanned lot hash',()=>{
 const loc=new URL('https://app.example.org/?area=training#trace/SUA-005');
 const auth=new URL(signInUrl(loc),loc.origin);
 assert.equal(auth.origin,loc.origin);
 assert.equal(auth.pathname,'/oauth2/start');
 assert.equal(auth.searchParams.get('rd'),'/?area=training#trace/SUA-005');
});
test('sign-in returns to Approvals with its chosen data area',()=>{
 const loc=new URL('https://app.example.org/apps/approvals/index.html?area=live');
 assert.equal(new URL(signInUrl(loc),loc.origin).searchParams.get('rd'),'/apps/approvals/index.html?area=live');
});
test('API does not follow auth redirects and preserves mutation payload and key',async()=>{
 let calls=0;
 const result=await sessionRequest('/api/workflow',{method:'POST',headers:{'idempotency-key':'same-request'},body:'{}'},async(url,options)=>{
  calls++;assert.equal(options.redirect,'manual');assert.equal(options.credentials,'same-origin');assert.equal(options.headers['idempotency-key'],'same-request');assert.equal(options.body,'{}');
  return Response.json({ok:true});
 });
 assert.deepEqual(result,{ok:true});assert.equal(calls,1);
});
test('expired sessions produce actionable 401 rather than JSON parse errors',async()=>{
 for(const response of [{type:'opaqueredirect',status:0},new Response('',{status:302}),new Response('<html>Sign in</html>',{status:401})]){
  await assert.rejects(sessionRequest('/api/state',{},async()=>response),e=>e.status===401 && e.message.includes('đăng nhập'));
 }
});
test('403 remains permission denial and server HTML remains server error',async()=>{
 await assert.rejects(sessionRequest('/api/state',{},async()=>Response.json({error:'Không có quyền'},{status:403})),e=>e.status===403);
 await assert.rejects(sessionRequest('/api/state',{},async()=>new Response('<html>Bad Gateway</html>',{status:502,headers:{'content-type':'text/html'}})),e=>e.status===502);
});
