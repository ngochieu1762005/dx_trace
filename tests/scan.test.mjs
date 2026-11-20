// DX-TRACE | Scan matching regressions | SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveScan} from '../lib/scan.mjs';
const lots=[{id:'LOT-1',code:'SUA-001',barcode:'012345678905'}];
const scan=(s,data=lots)=>resolveScan(s,data,'https://warehouse.example');
test('lot labels and encoded internal links resolve without changing workspaces',()=>{
 assert.equal(scan('DXTRACE:LOT:LOT-1').lot,'LOT-1');
 assert.equal(scan(' sua-001\r\n').lot,'LOT-1');
 assert.equal(scan('https://warehouse.example/?area=training#trace/LOT-1').lot,'LOT-1');
 assert.ok(scan('https://untrusted.example/#trace/LOT-1').error);
 assert.ok(scan('DXTRACE:LOT:missing').error);
});
test('UPC, EAN and GTIN padding match one product',()=>{
 for(const code of ['012345678905','0012345678905','00012345678905','0 123456 78905'])assert.equal(scan(code).lot,'LOT-1');
});
test('shared product barcodes require lot selection; unknown products remain lookup candidates',()=>{
 const multiple=[...lots,{id:'LOT-2',code:'SUA-002',barcode:'0012345678905'}];
 const result=scan('00012345678905',multiple);
 assert.equal(result.lot,undefined);
 assert.ok(multiple.every(l=>l.barcode.includes(result.query)));
 assert.equal(scan('8931234567890').barcode,'8931234567890');
 assert.ok(scan('').error);
});
