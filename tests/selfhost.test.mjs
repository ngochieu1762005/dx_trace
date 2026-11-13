/*
 * DX-TRACE | HTTP isolation, authorization and restore tests
 *
 * @Project DX-TRACE
 * @Maintainer Nguyễn Ngọc Hiếu and DX-TRACE contributors
 * @File tests/selfhost.test.mjs
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
test('self-host HTTP workspace isolation, RBAC, concurrent reservation and restored attachment',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'dx-test-')), url='http://127.0.0.1:38469';let child;
 async function start(data){child=spawn(process.execPath,['selfhost/server.mjs'],{env:{...process.env,DATA_DIR:data,PORT:'38469',PUBLIC_ORIGIN:url},stdio:'inherit'});for(let i=0;i<50;i++){try{if((await fetch(url+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Server failed to start')}
 async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done}child=null}
 async function call(route,body,user='owner',idem=randomUUID()){return fetch(url+'/api/'+route,{method:body?'POST':'GET',headers:{'x-forwarded-user':user,'x-forwarded-email':user+'@example.test','idempotency-key':idem,...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined})}
 try{
 await start(root+'/data');
 assert.equal((await fetch(url+'/api/state')).status,401);
 const live=await (await call('state')).json();assert.deepEqual(live.lots,[]);
 const demo=await (await call('state?area=training')).json();assert.equal(demo.lots.length,16);
 assert.equal((await call('members',{email:'viewer@example.test',role:'viewer'})).status,200);
 assert.equal((await call('documents',{title:'x',content:'y'},'viewer')).status,403);
 const partner=await (await call('partners',{kind:'supplier',name:'Supplier'})).json();
 const dest=await (await call('partners',{kind:'destination',name:'Store'})).json();
 const lot=await (await call('lots',{code:'L1',product:'Milk',supplier:partner.id,unit:'box',quantity:10,expiry:'2099-12-31',location:'A',min_temp:1,max_temp:8})).json();
 assert.equal((await call('members/oidc%3Aviewer/role',{role:'warehouse'})).status,200);
 assert.equal((await call('documents',{title:'SOP',content:'Quy trình'},'viewer')).status,200);
 assert.equal((await call('members/oidc%3Aviewer/role',{role:'disabled'})).status,200);
 assert.equal((await call('state',undefined,'viewer')).status,403);
 assert.equal((await call('members/oidc%3Aowner/role',{role:'disabled'})).status,403);
 const device=await (await call('devices',{lot:lot.id,name:'Kho A'})).json();
 const recorded=new Date().toISOString();
 async function ingest(n,temperature=4){return fetch(url+'/api/ingest',{method:'POST',headers:{authorization:'Bearer '+device.token,'content-type':'application/json'},body:JSON.stringify({id:String(n),temperature,recorded})})}
 for(let i=0;i<6;i++)assert.equal((await ingest(i)).status,200);
 assert.equal((await ingest(0)).status,200);
 assert.equal((await ingest(0,9)).status,409);
 assert.equal((await (await call('state')).json()).readings.length,3);
 assert.equal((await (await call('sensor-history/'+device.id)).json()).readings.length,6);
 const results=await Promise.all([1,2].map(()=>call('shipments',{lot:lot.id,destination:dest.id,quantity:7})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const upload=new FormData();upload.set('entity',lot.id);upload.set('file',new Blob(['%PDF-test']), 'note.pdf');assert.equal((await call('files',upload)).status,200);
 const snapshot=await (await call('state')).json();assert.equal(snapshot.files.length,1);
 execFileSync(process.execPath,['selfhost/backup.mjs',root+'/backup'],{env:{...process.env,DATA_DIR:root+'/data'}});
 await stop();await start(root+'/backup');
 const restored=await (await call('state')).json();assert.deepEqual(restored.files,snapshot.files);assert.deepEqual(restored.shipments,snapshot.shipments);assert.deepEqual(restored.events,snapshot.events);
 }finally{await stop();await rm(root,{recursive:true,force:true})}
});
