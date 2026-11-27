/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Verified, non-destructive cold telemetry export. SPDX-License-Identifier: MIT */
import {DatabaseSync} from 'node:sqlite';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile,rename,rm,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGzip,createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';

const digest=async file=>{const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');};
const dateRange=month=>{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Use YYYY-MM');
 const start=new Date(month+'-01T00:00:00.000Z'),end=new Date(start);
 end.setUTCMonth(end.getUTCMonth()+1);
 return [start.toISOString(),end.toISOString()];
};
export async function exportMonth(source,target,workspace,month){
 if(!workspace||workspace.length>256)throw Error('Workspace required');
 const [start,end]=dateRange(month);
 const db=new DatabaseSync(resolve(source),{readOnly:true});
 const dest=resolve(target),temp=dest+'.tmp-'+randomUUID();
 let count=0;
 try{
  await mkdir(temp,{mode:0o700});
  const rows=db.prepare('SELECT key,workspace,device,recorded,fingerprint,payload FROM sensor_history WHERE workspace=? AND recorded>=? AND recorded<? ORDER BY recorded,key');
  function* lines(){for(const r of rows.iterate(workspace,start,end)){count++;yield JSON.stringify({...r,payload:JSON.parse(r.payload)})+'\n';}}
  await pipeline(Readable.from(lines()),createGzip({level:9}),createWriteStream(join(temp,'readings.jsonl.gz'),{flags:'wx',mode:0o600}));
  const file=join(temp,'readings.jsonl.gz');
  const manifest={schema:'dxtrace.telemetry.archive/v1',workspace,month,start,end,rows:count,sha256:await digest(file),bytes:(await stat(file)).size,created:new Date().toISOString()};
  await writeFile(join(temp,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
  await verifyArchive(temp);
  // An exclusive destination directory is required: never replace an archive.
  await mkdir(dest,{mode:0o700});
  try{await rename(join(temp,'readings.jsonl.gz'),join(dest,'readings.jsonl.gz'));await rename(join(temp,'manifest.json'),join(dest,'manifest.json'));}
  catch(e){await rm(dest,{recursive:true,force:true});throw e;}
  return manifest;
 }finally{db.close();await rm(temp,{recursive:true,force:true});}
}
export async function verifyArchive(dir,{device,onRow}={}){
 const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')),file=join(dir,'readings.jsonl.gz');
 if(manifest.schema!=='dxtrace.telemetry.archive/v1'||typeof manifest.workspace!=='string'||!Number.isSafeInteger(manifest.rows)||manifest.rows<0)throw Error('Invalid manifest');
 const [start,end]=dateRange(manifest.month);
 if(manifest.start!==start||manifest.end!==end||manifest.sha256!==await digest(file)||(await stat(file)).size!==manifest.bytes)throw Error('Archive checksum or interval mismatch');
 const gunzip=createGunzip(),input=createReadStream(file);
 input.on('error',e=>gunzip.destroy(e));input.pipe(gunzip);
 let count=0,previous=null;
 for await(const line of createInterface({input:gunzip,crlfDelay:Infinity})){
  const r=JSON.parse(line),expected=JSON.stringify([r.workspace,r.device,r.payload.id.slice(r.device.length+1)]);
  const key=r.recorded+'\n'+r.key;
  if(r.workspace!==manifest.workspace||r.recorded<start||r.recorded>=end||r.key!==expected||r.payload.device!==r.device||r.payload.recorded!==r.recorded||!/^[a-f0-9]{64}$/.test(r.fingerprint)||(previous!==null&&key<=previous))throw Error('Invalid archive row');
  previous=key;count++;
  if(onRow&&(!device||r.device===device))await onRow(r);
 }
 if(count!==manifest.rows)throw Error('Archive count mismatch');return manifest;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [cmd,a,b,c,d]=process.argv.slice(2);
 try{
  if(cmd==='export'&&a&&b&&c&&d)console.log(JSON.stringify(await exportMonth(a,b,c,d),null,2));
  else if(cmd==='verify'&&a&&!b)console.log(JSON.stringify(await verifyArchive(a),null,2));
  else if(cmd==='query'&&a&&b&&!c){await verifyArchive(a);await verifyArchive(a,{device:b,onRow:r=>console.log(JSON.stringify(r))});}
  else throw Error('Usage: archive-sensors.mjs export <snapshot.sqlite> <new-dir> <workspace> <YYYY-MM> | verify <dir> | query <dir> <device>');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
