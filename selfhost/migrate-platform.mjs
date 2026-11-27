/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Atomic extraction of existing model records. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
export function migratePlatform(sql){
 sql.exec('BEGIN IMMEDIATE');
 try{
  for(const row of sql.prepare("SELECT id,state FROM workspaces WHERE json_type(state,'$.models') IS NOT NULL OR json_type(state,'$.records') IS NOT NULL").all()){
   const state=JSON.parse(row.state);
   for(const m of state.models||[])sql.prepare('INSERT INTO platform_models(workspace,id,payload) VALUES(?,?,?)').run(row.id,m.id,JSON.stringify(m));
   for(const r of state.records||[])sql.prepare('INSERT INTO platform_records(workspace,model,id,actor,status,updated,due_at,payload) VALUES(?,?,?,?,?,?,?,?)').run(row.id,r.model,r.id,r.createdBy,r.status,r.updated,r.dueAt||null,JSON.stringify(r));
   // Preserve retries issued before the extraction. Legacy requests did not store actor.
   for(const [key,v] of Object.entries(state.requests||{}))sql.prepare('INSERT OR IGNORE INTO platform_commands(workspace,key,actor,fingerprint,result,created) VALUES(?,?,?,?,?,?)').run(row.id,key,'*',v.fingerprint,JSON.stringify(v.result),new Date().toISOString());
   delete state.models;delete state.records;
   sql.prepare('UPDATE workspaces SET state=? WHERE id=?').run(JSON.stringify(state),row.id);
  }
  sql.exec('COMMIT');
 }catch(e){sql.exec('ROLLBACK');throw e}
}
