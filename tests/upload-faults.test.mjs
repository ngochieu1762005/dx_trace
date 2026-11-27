/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Upload quarantine and EICAR transport fixture (not ClamAV acceptance).
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createScanner} from '../selfhost/scan-api.mjs';

test('EICAR fixture is refused before storage; scanner failures fail closed and unscanned files stay quarantined',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'dx-upload-faults-'));
 const token='synthetic-scanner-test-'.repeat(3);
 // Harmless industry test string. Detection below is deliberately a fixture;
 // testing ClamAV signatures against a real daemon is a separate acceptance.
 const eicar=Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
 let offline=false,scanCalls=0;
 const scanner=createScanner({token,scan:async bytes=>{
  scanCalls++;if(offline)throw Error('Injected scanner outage');return !bytes.includes(eicar);
 }});
 await new Promise(resolve=>scanner.listen(0,'127.0.0.1',resolve));
 process.env.DATA_DIR=dir;
 process.env.FILE_SCAN_URL='http://127.0.0.1:'+scanner.address().port+'/scan';
 process.env.FILE_SCAN_TOKEN=token;
 const {env,identity}=await import('../selfhost/runtime.mjs');
 const {GET,POST}=await import('../app/api/[...path]/route.ts');
 t.after(async()=>{scanner.closeAllConnections();await new Promise(resolve=>scanner.close(resolve));await rm(dir,{recursive:true,force:true});});
 const user={userId:'upload-owner',email:'upload@example.test',displayName:'Test uploader'};
 const request=(path,body)=>identity.run(user,()=>{
  const form=body instanceof FormData;
  const req=new Request('http://localhost/api/'+path,{method:body?'POST':'GET',
   headers:{'idempotency-key':crypto.randomUUID(),...(!form&&body?{'content-type':'application/json'}:{})},
   body:body?form?body:JSON.stringify(body):undefined});
  return (body?POST:GET)(req);
 });
 async function call(path,body,status=200){const response=await request(path,body);assert.equal(response.status,status,await response.clone().text());return response.json();}
 await call('state');
 const supplier=await call('partners',{name:'Upload supplier',kind:'supplier'});
 const lot=await call('lots',{code:'UPLOAD-LOT',product:'Milk',supplier:supplier.id,quantity:1,unit:'box',expiry:'2099-12-31',location:'A',min_temp:2,max_temp:8});
 const upload=bytes=>{const form=new FormData();form.set('entity',lot.id);form.set('file',new Blob([bytes]),'synthetic-test.pdf');return form;};
 let writes=0;const put=env.BUCKET.put;
 env.BUCKET.put=async(...args)=>{writes++;return put(...args);};
 await call('files',upload(eicar),422);
 assert.equal(scanCalls,0,'plain EICAR is rejected by the document format policy');
 await call('files',upload(Buffer.concat([Buffer.from('%PDF-test\n'),eicar])),422);
 assert.equal(scanCalls,1);assert.equal(writes,0,'infected bytes must never be persisted');
 assert.deepEqual((await call('state')).files,[]);
 offline=true;
 await call('files',upload('%PDF-scan-unavailable'),503);
 assert.equal(writes,0);offline=false;
 const clean=await call('files',upload('%PDF-clean fixture'));
 assert.equal(writes,1);
 assert.equal((await request('files/'+clean.id)).status,200);
 env.FILE_SCAN_URL=undefined;
 const pending=await call('files',upload('%PDF-unscanned fixture'));
 const state=await call('state');
 assert.equal(state.files.find(f=>f.id===pending.id).scan,'pending');
 assert.equal((await request('files/'+pending.id)).status,423);
});
