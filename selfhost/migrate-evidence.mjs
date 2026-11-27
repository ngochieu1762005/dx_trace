/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {readFileSync} from 'node:fs';

/** The trigger makes every existing audit producer an atomic outbox producer. */
export function migrateEvidence(sql) {
 sql.exec('BEGIN IMMEDIATE');
 try {
  sql.exec(readFileSync(new URL('../drizzle/0005_decision_evidence.sql',import.meta.url),'utf8'));
  sql.exec(`CREATE TRIGGER IF NOT EXISTS audit_to_event_outbox AFTER INSERT ON audit_ledger
   BEGIN INSERT INTO event_outbox(workspace,seq,payload,created)
   VALUES(NEW.workspace,NEW.seq,NEW.payload,NEW.created); END;`);
  // Retain acknowledged deliveries and retry counts when upgrading an existing installation.
  sql.exec(`INSERT OR IGNORE INTO event_outbox(workspace,seq,payload,created,state,attempts,due_at,last_status,delivered_at)
   SELECT l.workspace,l.seq,l.payload,l.created,
    CASE WHEN d.delivered IS NOT NULL THEN 'delivered' WHEN COALESCE(d.attempts,0)>=12 THEN 'dead' ELSE 'pending' END,
    COALESCE(d.attempts,0),COALESCE(d.next_attempt,0),d.last_status,d.delivered
   FROM audit_ledger l LEFT JOIN webhook_delivery d ON l.workspace=d.workspace AND l.seq=d.seq;`);
  sql.exec(`INSERT OR IGNORE INTO warehouse_commands(workspace,key,actor,fingerprint,result,created)
   SELECT w.id,j.key,json_extract(j.value,'$.actor'),json_extract(j.value,'$.fingerprint'),
    json_extract(j.value,'$.result'),w.created FROM workspaces w,json_each(w.state,'$.requests') j
   WHERE json_type(j.value,'$.fingerprint')='text' AND json_type(j.value,'$.result')='object';`);
  sql.exec('COMMIT');
 } catch(error) {sql.exec('ROLLBACK');throw error;}
}
