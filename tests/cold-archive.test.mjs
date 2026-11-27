/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm,appendFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exportMonth,verifyArchive} from '../tools/archive-sensors.mjs';
test('cold archive isolates workspace and month; detects tampering; does not delete source',async()=>{
 const root=await mkdtemp(join(tmpdir(),'dx-cold-')),file=join(root,'snapshot.sqlite'),dest=join(root,'archive');
 const db=new DatabaseSync(file);
 try{
  db.exec('CREATE TABLE sensor_history(key TEXT PRIMARY KEY,workspace TEXT,device TEXT,recorded TEXT,fingerprint TEXT,payload TEXT)');
  for(const [w,id,recorded] of [['ws-a','one','2026-10-01T00:00:00.000Z'],['ws-b','two','2026-10-02T00:00:00.000Z'],['ws-a','three','2026-11-01T00:00:00.000Z']]){
   db.prepare('INSERT INTO sensor_history VALUES(?,?,?,?,?,?)').run(JSON.stringify([w,'dev',id]),w,'dev',recorded,'a'.repeat(64),JSON.stringify({id:'dev:'+id,device:'dev',recorded,temperature:4}));
  }
  const m=await exportMonth(file,dest,'ws-a','2026-10');assert.equal(m.rows,1);
  const rows=[];await verifyArchive(dest,{device:'dev',onRow:r=>rows.push(r)});
  assert.equal(rows[0].payload.id,'dev:one');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sensor_history').get().n,3);
  await assert.rejects(()=>exportMonth(file,dest,'ws-a','2026-10'));
  await appendFile(join(dest,'readings.jsonl.gz'),'tamper');
  await assert.rejects(()=>verifyArchive(dest),/checksum/);
 }finally{db.close();await rm(root,{recursive:true,force:true});}
});
