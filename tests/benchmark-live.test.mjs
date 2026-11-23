/* DX-TRACE | Synthetic benchmark runner tests.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarkLevel,benchmarkLive} from '../tools/benchmark-live.mjs';
test('load runner collects latencies/statuses without publishing session data',async()=>{
 const cookie='sensitive-cookie=value',calls=[];
 let t=0;
 const fetcher=async(url,options)=>{
  calls.push({url,options});t+=4;
  return new Response('{"safe":true}',{status:200,headers:{'content-type':'application/json'}});
 };
 const level=await benchmarkLevel({url:'https://app.example.test/api/state',cookie,clients:2,
  requests:6,fetcher,clock:()=>++t});
 assert.equal(level.clients,2);
 assert.equal(level.successes,6);
 assert.equal(level.failures,0);
 assert.deepEqual(level.httpStatuses,{'200':6});
 assert.equal(calls.length,6);
 assert.equal(calls[0].options.headers.cookie,cookie);
 assert.equal(JSON.stringify(level).includes(cookie),false);
});
test('live test fails closed on redirect or anonymous denial and keeps HTTPS-only origin',async()=>{
 const bad=await benchmarkLive({appOrigin:'https://app.example.test',cookie:'x=y',
  fetcher:async()=>new Response('Login',{status:302})});
 assert.equal(bad.passed,false);
 assert.equal(bad.levels.length,1);
 assert.equal(bad.levels[0].httpStatuses['302'],12);
 assert.throws(()=>benchmarkLive({appOrigin:'http://localhost:8080',cookie:'x=y'}),/HTTPS/);
});
