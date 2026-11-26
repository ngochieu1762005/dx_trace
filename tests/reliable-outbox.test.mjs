/* DX-TRACE | Transactional outbox crash and retry regressions.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {migrateEvidence} from '../selfhost/migrate-evidence.mjs';
import {claimOutbox,settleOutbox,retryDeadOutbox,outboxStatus} from '../lib/reliable-outbox.mjs';
import {deliverPending} from '../selfhost/webhook.mjs';

function adapter(sql){return {prepare:query=>({bind:(...args)=>({
 all:()=>({results:sql.prepare(query).all(...args)}),
 first:()=>sql.prepare(query).get(...args),
 run:()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}})
 })})};}
function initialize(sql){
 sql.exec(readFileSync(new URL('../drizzle/0000_watery_mad_thinker.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../drizzle/0002_audit_ledger.sql',import.meta.url),'utf8'));
 migrateEvidence(sql);
}
function append(sql,workspace,seq){
 sql.prepare('INSERT INTO audit_ledger VALUES(?,?,?,?,?,?)').run(workspace,seq,'prior-'+seq,'hash-'+seq,JSON.stringify({action:'sample',number:seq}),'2026-11-26T00:00:00Z');
}

test('business state, audit event and outbox share one SQLite commit; migration is repeatable',()=>{
 const sql=new DatabaseSync(':memory:');initialize(sql);
 try{
  sql.prepare('INSERT INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)').run('ws','owner','{"requests":{}}','now');
  sql.exec('BEGIN IMMEDIATE');
  sql.prepare('UPDATE workspaces SET revision=revision+1 WHERE id=?').run('ws');append(sql,'ws',1);
  sql.exec('ROLLBACK');
  assert.equal(sql.prepare('SELECT revision FROM workspaces WHERE id=?').get('ws').revision,0);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM event_outbox').get().n,0);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM audit_ledger').get().n,0);
  sql.exec('BEGIN IMMEDIATE');
  sql.prepare('UPDATE workspaces SET revision=revision+1 WHERE id=?').run('ws');append(sql,'ws',1);
  sql.exec('COMMIT');
  migrateEvidence(sql);migrateEvidence(sql);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM event_outbox').get().n,1);
  assert.equal(sql.prepare('SELECT revision FROM workspaces WHERE id=?').get('ws').revision,1);
 }finally{sql.close();}
});

test('lease tokens fence expired workers, preserve tenant scope and expose retry exhaustion',()=>{
 const sql=new DatabaseSync(':memory:');initialize(sql);const db=adapter(sql);
 try{
  append(sql,'ws',1);append(sql,'other-tenant',1);
  const [first]=claimOutbox(db,{workspace:'ws',now:100000,leaseMs:1000,maxAttempts:2});
  assert.equal(first.attempts,1);
  assert.deepEqual(claimOutbox(db,{workspace:'ws',now:100001}),[],'another worker cannot claim an active lease');
  const [second]=claimOutbox(db,{workspace:'ws',now:101001,leaseMs:1000,maxAttempts:2});
  assert.equal(second.attempts,2);
  assert.notEqual(first.lease_token,second.lease_token);
  assert.equal(settleOutbox(db,first,{ok:true,now:101002}),false,'stale acknowledgement is fenced');
  assert.equal(settleOutbox(db,second,{ok:false,status:503,error:'HTTP 503',now:101002,maxAttempts:2}),true);
  assert.deepEqual(outboxStatus(db,'ws').counts,{pending:0,leased:0,delivered:0,dead:1});
  assert.equal(outboxStatus(db,'ws').dead[0].last_status,503);
  assert.deepEqual(outboxStatus(db,'other-tenant').counts,{pending:1,leased:0,delivered:0,dead:0});
  assert.equal(retryDeadOutbox(db,{workspace:'other-tenant',seq:1,expectedAttempts:2,now:102000}),false);
  assert.equal(retryDeadOutbox(db,{workspace:'ws',seq:1,expectedAttempts:1,now:102000}),false);
  assert.equal(retryDeadOutbox(db,{workspace:'ws',seq:1,expectedAttempts:2,now:102000}),true);
  const [retry]=claimOutbox(db,{workspace:'ws',now:102000,leaseMs:1000,maxAttempts:1});
  assert.equal(retry.attempts,1);
  assert.deepEqual(claimOutbox(db,{workspace:'ws',now:103001,leaseMs:1000,maxAttempts:1}),[]);
  assert.equal(outboxStatus(db,'ws').counts.dead,1,'crashing on the final attempt eventually dead-letters');
 }finally{sql.close();}
});

test('a committed event survives a killed delivery worker and is redelivered with stable ID',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'dx-outbox-crash-')),file=join(dir,'state.sqlite');
 const sql=new DatabaseSync(file);initialize(sql);append(sql,'ws',1);
 const source=`
 import {DatabaseSync} from 'node:sqlite';
 import {claimOutbox} from ${JSON.stringify(new URL('../lib/reliable-outbox.mjs',import.meta.url).href)};
 const sql=new DatabaseSync(process.argv[1]);
 const db={prepare:q=>({bind:(...a)=>({all:()=>({results:sql.prepare(q).all(...a)}),run:()=>sql.prepare(q).run(...a)})})};
 const [row]=claimOutbox(db,{workspace:'ws',now:100000,leaseMs:1000});
 process.stdout.write(JSON.stringify({seq:row.seq,token:row.lease_token})+'\\n');
 setInterval(()=>{},1000);
 `;
 const child=spawn(process.execPath,['--input-type=module','-e',source,file],{stdio:['ignore','pipe','pipe']});
 t.after(async()=>{if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');sql.close();await rm(dir,{recursive:true,force:true});});
 let output='';
 await new Promise((resolve,reject)=>{
  child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('\n'))resolve();});
  child.once('error',reject);child.once('exit',code=>reject(Error('Worker exited before claiming: '+code)));
 });
 assert.equal(JSON.parse(output).seq,1);
 const stopped=once(child,'exit');child.kill('SIGKILL');await stopped;
 const db=adapter(sql),seen=[];
 const send=async(url,options)=>{seen.push(options.headers['x-dx-event-id']);return new Response(null,{status:204});};
 const config={url:'https://synthetic.example/events',workspace:'ws',secret:'test-only-'.repeat(5)};
 assert.equal(await deliverPending(db,config,send,100001),0,'unexpired crashed lease stays reserved');
 assert.equal(await deliverPending(db,config,send,101001),1);
 assert.deepEqual(seen,['ws:1']);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM audit_ledger').get().n,1);
 assert.equal(outboxStatus(db,'ws').counts.delivered,1);
 assert.equal(await deliverPending(db,config,send,200000),0,'acknowledged event stays acknowledged');
});

test('lost delivery response permits duplicates while retry backoff prevents a hot loop',async()=>{
 const sql=new DatabaseSync(':memory:');initialize(sql);append(sql,'ws',1);const db=adapter(sql);
 try{
  const seen=[];let count=0;
  const send=async(url,options)=>{seen.push(options.headers['x-dx-event-id']);if(++count===1)throw Error('Receiver committed but response was lost');return new Response(null,{status:204});};
  const config={url:'https://synthetic.example/events',workspace:'ws',secret:'test-only-'.repeat(5)};
  assert.equal(await deliverPending(db,config,send,100000),1);
  assert.equal(await deliverPending(db,config,send,100001),0);
  assert.equal(await deliverPending(db,config,send,105000),1);
  assert.deepEqual(seen,['ws:1','ws:1']);
  assert.equal(outboxStatus(db,'ws').counts.delivered,1);
 }finally{sql.close();}
});

test('webhook signs committed ledger bytes even when mutable queue metadata drifts',async()=>{
 const sql=new DatabaseSync(':memory:');initialize(sql);append(sql,'ws',1);const db=adapter(sql);
 try{
  sql.prepare('UPDATE event_outbox SET payload=? WHERE workspace=? AND seq=?').run('{"action":"changed-in-queue"}','ws',1);
  let received;
  const send=async(url,options)=>{received=JSON.parse(options.body);return new Response(null,{status:204});};
  await deliverPending(db,{url:'https://synthetic.example/events',workspace:'ws',secret:'test-only-'.repeat(5)},send,100000);
  assert.deepEqual(received.event,{action:'sample',number:1});
  assert.equal(outboxStatus(db,'ws').counts.delivered,1);
 }finally{sql.close();}
});
