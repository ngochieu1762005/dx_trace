/* DX-TRACE | Verify a backup without modifying it. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const target=process.argv[2];if(!target)throw Error('Usage: node selfhost/verify-backup.mjs /path/to/backup');
const db=new DatabaseSync(path.join(target,'warehouse.sqlite'),{readOnly:true});
try{
 if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('SQLite integrity check failed');
 let files=0,workspaces=0;
 for(const row of db.prepare('SELECT id,state FROM workspaces').all()){
  workspaces++;
  for(const f of JSON.parse(row.state).files||[]){
   if(!/^[a-zA-Z0-9:_-]+$/.test(row.id)||!/^[a-f0-9]{64}$/.test(f.hash))throw Error('Invalid file metadata');
   const digest=createHash('sha256').update(readFileSync(path.join(target,'objects',row.id,f.hash))).digest('hex');
   if(digest!==f.hash)throw Error('Attachment checksum mismatch: '+f.id);files++;
  }
 }
 console.log(JSON.stringify({valid:true,workspaces,files}));
}finally{db.close()}
