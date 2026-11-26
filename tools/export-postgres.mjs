/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,openSync,writeFileSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const tables={
 external_cache:['key','data','expires'],
 device_keys:['hash','workspace','device','active'],
 invitations:['email','workspace','role'],
 members:['id','workspace','email','name','role'],
 workspaces:['id','owner','state','revision','created'],
 sensor_history:['key','workspace','device','recorded','fingerprint','payload'],
 audit_ledger:['workspace','seq','previous','hash','payload','created'],
 webhook_delivery:['workspace','seq','attempts','next_attempt','delivered','last_status'],
 platform_models:['workspace','id','payload'],
 platform_records:['workspace','model','id','actor','status','updated','due_at','payload'],
 platform_commands:['workspace','key','actor','fingerprint','result','created']
};
const optionalTables={
 app_packages:['workspace','name','revision','active','versions'],
 app_package_models:['workspace','model','package','archived'],
 native_review_requests:['workspace','business_key','fingerprint','creator','reference','instance_id']
};
const integer=new Set(['expires','active','revision','seq','attempts','next_attempt','last_status']);
const sha=value=>createHash('sha256').update(value).digest('hex');
const ident=s=>'"'+s+'"';
const hex=s=>Buffer.from(s,'utf8').toString('hex');
function sqlValue(value,column){
 if(value===null)return 'NULL';
 if(integer.has(column)){
  if(typeof value!=='bigint')throw Error('Unexpected integer type: '+column);
  return value.toString();
 }
 if(typeof value!=='string'||value.includes('\0'))throw Error('Invalid PostgreSQL text: '+column);
 return "convert_from(decode('"+hex(value)+"','hex'),'UTF8')";
}
const rowDigest=(row,columns)=>sha(columns.map(c=>row[c]===null?'-':hex(String(row[c]))).join(':'));
const pgDigest=columns=>"encode(sha256(convert_to("+columns.map(c=>"COALESCE(encode(convert_to("+ident(c)+"::text,'UTF8'),'hex'),'-')").join("||':'||")+",'UTF8')),'hex')";
function schema(){
 return ['0000_watery_mad_thinker.sql','0001_sensor_history.sql','0002_audit_ledger.sql','0003_platform_records.sql','0004_app_packages.sql']
  .map(name=>readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8')
    .replace(/^\s*--.*$/gm,'').replaceAll('`','"').replace(/\binteger\b/gi,'BIGINT')).join('\n');
}
export function writePostgresExport(backup,out){
 const source=resolve(backup),target=resolve(out);
 if(!existsSync(join(source,'COMPLETE')))throw Error('Only a completed DX-TRACE backup may be exported');
 const db=new DatabaseSync(join(source,'warehouse.sqlite'),{readOnly:true});
 let fd,created=false;
 try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Invalid SQLite backup');
  // Validate references and bytes before generating a migration. Objects remain in the backup.
  for(const row of db.prepare('SELECT id,state FROM workspaces').iterate()){
   if(!/^[a-zA-Z0-9:_-]+$/.test(row.id))throw Error('Invalid workspace ID');
   const state=JSON.parse(row.state);
   if(Object.hasOwn(state,'models')||Object.hasOwn(state,'records'))throw Error('Upgrade legacy SQLite schema before migration');
   for(const f of state.files||[]){
    if(!/^[a-f0-9]{64}$/.test(f.hash)||sha(readFileSync(join(source,'objects',row.id,f.hash)))!==f.hash)
     throw Error('Attachment checksum mismatch');
   }
  }
  let workspace=null,previous='0'.repeat(64),lastSeq=0n;
  const ledger=db.prepare('SELECT workspace,seq,previous,hash,payload FROM audit_ledger ORDER BY workspace,seq');
  ledger.setReadBigInts(true);
  for(const row of ledger.iterate()){
   if(row.workspace!==workspace){workspace=row.workspace;previous='0'.repeat(64);lastSeq=0n;}
   if(row.seq<=lastSeq||row.previous!==previous||sha(previous+'\n'+row.seq+'\n'+row.payload)!==row.hash)
    throw Error('Audit chain mismatch');
   previous=row.hash;lastSeq=row.seq;
  }
  fd=openSync(target,'wx',0o600);created=true;
  const emit=s=>writeFileSync(fd,s);
  emit('-- DX-TRACE migration; contains private application data.\nBEGIN;\nCREATE SCHEMA dxtrace_import;\nSET LOCAL search_path TO dxtrace_import, pg_catalog;\n'+schema()+'\n');
  const report={schema:'dxtrace_import',tables:{}};
  for(const [table,columns] of Object.entries({...tables,...optionalTables})){
   const actual=db.prepare('PRAGMA table_info('+ident(table)+')').all().map(c=>c.name);
   if(!actual.length&&Object.hasOwn(optionalTables,table))continue; // Pre-AppKit backup.
   if(actual.length!==columns.length||columns.some(c=>!actual.includes(c)))throw Error('Unexpected source schema: '+table);
   const stmt=db.prepare('SELECT '+columns.map(ident).join(',')+' FROM '+ident(table));
   stmt.setReadBigInts(true);
   const hashes=[];let batch=[];
   const flush=()=>{if(batch.length){emit('INSERT INTO '+ident(table)+' ('+columns.map(ident).join(',')+') VALUES\n'+batch.join(',\n')+';\n');batch=[];}};
   for(const row of stmt.iterate()){
    hashes.push(rowDigest(row,columns));
    batch.push('('+columns.map(c=>sqlValue(row[c],c)).join(',')+')');
    if(batch.length===100)flush();
   }
   flush();
   const digest=sha(hashes.sort().join(''));
   report.tables[table]={rows:hashes.length,sha256:digest};
   emit("DO $$ BEGIN IF (SELECT COUNT(*) FROM "+ident(table)+") <> "+hashes.length+
     " OR (SELECT encode(sha256(convert_to(COALESCE(string_agg(h,'' ORDER BY h COLLATE \"C\"),''),'UTF8')),'hex') FROM (SELECT "+pgDigest(columns)+" AS h FROM "+ident(table)+") AS rows) <> '"+digest+
     "' THEN RAISE EXCEPTION 'Migration verification failed: "+table+"'; END IF; END $$;\n");
  }
  emit('COMMIT;\n');
  return report;
 }catch(e){if(fd!==undefined){closeSync(fd);fd=undefined;}if(created)unlinkSync(target);throw e;}
 finally{if(fd!==undefined)closeSync(fd);db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4){console.error('Usage: node tools/export-postgres.mjs <completed-backup> <new-private.sql>');process.exitCode=1;}
 else try{const report=writePostgresExport(process.argv[2],process.argv[3]);console.log(JSON.stringify(report,null,2));}
 catch(e){console.error('Migration export failed:',e.message);process.exitCode=1;}
}
