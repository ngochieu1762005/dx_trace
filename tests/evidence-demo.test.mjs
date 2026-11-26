/* DX-TRACE | Browser fixture integrity checks. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvidenceDemo,tamperEvidenceDemo,verifyEvidenceDemo} from '../public/shared/evidence-demo.mjs';

test('synthetic browser evidence starts valid and remains explicitly labeled',async()=>{
 const fixture=await createEvidenceDemo();
 assert.equal(JSON.parse(fixture.manifest).synthetic,true);
 assert.equal(JSON.parse(fixture.files['decision.json']).synthetic,true);
 assert.equal((await verifyEvidenceDemo(fixture)).valid,true);
});
test('changing an inspection invalidates data and events despite the original manifest signature',async()=>{
 const fixture=await createEvidenceDemo();
 const result=await verifyEvidenceDemo(tamperEvidenceDemo(fixture));
 assert.equal(result.valid,false);
 assert.deepEqual(result.checks.filter(check=>!check.valid).map(check=>check.id),['manifest','events','lineage']);
 assert.equal(result.checks.find(check=>check.id==='signature').valid,true);
 assert.equal((await verifyEvidenceDemo(fixture)).valid,true);
});
test('the browser demo verifies with the separately retained key',async()=>{
 const fixture=await createEvidenceDemo(),other=await createEvidenceDemo();
 const result=await verifyEvidenceDemo({...fixture,trustedKey:other.trustedKey});
 assert.equal(result.valid,false);
 assert.equal(result.checks.find(check=>check.id==='signature').valid,false);
});
