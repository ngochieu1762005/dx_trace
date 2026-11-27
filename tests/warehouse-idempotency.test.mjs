/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Durable HTTP idempotency beyond the bounded workspace cache.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('a warehouse request remains idempotent after 600 newer commands evict its JSON cache entry',async(t)=>{
 const dir=await mkdtemp(join(tmpdir(),'dx-durable-commands-'));process.env.DATA_DIR=dir;
 const {identity}=await import('../selfhost/runtime.mjs');
 const {GET,POST}=await import('../app/api/[...path]/route.ts');
 const {q}=await import('../lib/server.ts');
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const call=async(path,body,key=crypto.randomUUID(),who='owner',status=200)=>{
  const user={userId:who,email:who+'@durable.example.test',displayName:who};
  const req=new Request('http://localhost/api/'+path,{method:body?'POST':'GET',headers:{'idempotency-key':key},body:body?JSON.stringify(body):undefined});
  const response=await identity.run(user,()=>(body?POST:GET)(req)),value=await response.json();
  assert.equal(response.status,status,JSON.stringify(value));return value;
 };
 await call('state');
 const body={name:'Only one supplier',kind:'supplier'},key='oldest-warehouse-request';
 const created=await call('partners',body,key);
 for(let i=0;i<601;i++)await call('documents',{title:'Retention fixture '+i,content:'Synthetic fixture'},'later-'+i);
 const member=await q('SELECT workspace FROM members WHERE id=?','owner').first();
 const before=await q('SELECT state,revision FROM workspaces WHERE id=?',member.workspace).first();
 assert.equal(Object.hasOwn(JSON.parse(before.state).requests,key),false,'the old in-state cache must really be evicted');
 const afterReplay=await call('partners',body,key);
 assert.deepEqual(afterReplay,created);
 const after=await q('SELECT state,revision FROM workspaces WHERE id=?',member.workspace).first();
 assert.equal(after.revision,before.revision,'replay does not append an audit event or a second transaction');
 assert.equal(JSON.parse(after.state).partners.length,1);
 await call('partners',{...body,name:'Changed supplier'},key,'owner',409);
 await call('members',{email:'manager@durable.example.test',role:'manager'});
 await call('partners',body,key,'manager',409);
 assert.equal((await q('SELECT COUNT(*) AS n FROM warehouse_commands WHERE workspace=? AND key=?',member.workspace,key).first()).n,1);
});
