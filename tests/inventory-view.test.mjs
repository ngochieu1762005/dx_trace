/* DX-TRACE | Inventory view regression tests. SPDX-License-Identifier: MIT.
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {availableStock,filterLots,eligibleLots,csvText} from '../lib/inventory-view.mjs';
const lots=[{id:'a',code:'A',product:'Sữa',supplier:'p',location:'Kệ 1',expiry:'2026-11-25',status:'active',quantity:10},{id:'b',code:'B',expiry:'2026-11-21',status:'active',quantity:10},{id:'c',code:'C',expiry:'2026-11-20',status:'active',quantity:10},{id:'d',code:'D',expiry:'2026-11-22',status:'quarantine',quantity:10}];
test('FEFO excludes expired, blocked and exhausted lots without changing source',()=>{
 const shipments=[{lot:'a',quantity:10,status:'reserved'},{lot:'b',quantity:2,status:'cancelled'}];
 assert.equal(availableStock(lots[1],shipments),10);
 assert.deepEqual(eligibleLots(lots,shipments,'2026-11-21').map(l=>l.id),['b']);
 assert.deepEqual(eligibleLots(lots,[],'2026-11-21').map(l=>l.id),['b','a']);
 assert.deepEqual(lots.map(l=>l.id),['a','b','c','d']);
});
test('expiry boundaries, supplier/location search and stock filters compose',()=>{
 assert.deepEqual(filterLots(lots,[],{focus:'expired',today:'2026-11-21'}).map(l=>l.id),['c']);
 assert.deepEqual(filterLots(lots,[],{focus:'expiring',status:'active',today:'2026-11-21'}).map(l=>l.id),['a','b']);
 assert.equal(filterLots(lots,[],{query:'kệ 1'}).length,1);
 assert.equal(filterLots(lots,[],{query:'Nông trại'},id=>id==='p'?'Nông trại An Nhiên':'').length,1);
 assert.deepEqual(filterLots(lots,[{lot:'a',quantity:10,status:'delivered'}],{focus:'empty'}).map(l=>l.id),['a']);
});
test('CSV preserves Vietnamese, quotes and newlines and neutralizes formulas',()=>{
 const csv=csvText([['Sữa, "dâu"','line\nnext','=SUM(1,2)','  +cmd','@ref',5]]);
 assert.equal(csv,'\uFEFF"Sữa, ""dâu""","line\nnext","\'=SUM(1,2)","\'  +cmd","\'@ref","5"');
});
