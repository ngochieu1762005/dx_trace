/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {DXTraceClient,DXTraceError} from '../sdk/index.mjs';
test('SDK forwards scoped token, stable idempotency key, version and refuses redirects',async()=>{
 const calls=[];
 const dx=new DXTraceClient({baseUrl:'https://api.example.test',accessToken:()=> 'short-token',fetcher:async(url,opts)=>{calls.push({url,opts});return Response.json({id:'record',version:1});}});
 await assert.rejects(dx.records.create('maintenance',{},''),/Idempotency/);
 await dx.records.create('maintenance',{equipment:'Pump'},'create-1');
 await dx.workflow.transition('maintenance','record',{version:1,target:'submitted'},'submit-1');
 assert.equal(calls[0].opts.headers.authorization,'Bearer short-token');
 assert.equal(calls[0].opts.headers['idempotency-key'],'create-1');
 assert.equal(calls[1].opts.redirect,'error');
 assert.equal(JSON.parse(calls[1].opts.body).version,1);
 const denied=new DXTraceClient({baseUrl:'https://api.example.test',accessToken:'token',fetcher:async()=>new Response('',{status:403})});
 await assert.rejects(denied.apps.list(),e=>e instanceof DXTraceError&&e.status===403);
 assert.throws(()=>new DXTraceClient({baseUrl:'http://remote.test',accessToken:'token'}),/HTTPS/);
});
