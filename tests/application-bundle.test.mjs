/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bundleDefinitions,planBundle,applyBundle} from '../lib/application-bundle.mjs';
const bundle=JSON.parse(readFileSync(new URL('../examples/bundles/operations.json',import.meta.url),'utf8'));
const context={role:'owner',actor:'operator',now:'2026-11-24T00:00:00.000Z'};
test('fresh multi-model plan and application are deterministic without changing source state',()=>{
 const state={models:[],records:[]},p=planBundle(state,bundle);
 assert.equal(p.applicable,true);
 assert.deepEqual(p.baseVersions,{maintenance:0,purchase:0});
 const installed=applyBundle(state,bundle,p.baseVersions,context);
 assert.deepEqual(installed.result.applications.map(a=>a.version),[1,1]);
 assert.equal(installed.models.length,2);
 assert.deepEqual(state,{models:[],records:[]});
 const next={models:installed.models,records:[]};
 assert.equal(planBundle(next,bundle).models.every(m=>m.unchanged),true);
 assert.throws(()=>applyBundle(next,bundle,p.baseVersions,context),{status:409});
 assert.throws(()=>applyBundle(next,bundle,{maintenance:1,purchase:1},{...context,role:'manager'}),{status:403});
});
test('bundle rejects duplicate model IDs and executable payloads',()=>{
 const copy=structuredClone(bundle);copy.spec.applications.push(copy.spec.applications[0]);
 assert.throws(()=>bundleDefinitions(copy),{status:422});
 const bad=structuredClone(bundle);bad.spec.scripts=['unsafe'];
 assert.throws(()=>bundleDefinitions(bad),{status:422});
});
test('incompatible model blocks the entire update',()=>{
 const installed=applyBundle({models:[],records:[]},bundle,{maintenance:0,purchase:0},context);
 const state={models:installed.models,records:[{model:'maintenance',id:'REC-1',status:'draft',data:{equipment:'Cold room',description:'Check',priority:'Thường'}}]};
 const changed=structuredClone(bundle);changed.spec.applications[0].spec.model.fields=changed.spec.applications[0].spec.model.fields.filter(f=>f.key!=='description');
 const p=planBundle(state,changed);
 assert.equal(p.applicable,false);
 assert.throws(()=>applyBundle(state,changed,p.baseVersions,context),{status:409});
 assert.equal(state.models[0].version,1);
});
