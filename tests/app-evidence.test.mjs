/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 DX-TRACE contributors
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {loadPackage} from '../tools/app-cli.mjs';
import {verifyEvidenceArchive} from '../lib/business-evidence.mjs';

test('required AppKit signing fences the entire transition and exports a replayable decision',async()=>{
 const dir=await mkdtemp(tmpdir()+'/app-proof-');
 process.env.DATA_DIR=dir;
 try{
  const {identity}=await import('../selfhost/runtime.mjs');
  const {GET,POST}=await import('../app/api/[...path]/route.ts');
  const user={userId:'owner',email:'owner@example.test',displayName:'Owner'};
  const call=(path,body,key=crypto.randomUUID())=>identity.run(user,()=>{
   const req=new Request('http://localhost/api/'+path,{method:body?'POST':'GET',headers:{'idempotency-key':key},body:body&&JSON.stringify(body)});
   return body?POST(req):GET(req);
  });
  const pkg=await loadPackage('examples/maintenance');pkg.manifest.spec.evidence.signing='required';
  assert.equal((await call('packages/maintenance/install',{revision:0,package:pkg})).status,200);
  const base='models/pkg_maintenance_maintenance/';
  const record=await (await call(base+'records',{data:{equipment:'Fan',priority:'Thường',description:'Inspect'}})).json();
  const command={id:record.id,version:1,target:'submitted'},key=crypto.randomUUID();
  const before=await (await call('audit-ledger/verify')).json();
  assert.equal((await call(base+'transition',command,key)).status,503);
  assert.deepEqual(await (await call('audit-ledger/verify')).json(),before);
  assert.equal((await (await call(base+'records')).json()).records[0].version,1);
  const {publicKey,privateKey}=generateKeyPairSync('ed25519');
  process.env.DX_EVIDENCE_PRIVATE_KEY_FILE=dir+'/key.pem';
  await writeFile(process.env.DX_EVIDENCE_PRIVATE_KEY_FILE,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
  const success=await call(base+'transition',command,key);assert.equal(success.status,200,await success.text());
  assert.equal((await call(base+'transition',command,key)).status,200);
  const decisions=(await (await call('evidence')).json()).decisions;assert.equal(decisions.length,1);
  const exported=await call('evidence/'+decisions[0].id+'/export');assert.equal(exported.status,200);
  const report=verifyEvidenceArchive(Buffer.from(await exported.arrayBuffer()),{publicKey});
  assert.equal(report.valid,true,JSON.stringify(report));
 }finally{delete process.env.DX_EVIDENCE_PRIVATE_KEY_FILE;await rm(dir,{recursive:true,force:true})}
});
