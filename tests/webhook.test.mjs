/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Durable webhook retry tests. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {deliverPending,signature,startWebhook} from '../selfhost/webhook.mjs';
import {migrateEvidence} from '../selfhost/migrate-evidence.mjs';
test('webhook signs exact body, retries failure and never resends acknowledged events',async()=>{
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync(new URL('../drizzle/0000_watery_mad_thinker.sql',import.meta.url),'utf8'));
 sql.exec(readFileSync(new URL('../drizzle/0002_audit_ledger.sql',import.meta.url),'utf8'));
 migrateEvidence(sql);
 sql.prepare('INSERT INTO audit_ledger VALUES(?,?,?,?,?,?)').run('ws',1,'0','hash','{"action":"test"}','now');
 const db={prepare:q=>({bind:(...args)=>({all:()=>({results:sql.prepare(q).all(...args)}),run:()=>sql.prepare(q).run(...args)})})};
 const cfg={url:'https://receiver.example/events',workspace:'ws',secret:'x'.repeat(32)};
 let calls=0;const send=async(url,options)=>{calls++;assert.equal(options.redirect,'error');assert.equal(options.headers['x-dx-signature'],'sha256='+signature(cfg.secret,options.headers['x-dx-timestamp'],options.body));return new Response('',{status:calls===1?503:200})};
 await deliverPending(db,cfg,send,100000);assert.equal(calls,1);
 await deliverPending(db,cfg,send,100001);assert.equal(calls,1);
 await deliverPending(db,cfg,send,200000);assert.equal(calls,2);
 await deliverPending(db,cfg,send,300000);assert.equal(calls,2);
 assert.throws(()=>startWebhook(db,{WEBHOOK_URL:'http://insecure',WEBHOOK_SECRET:cfg.secret,WEBHOOK_WORKSPACE:'ws'}));sql.close();
});
