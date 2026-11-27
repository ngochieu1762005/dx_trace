/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 DX-TRACE contributors
import {DatabaseSync} from 'node:sqlite';

export function clientQuota(path){
 if(!path){
  const windows=new Map();
  return (client,now)=>{
   let row=windows.get(client);
   if(!row||now-row.start>=60000){row={start:now,count:0};windows.set(client,row)}
   row.count++;
   return row;
  };
 }
 const db=new DatabaseSync(path);
 db.exec('PRAGMA busy_timeout=2000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS external_quota(client TEXT PRIMARY KEY,start INTEGER NOT NULL,count INTEGER NOT NULL)');
 const hit=db.prepare(`INSERT INTO external_quota(client,start,count) VALUES(?,?,1)
  ON CONFLICT(client) DO UPDATE SET
    count=CASE WHEN excluded.start-start>=60000 THEN 1 ELSE count+1 END,
    start=CASE WHEN excluded.start-start>=60000 THEN excluded.start ELSE start END RETURNING start,count`);
 return (client,now)=>hit.get(client,now);
}
