/* DX-TRACE | API, ledger and restore integration. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
const definition=JSON.parse(await readFile(new URL('../examples/maintenance/model.json',import.meta.url),'utf8'));
test('HTTP models are isolated, idempotent, audited and survive verified restore',async()=>{
 const dir=await mkdtemp(tmpdir()+'/dx-platform-'),url='http://127.0.0.1:38685';let child;
 async function start(data){child=spawn(process.execPath,['selfhost/server.mjs'],{env:{...process.env,DATA_DIR:data,PORT:'38685',PUBLIC_ORIGIN:url},stdio:'inherit'});for(let i=0;i<70;i++){try{if((await fetch(url+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('Not ready')}
 async function stop(){if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done}child=null}
 const call=(p,b,user='owner',key=crypto.randomUUID())=>fetch(url+'/api/'+p,{method:b?'POST':'GET',headers:{'x-forwarded-user':user,'x-forwarded-email':user+'@example.test','content-type':'application/json','idempotency-key':key},body:b?JSON.stringify(b):undefined});
 try{
 await start(dir+'/data');
 assert.equal((await call('models/apply',{definition,baseVersion:0})).status,200);
 const xmlResponse=await call('models/maintenance/bpmn');
 assert.equal(xmlResponse.status,200);
 assert.match(xmlResponse.headers.get('content-type'),/application\/xml/);
 const bpmn=await xmlResponse.text();
 assert.match(bpmn,/bpmn:exclusiveGateway/);
 const planResponse=await call('models/bpmn/plan',{xml:bpmn});
 assert.equal(planResponse.status,200);
 assert.equal((await planResponse.json()).unchanged,true);
 assert.equal((await call('models/bpmn/plan',{xml:bpmn},'staff')).status,403);
 assert.equal((await call('models/bpmn/plan',{xml:'<!DOCTYPE unsafe>'+bpmn})).status,422);

 await call('members',{email:'staff@example.test',role:'warehouse'});
 await call('members',{email:'manager@example.test',role:'manager'});
 const body={data:{equipment:'Cold room',description:'Inspection',priority:'Thường'}},key=crypto.randomUUID();
 const a=await (await call('models/maintenance/records',body,'staff',key)).json();
 const retry=await (await call('models/maintenance/records',body,'staff',key)).json();assert.deepEqual(retry,a);
 assert.equal((await (await call('models',undefined,'outsider')).json()).records.length,0);
 assert.equal((await call('models/apply',{definition,baseVersion:1},'staff')).status,403);
 assert.equal((await call('models/maintenance/transition',{id:a.id,version:1,target:'submitted'},'staff')).status,200);
 const results=await Promise.all([1,2].map(()=>call('models/maintenance/transition',{id:a.id,version:2,target:'approved'},'manager')));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const state=await (await call('state')).json();assert.equal(state.records,undefined);assert.equal(state.models,undefined,'legacy state must not bypass record permissions');
 const ledger=await (await call('audit-ledger/verify')).json();assert.equal(ledger.valid,true);assert.equal(ledger.entries,4,'duplicate and failed commands not logged');
 assert.equal((await call('audit-ledger',undefined,'staff')).status,403);
 assert.equal((await call('metrics',undefined,'staff')).status,403);
 assert.match(await (await call('metrics')).text(),/dxtrace_records 1/);
 const backup=dir+'/backup';execFileSync(process.execPath,['selfhost/backup.mjs',backup],{env:{...process.env,DATA_DIR:dir+'/data'}});
 const verify=JSON.parse(execFileSync(process.execPath,['selfhost/verify-backup.mjs',backup],{encoding:'utf8'}));assert.equal(verify.valid,true);
 await stop();await start(backup);
 assert.equal((await (await call('models')).json()).records[0].status,'approved');assert.deepEqual(await (await call('audit-ledger/verify')).json(),ledger);
 const db=new DatabaseSync(backup+'/warehouse.sqlite');db.prepare('UPDATE audit_ledger SET payload=? WHERE seq=(SELECT MIN(seq) FROM audit_ledger)').run('{}');db.close();
 assert.equal((await (await call('audit-ledger/verify')).json()).valid,false);
 }finally{await stop();await rm(dir,{recursive:true,force:true})}
});
