/*
 * DX-TRACE | Headless core / second application integration tests
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';

test('independent headless core and approvals UI share identity, data and workflow securely',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'dx-headless-'));
 const corePort=38681,webPort=38682;
 const web='http://127.0.0.1:'+webPort,core='http://127.0.0.1:'+corePort;
 const secret=randomBytes(32).toString('hex');
 let coreProcess,webProcess;
 async function ready(url,headers={}){
  for(let n=0;n<75;n++){
   try{const response=await fetch(url,{headers});if(response.ok)return}
   catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('Service did not become ready: '+url);
 }
 async function stop(child){
  if(child&&!child.killed&&child.exitCode===null){const done=once(child,'exit');child.kill();await done}
 }
 async function api(name,body,who='owner'){
  return fetch(web+'/api/'+name,{method:body===undefined?'GET':'POST',headers:{
   'x-forwarded-user':who,'x-forwarded-email':who+'@example.test',
   'idempotency-key':randomUUID(),
   ...(body===undefined?{}:{'content-type':'application/json'})
  },body:body===undefined?undefined:JSON.stringify(body)});
 }
 try{
  coreProcess=spawn(process.execPath,['selfhost/core-server.mjs'],{
   env:{...process.env,DATA_DIR:path.join(dir,'data'),PUBLIC_ORIGIN:web,PORT:String(corePort),DX_CORE_TOKEN:secret},
   stdio:'inherit'
  });
  await ready(core+'/api/health',{'x-dx-core-token':secret});
  assert.equal((await fetch(core+'/api/health')).status,403,'internal token required');
  assert.equal((await fetch(core+'/api/health',{'x-dx-core-token':'bad'})).status,403);
  assert.equal((await fetch(core+'/apps/approvals/index.html',{'x-dx-core-token':secret})).status,404,
   'core must never serve user interfaces');
  webProcess=spawn(process.execPath,['selfhost/server.mjs'],{
   env:{...process.env,PUBLIC_ORIGIN:web,PORT:String(webPort),DX_CORE_URL:core,DX_CORE_TOKEN:secret},
   stdio:'inherit'
  });
  await ready(web+'/api/health');
  assert.equal((await fetch(web+'/api/state')).status,401);
  const page=await fetch(web+'/apps/approvals/index.html');
  assert.equal(page.status,200);
  assert.match(await page.text(),/DX Approvals/);
  const state=await (await api('state')).json();
  assert.equal(state.me.role,'owner');
  const platform=await (await api('platform')).json();
  assert.deepEqual(platform.applications.map(x=>x.id),['trace','requests']);
  const draftRes=await api('workflow',{title:'Review stock policy',content:'Shared DX-OS workflow'});
  assert.equal(draftRes.status,200);
  const draft=await draftRes.json();
  assert.equal(draft.id.startsWith('WOR-'),true);
  assert.equal((await api('workflow/'+draft.id+'/transition',{target:'submitted'})).status,200);
  assert.equal((await api('workflow/'+draft.id+'/transition',{target:'approved'})).status,200);
  const list=await (await api('state')).json();
  assert.equal(list.workflowRuns.find(x=>x.id===draft.id).status,'approved');
  const another=await (await api('state',undefined,'another')).json();
  assert.equal(another.workflowRuns.length,0,'workspace isolation preserved');
  assert.equal((await api('workflow',{title:'Denied',content:'No permission'},'another')).status,200);
  assert.equal((await api('state',undefined,'another')).status,200);
 }finally{
  await stop(webProcess);await stop(coreProcess);
  await rm(dir,{recursive:true,force:true});
 }
});
