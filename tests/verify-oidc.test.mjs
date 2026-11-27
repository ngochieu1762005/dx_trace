/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | OIDC verification contract tests. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {originOf,verifyOidc} from '../selfhost/verify-oidc.mjs';
const app='https://app.example.org',id='https://id.example.org';
const owner={me:{email:'owner@example.test',role:'owner'},members:[{email:'owner@example.test'},{email:'reviewer@example.test'}]};
const reviewer={me:{email:'reviewer@example.test',role:'manager'},members:owner.members};
function mock({anonymous=302,forbidden=403,second=reviewer}={}){
  return async (url,opts={})=>{
    if(url.includes('.well-known'))return Response.json({issuer:id+'/realms/warehouse',authorization_endpoint:id+'/realms/warehouse/protocol/openid-connect/auth'});
    if(url.endsWith('/api/apps/plan'))return new Response('',{status:forbidden});
    if(url.endsWith('/apps/quality/')){
      return opts.headers?.cookie
        ?new Response('<html>Quality Portal</html>',{status:200,headers:{'content-type':'text/html; charset=utf-8'}})
        :new Response('',{status:302,headers:{location:'/oauth2/start'}});
    }
    if(!opts.headers?.cookie)return new Response('',{status:anonymous});
    return Response.json(opts.headers.cookie==='owner=1'?owner:second);
  };
}
test('origin validation blocks non-TLS and URL credentials',()=>{
  assert.equal(originOf(app),app);
  assert.throws(()=>originOf('http://app.example.org/'));
  assert.throws(()=>originOf('https://evil@app.example.org/'));
});
test('two real session semantics and read-only RBAC check',async()=>{
  const result=await verifyOidc({appOrigin:app,idOrigin:id,ownerCookie:'owner=1',reviewerCookie:'reviewer=1',fetcher:mock()});
  assert.equal(result.sharedWorkspace,true);
  assert.equal(result.ownerOnlyPolicy,'denied');
  assert.equal(result.secondApplicationSSO,true);
});
test('unauthenticated access and mistaken RBAC are failures',async()=>{
  const opts={appOrigin:app,idOrigin:id,ownerCookie:'owner=1',reviewerCookie:'reviewer=1'};
  await assert.rejects(verifyOidc({...opts,fetcher:mock({anonymous:200})}),/unauthenticated/);
  await assert.rejects(verifyOidc({...opts,fetcher:mock({forbidden:200})}),/non-owner/);
  await assert.rejects(verifyOidc({...opts,fetcher:mock({second:owner})}),/non-owner role/);
});