/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writePostgresExport} from '../tools/export-postgres.mjs';
import {migrateEvidence} from '../selfhost/migrate-evidence.mjs';

function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'dx-pg-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=new DatabaseSync(join(dir,'warehouse.sqlite'));
 for(const f of ['0000_watery_mad_thinker.sql','0001_sensor_history.sql','0002_audit_ledger.sql','0003_platform_records.sql'])db.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 db.prepare('INSERT INTO workspaces VALUES(?,?,?,?,?)').run('ws-1','owner',JSON.stringify({files:[],note:"Tiếng Việt '; --"}),1,'2026-11-24');
 db.prepare('INSERT INTO members VALUES(?,?,?,?,?)').run('owner','ws-1','user@example.test','Nguyễn','owner');
 db.prepare('INSERT INTO external_cache VALUES(?,?,?)').run('key','{}',1890000000000);
 const payload='{"action":"test"}',prev='0'.repeat(64);
 const hash=createHash('sha256').update(prev+'\n1\n'+payload).digest('hex');
 db.prepare('INSERT INTO audit_ledger VALUES(?,?,?,?,?,?)').run('ws-1',1,prev,hash,payload,'2026-11-24');
 db.prepare('INSERT INTO webhook_delivery VALUES(?,?,?,?,?,?)').run('ws-1',1,1,1890000000000,null,503);
 db.close();writeFileSync(join(dir,'COMPLETE'),'fixture');
 return dir;
}
test('export verifies source, protects output and preserves bigint/null/UTF-8',t=>{
 const dir=fixture(t),out=join(dir,'export.sql');
 const report=writePostgresExport(dir,out),script=readFileSync(out,'utf8');
 assert.equal(Object.keys(report.tables).length,11);
 assert.equal(report.tables.workspaces.rows,1);
 assert.equal(report.tables.platform_records.rows,0);
 assert.match(script,/CREATE SCHEMA dxtrace_import/);
 assert.match(script,/1890000000000/);
 assert.match(script,/NULL/);
 assert.equal(script.includes("Tiếng Việt '; --"),false);
 if(process.platform!=='win32')assert.equal(statSync(out).mode&0o777,0o600);
 assert.throws(()=>writePostgresExport(dir,out));
 assert.equal(readFileSync(out,'utf8'),script);
 const db=new DatabaseSync(join(dir,'warehouse.sqlite'));
 db.exec("UPDATE audit_ledger SET hash='tampered'");db.close();
 const failed=join(dir,'failed.sql');assert.throws(()=>writePostgresExport(dir,failed),/Audit chain/);
 assert.equal(existsSync(failed),false);
});
test('export preserves AppKit ownership, archived data and Flowable bindings',t=>{
 const dir=fixture(t),db=new DatabaseSync(join(dir,'warehouse.sqlite'));
 db.exec(readFileSync(new URL('../drizzle/0004_app_packages.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO app_packages VALUES(?,?,?,?,?)').run('ws-1','maintenance',2,0,'[]');
 db.prepare('INSERT INTO app_package_models VALUES(?,?,?,?)').run('ws-1','pkg_maintenance_asset','maintenance','{}');
 db.prepare('INSERT INTO native_review_requests VALUES(?,?,?,?,?,?)').run('ws-1','bk','fp','creator','INC-1','process-1');
 db.close();
 const report=writePostgresExport(dir,join(dir,'appkit.sql'));
 for(const table of ['app_packages','app_package_models','native_review_requests'])assert.equal(report.tables[table].rows,1);
});
function evidenceFixture(dir){
 const db=new DatabaseSync(join(dir,'warehouse.sqlite'));
 db.exec(readFileSync(new URL('../drizzle/0004_app_packages.sql',import.meta.url),'utf8'));
 migrateEvidence(db);
 db.prepare('INSERT INTO warehouse_commands VALUES(?,?,?,?,?,?)').run('ws-1','stable-request','owner','fingerprint','{"id":"INC-1"}','2026-11-26');
 db.prepare('INSERT INTO evidence_decisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run('ws-1','decision-1',1,'incident.approve','LOT-1','owner','2026-11-26','1.0.0','1','unsigned',null,null,'{"snapshot":{}}');
 db.prepare('INSERT INTO native_review_actions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('ws-1','task-1','process-1','actor-hash','owner','owner@example.test','owner','fingerprint','quality',1,'Approved fixture','completed','2026-11-26','2026-11-26');
 db.prepare("UPDATE event_outbox SET state='dead',attempts=12,due_at=1890000000000,lease_until=1890000000000,last_error='HTTP 503' WHERE workspace=? AND seq=?").run('ws-1',1);
 db.close();
}
test('export retains captured decisions, durable commands, reviewer identities and outbox recovery state',t=>{
 const dir=fixture(t);evidenceFixture(dir);
 const report=writePostgresExport(dir,join(dir,'evidence.sql'));
 for(const table of ['warehouse_commands','evidence_decisions','native_review_actions','event_outbox'])assert.equal(report.tables[table].rows,1);
});
test('real PostgreSQL import verifies all tables and rejects repeated import or tampering',
 {skip:!process.env.DX_TEST_POSTGRES_CONTAINER},t=>{
 const dir=fixture(t),out=join(dir,'export.sql');evidenceFixture(dir);writePostgresExport(dir,out);
 const script=readFileSync(out,'utf8');
 const psql=input=>execFileSync('docker',['exec','-i',process.env.DX_TEST_POSTGRES_CONTAINER,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-At'],{input,encoding:'utf8'});
 psql('DROP SCHEMA IF EXISTS dxtrace_import CASCADE;');
 psql(script);
 assert.equal(psql('SELECT expires FROM dxtrace_import.external_cache;').trim(),'1890000000000');
 assert.equal(psql('SELECT name FROM dxtrace_import.members;').trim(),'Nguyễn');
 assert.equal(psql('SELECT id FROM dxtrace_import.evidence_decisions;').trim(),'decision-1');
 assert.equal(psql('SELECT actor_label FROM dxtrace_import.native_review_actions;').trim(),'owner@example.test');
 assert.equal(psql('SELECT state FROM dxtrace_import.event_outbox;').trim(),'dead');
 assert.throws(()=>psql(script));
 psql('DROP SCHEMA dxtrace_import CASCADE;');
 assert.throws(()=>psql(script.replace("1890000000000","1890000000001")));
 assert.equal(psql("SELECT count(*) FROM pg_namespace WHERE nspname='dxtrace_import';").trim(),'0');
});
