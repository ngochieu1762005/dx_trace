/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Offline evidence verification regressions.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditBundle,verifyAuditBundle} from '../lib/audit-proof.mjs';
import {workspaceUrl} from '../public/shared/workspace.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function events(values){let previous='0'.repeat(64);return values.map((value,index)=>{const seq=index*2+1,payload=JSON.stringify(value);const row={seq,previous,payload,hash:hash(previous+'\n'+seq+'\n'+payload)};previous=row.hash;return row;});}
test('offline bundle detects tampering, missing history and wrong retained checkpoints',async()=>{
 const rows=events([{action:'create'},{action:'approve'},{action:'quarantine'}]);
 const old=auditBundle('warehouse',rows.slice(0,2)).checkpoint;
 const bundle=auditBundle('warehouse',rows);
 assert.equal((await verifyAuditBundle(bundle,old)).anchored,true);
 assert.equal((await verifyAuditBundle(bundle)).anchored,false);
 const modified=structuredClone(bundle);modified.events[1].payload='{}';
 assert.equal((await verifyAuditBundle(modified)).valid,false);
 assert.equal((await verifyAuditBundle(auditBundle('warehouse',rows.slice(0,1)),old)).valid,false);
 // An attacker can recompute a whole chain; a separately retained checkpoint detects it.
 const rewritten=auditBundle('warehouse',events([{action:'different'},{action:'approve'},{action:'quarantine'}]));
 assert.equal((await verifyAuditBundle(rewritten)).valid,true);
 assert.equal((await verifyAuditBundle(rewritten,old)).valid,false);
 assert.equal((await verifyAuditBundle(bundle,{...old,workspace:'other'})).valid,false);
 assert.equal((await verifyAuditBundle({...bundle,checkpoint:{...bundle.checkpoint,entries:1}})).valid,false);
 assert.equal((await verifyAuditBundle(auditBundle('warehouse',[]),old)).valid,false);
 assert.equal((await verifyAuditBundle(auditBundle('warehouse',[]))).valid,true);
});
test('workspace links preserve query, fragment and explicit operational isolation',()=>{
 assert.equal(workspaceUrl('/apps/quality/?q=a#record','?area=training'),'/apps/quality/?q=a&area=training#record');
 assert.equal(workspaceUrl('/#incidents/INC-1','?area=training'),'/?area=training#incidents/INC-1');
 assert.equal(workspaceUrl('/api/models?area=training&limit=25',''),'/api/models?limit=25');
 assert.throws(()=>workspaceUrl('//other.invalid'));
});
