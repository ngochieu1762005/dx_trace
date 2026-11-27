/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {scanBytes,createScanner} from '../selfhost/scan-api.mjs';
import {verifyUpload} from '../lib/upload-policy.mjs';
import {buildCatalog} from '../lib/data-catalog.mjs';
import {manifestToModel} from '../lib/appkit.mjs';
import {readFileSync} from 'node:fs';

test('configured upload policy rejects infected, unknown and unavailable scan results',async()=>{
  const env={FILE_SCAN_URL:'http://scanner.invalid/scan'};
  const bytes=new ArrayBuffer(3);
  const reply=(value,status=200)=>async()=>Response.json(value,{status});
  assert.equal(await verifyUpload(bytes,{},reply({clean:false})),'pending');
  assert.equal(await verifyUpload(bytes,env,reply({clean:true})),'clean');
  await assert.rejects(verifyUpload(bytes,env,reply({clean:false})),{status:422});
  await assert.rejects(verifyUpload(bytes,env,reply({})),{status:503});
  await assert.rejects(verifyUpload(bytes,env,reply({},503)),{status:503});
  await assert.rejects(verifyUpload(bytes,env,async()=>{throw Error('offline')}),{status:503});
});
test('scanner rejects missing credentials and returns explicit verdict',async(t)=>{
  const token='test-credential-'.repeat(3);
  const server=createScanner({token,scan:async b=>b.toString()==='clean'});
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>server.close());
  const url='http://127.0.0.1:'+server.address().port+'/scan';
  const send=(body,auth)=>fetch(url,{method:'POST',body,headers:{'content-type':'application/octet-stream',...(auth?{authorization:'Bearer '+token}:{})}});
  assert.equal((await send('clean',false)).status,403);
  assert.deepEqual(await (await send('clean',true)).json(),{clean:true});
  assert.deepEqual(await (await send('infected',true)).json(),{clean:false});
});
test('ClamAV INSTREAM framing and verdict parsing',async(t)=>{
  const received=[];
  const server=createServer(socket=>{
    let all=Buffer.alloc(0);
    socket.on('data',chunk=>{
      all=Buffer.concat([all,chunk]);
      if(all.length<Buffer.byteLength('zINSTREAM\0')+4+3+4)return;
      received.push(all);
      socket.end('stream: Test-Signature FOUND\0');
    });
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
  assert.equal(await scanBytes(Buffer.from('abc'),{host:'127.0.0.1',port:server.address().port}),false);
  assert.deepEqual(received[0],Buffer.concat([Buffer.from('zINSTREAM\0'),Buffer.from([0,0,0,3]),Buffer.from('abc'),Buffer.alloc(4)]));
});
test('catalog respects model read policy and does not expose records',()=>{
  const d=manifestToModel(JSON.parse(readFileSync(new URL('../examples/maintenance/app.json',import.meta.url),'utf8')));
  d.permissions.read=['owner'];
  const models=[{id:d.id,version:1,definition:d,records:[{private:'not catalog metadata'}]}];
  assert.deepEqual(buildCatalog(models,'viewer'),[]);
  const [entry]=buildCatalog(models,'owner');
  assert.equal(entry.id,d.id);assert.equal(entry.lineage.kind,'declared');
  assert.equal(entry.fields.length,d.fields.length);
  assert.equal(JSON.stringify(entry).includes('not catalog metadata'),false);
});
