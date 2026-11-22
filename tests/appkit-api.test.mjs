/* DX-TRACE | Independent declarative application HTTP acceptance tests
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';

const maintenance=JSON.parse(await readFile(new URL('../examples/maintenance/app.json',import.meta.url)));
const purchase=JSON.parse(await readFile(new URL('../examples/purchase/app.json',import.meta.url)));

test('installing a second app reuses audited Core without leaking records between workspaces',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dx-appkit-')),port=38689;
 const origin='http://127.0.0.1:'+port;
 let child;
 async function ready(){
  for(let n=0;n<100;n++){
   try{if((await fetch(origin+'/api/health')).ok)return}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('AppKit server did not start');
 }
 function request(route,body,identity='owner',key=randomUUID()){
  const headers={
   'x-forwarded-user':identity,'x-forwarded-email':identity+'@example.test',
   'idempotency-key':key
  };
  if(body!==undefined)headers['content-type']='application/json';
  return fetch(origin+'/api/'+route,{
   method:body===undefined?'GET':'POST',headers,
   body:body===undefined?undefined:JSON.stringify(body)
  });
 }
 try{
  child=spawn(process.execPath,['selfhost/server.mjs'],{
   env:{...process.env,DATA_DIR:join(dir,'data'),PUBLIC_ORIGIN:origin,PORT:String(port)},
   stdio:'inherit'
  });
  await ready();
  const firstPlan=await request('apps/plan',{manifest:maintenance});
  assert.equal(firstPlan.status,200);
  const p1=await firstPlan.json();
  assert.equal(p1.baseVersion,0);
  const first=await request('apps/install',{manifest:maintenance,baseVersion:0});
  assert.equal(first.status,200);
  assert.equal((await first.json()).version,1);
  const secondPlan=await request('apps/plan',{manifest:purchase});
  assert.equal(secondPlan.status,200);
  assert.equal((await secondPlan.json()).baseVersion,0);
  const key=randomUUID(),body={manifest:purchase,baseVersion:0};
  const second=await request('apps/install',body,'owner',key);
  assert.equal(second.status,200);
  const installed=await second.json();
  const retry=await request('apps/install',body,'owner',key);
  assert.equal(retry.status,200);
  assert.deepEqual(await retry.json(),installed);
  assert.equal((await request('apps/install',body)).status,409,
   'stale application version must not overwrite the new installation');
  const listing=await (await request('apps')).json();
  assert.deepEqual(listing.applications.map(x=>x.id),['maintenance','purchase']);
  assert.deepEqual(listing.applications.map(x=>x.appVersion),['1.0.0','1.0.0']);
  assert.deepEqual((await (await request('platform')).json()).installedApplications,listing.applications);
  assert.equal((await request('apps',undefined,'outsider')).status,200);
  assert.equal((await (await request('apps',undefined,'outsider')).json()).applications.length,0,
   'another workspace cannot enumerate applications');
  assert.equal((await request('apps/purchase/manifest',undefined,'outsider')).status,404);
  const manifestOut=await (await request('apps/purchase/manifest')).json();
  assert.deepEqual(manifestOut,purchase);

  assert.equal((await request('members',{email:'staff@example.test',role:'warehouse'})).status,200);
  const denied=await request('apps/install',{manifest:maintenance,baseVersion:1},'staff');
  assert.equal(denied.status,403);
  const wrong=structuredClone(maintenance);
  wrong.metadata.entrypoint='https://untrusted.example/plugin.js';
  assert.equal((await request('apps/plan',{manifest:wrong})).status,422);
  assert.equal((await (await request('audit-ledger/verify')).json()).valid,true);
 }finally{
  if(child && child.exitCode===null){const finished=once(child,'exit');child.kill();await finished}
  await rm(dir,{recursive:true,force:true});
 }
});
