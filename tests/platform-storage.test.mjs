/* DX-TRACE | Migration, pagination and storage regression. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {migratePlatform} from '../selfhost/migrate-platform.mjs';
import {initial} from '../lib/domain.mjs';
import {applyPlatform,validateModel} from '../lib/platform.mjs';
const model=JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url)));
const schema=n=>readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8');
function legacy(){const state=initial();applyPlatform(state,'platform.apply',{definition:model,baseVersion:0},{role:'owner',actor:'owner@test',now:'2026-11-22T00:00:00Z'});applyPlatform(state,'platform.create',{model:model.id,data:{equipment:'Freezer',description:'Check',priority:'Thường'}},{role:'warehouse',actor:'staff@test',now:'2026-11-22T00:00:00Z',entity:'old-1'});return state}
test('migration preserves both areas, versions, retries and is restart-safe',()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(schema('0000_watery_mad_thinker.sql'));sql.exec(schema('0003_platform_records.sql'));
 const state=legacy();state.requests.retry={fingerprint:'old-hash',result:{id:'old-1'}};
 for(const id of ['ws-a','ws-a:training'])sql.prepare('INSERT INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)').run(id,'owner',JSON.stringify(state),'2026-11-22');
 migratePlatform(sql);migratePlatform(sql);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM platform_records').get().n,2);
 assert.deepEqual(JSON.parse(sql.prepare('SELECT payload FROM platform_records LIMIT 1').get().payload),state.records[0]);
 const after=JSON.parse(sql.prepare('SELECT state FROM workspaces LIMIT 1').get().state);assert.equal(after.records,undefined);assert.deepEqual(after.lots,state.lots);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM platform_commands').get().n,2);sql.close();
});
test('a migration conflict rolls back extraction instead of losing original data',()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(schema('0000_watery_mad_thinker.sql'));sql.exec(schema('0003_platform_records.sql'));
 const state=legacy();sql.prepare('INSERT INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)').run('ws','owner',JSON.stringify(state),'now');
 sql.prepare('INSERT INTO platform_records VALUES(?,?,?,?,?,?,?,?)').run('ws','maintenance','old-1','staff@test','draft','now',null,'{}');
 assert.throws(()=>migratePlatform(sql));assert.equal(sql.prepare('SELECT COUNT(*) n FROM platform_models').get().n,0);assert.equal(JSON.parse(sql.prepare('SELECT state FROM workspaces').get().state).records.length,1);sql.close();
});
test('all templates validate and purchase routes above threshold to owner review',()=>{
 for(const name of ['maintenance','purchase','quality','customer'])validateModel(JSON.parse(readFileSync(new URL('../examples/'+name+'/model.json',import.meta.url))));
 const definition=JSON.parse(readFileSync(new URL('../examples/purchase/model.json',import.meta.url))),s={};
 const c={role:'owner',actor:'owner',now:'2026-11-22T00:00:00Z',entity:'req'};
 applyPlatform(s,'platform.apply',{definition,baseVersion:0},c);
 assert.throws(()=>applyPlatform(s,'platform.create',{model:'purchase',data:{title:'Invalid',amount:-1}},c),/giới hạn/);
 applyPlatform(s,'platform.create',{model:'purchase',data:{title:'New equipment',amount:20000000}},{...c,actor:'staff',role:'warehouse'});
 applyPlatform(s,'platform.transition',{model:'purchase',id:'req',version:1,target:'submitted'},{...c,actor:'staff',role:'warehouse'});
 assert.throws(()=>applyPlatform(s,'platform.transition',{model:'purchase',id:'req',version:2,target:'approved'},{...c,actor:'boss',role:'manager'}),/điều kiện/);
 applyPlatform(s,'platform.transition',{model:'purchase',id:'req',version:2,target:'escalated'},{...c,actor:'boss',role:'manager'});
 applyPlatform(s,'platform.transition',{model:'purchase',id:'req',version:3,target:'approved',reason:'Approved budget'},c);
 assert.equal(s.records[0].status,'approved');
});
test('indexed records exceed former workspace limit and enforce scope before pagination/counts',async()=>{
 const dir=mkdtempSync(tmpdir()+'/dx-storage-');process.env.DATA_DIR=dir;
 try{
 const {env}=await import('../selfhost/runtime.mjs');const db=env.DB;
 db.prepare('INSERT INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)').bind('ws','owner',JSON.stringify(initial()),'now').run();
 db.prepare('INSERT INTO platform_models VALUES(?,?,?)').bind('ws','maintenance',JSON.stringify(legacy().models[0])).run();
 const writes=Array.from({length:1000},(_,i)=>{const r={...legacy().records[0],id:'row-'+String(i).padStart(4,'0'),createdBy:i%2?'staff@test':'other@test',data:{equipment:'Freezer '+i,description:'x'.repeat(2200),priority:'Thường'}};return db.prepare('INSERT INTO platform_records VALUES(?,?,?,?,?,?,?,?)').bind('ws','maintenance',r.id,r.createdBy,'draft',r.updated,null,JSON.stringify(r))});db.batch(writes);
 const {queryRecords,changePlatform}=await import('../lib/platform-store.ts');const c={workspace:'ws',role:'warehouse',email:'staff@test'};
 const first=await queryRecords(c,new URLSearchParams({limit:'25'}));assert.equal(first.records.length,25);assert.equal(first.summary.total,500);assert.equal(first.page.total,500);assert.equal(first.page.hasMore,true);assert.ok(first.records.every(r=>r.createdBy==='staff@test'));
 const second=await queryRecords(c,new URLSearchParams({limit:'25',offset:'25'}));assert.ok(second.records.every(r=>!first.records.some(a=>a.id===r.id)));
 assert.equal((await queryRecords(c,new URLSearchParams({q:'Freezer 999'}))).page.total,1);
 assert.equal((await queryRecords(c,new URLSearchParams({q:"%' OR 1=1 --"}))).page.total,0);
 assert.equal((await queryRecords({...c,role:'viewer'},new URLSearchParams())).summary.total,0);
 assert.equal((await queryRecords({...c,workspace:'other'},new URLSearchParams())).records.length,0);
 await assert.rejects(()=>queryRecords(c,new URLSearchParams({limit:'100000'})),e=>e.status===422);
 const r=await changePlatform(c,'platform.create',{model:'maintenance',data:{equipment:'New',description:'Fresh',priority:'Thường'}},'retry');
 assert.deepEqual(await changePlatform(c,'platform.create',{model:'maintenance',data:{equipment:'New',description:'Fresh',priority:'Thường'}},'retry'),r);
 await assert.rejects(()=>changePlatform({...c,email:'other@test'},'platform.create',{model:'maintenance',data:{equipment:'New',description:'Fresh',priority:'Thường'}},'retry'),e=>e.status===409);
 const concurrent=await Promise.all(Array.from({length:20},(_,i)=>changePlatform(c,'platform.create',{model:'maintenance',data:{equipment:'Parallel '+i,description:'Fresh',priority:'Thường'}},'parallel-'+i)));assert.equal(new Set(concurrent.map(x=>x.id)).size,20);
 const state=JSON.parse(db.prepare('SELECT state FROM workspaces WHERE id=?').bind('ws').first().state);assert.equal(state.records,undefined);assert.ok(JSON.stringify(state).length<1000);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
