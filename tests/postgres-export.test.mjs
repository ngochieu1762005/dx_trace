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
test('real PostgreSQL import verifies all tables and rejects repeated import or tampering',
 {skip:!process.env.DX_TEST_POSTGRES_CONTAINER},t=>{
 const dir=fixture(t),out=join(dir,'export.sql');writePostgresExport(dir,out);
 const script=readFileSync(out,'utf8');
 const psql=input=>execFileSync('docker',['exec','-i',process.env.DX_TEST_POSTGRES_CONTAINER,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-At'],{input,encoding:'utf8'});
 psql('DROP SCHEMA IF EXISTS dxtrace_import CASCADE;');
 psql(script);
 assert.equal(psql('SELECT expires FROM dxtrace_import.external_cache;').trim(),'1890000000000');
 assert.equal(psql('SELECT name FROM dxtrace_import.members;').trim(),'Nguyễn');
 assert.throws(()=>psql(script));
 psql('DROP SCHEMA dxtrace_import CASCADE;');
 assert.throws(()=>psql(script.replace("1890000000000","1890000000001")));
 assert.equal(psql("SELECT count(*) FROM pg_namespace WHERE nspname='dxtrace_import';").trim(),'0');
});
