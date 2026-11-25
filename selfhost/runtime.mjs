/*
 * DX-TRACE | SQLite storage, file objects and request identity
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File selfhost/runtime.mjs
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {DatabaseSync} from 'node:sqlite';
import {migratePlatform} from './migrate-platform.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {mkdirSync, readFileSync} from 'node:fs';
import {readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=path.resolve(process.env.DATA_DIR||'selfhost/data');
mkdirSync(dir,{recursive:true,mode:0o700});
const sql=new DatabaseSync(path.join(dir,'warehouse.sqlite'));
sql.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
sql.exec(readFileSync(new URL('../drizzle/0000_watery_mad_thinker.sql',import.meta.url),'utf8').replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
sql.exec(readFileSync(new URL('../drizzle/0001_sensor_history.sql',import.meta.url),'utf8')
 .replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE INDEX ','CREATE INDEX IF NOT EXISTS '));
sql.exec(readFileSync(new URL('../drizzle/0002_audit_ledger.sql',import.meta.url),'utf8'));
sql.exec(readFileSync(new URL('../drizzle/0003_platform_records.sql',import.meta.url),'utf8'));
migratePlatform(sql);
sql.exec(`CREATE TABLE IF NOT EXISTS native_review_requests (
 workspace TEXT NOT NULL, business_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
 creator TEXT NOT NULL, reference TEXT NOT NULL, instance_id TEXT UNIQUE,
 PRIMARY KEY(workspace,business_key)
)`);
function bound(query,args=[]){
 const stmt=sql.prepare(query);
 return {bind:(...values)=>bound(query,values),first:()=>stmt.get(...args)??null,
 all:()=>({results:stmt.all(...args)}),run:()=>({meta:{changes:Number(stmt.run(...args).changes)}})};
}
const DB={prepare:bound,batch(statements){sql.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
function objectPath(key){
 if(!/^[a-zA-Z0-9:_-]+\/[a-f0-9]{64}$/.test(key))throw new Error('Invalid object key');
 const file=path.join(dir,'objects',key);
 mkdirSync(path.dirname(file),{recursive:true,mode:0o700});return file;
}
const BUCKET={async put(key,bytes){const file=objectPath(key),tmp=file+'.'+randomUUID();await writeFile(tmp,new Uint8Array(bytes),{mode:0o600});await rename(tmp,file)},async get(key){try{return {body:await readFile(objectPath(key))}}catch(e){if(e.code==='ENOENT')return null;throw e}}};
export const env={DB,BUCKET,AI_API_KEY:process.env.AI_API_KEY,AI_MODEL:process.env.AI_MODEL,FILE_SCAN_URL:process.env.FILE_SCAN_URL,FILE_SCAN_TOKEN:process.env.FILE_SCAN_TOKEN};
export const identity=new AsyncLocalStorage();
export const getSessionUser=()=>identity.getStore()??null;
