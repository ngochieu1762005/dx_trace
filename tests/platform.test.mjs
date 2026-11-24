/* DX-TRACE | Declarative core regression tests. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateModel,planModel,applyPlatform,platformView,modelOpenApi,recordScope,canRead} from '../lib/platform.mjs';
const definition=JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url)));
const context=(role='owner',actor='owner')=>({role,actor,now:'2026-11-22T10:00:00Z',entity:'record-1'});
function setup(){const state={};applyPlatform(state,'platform.apply',{definition,baseVersion:0},context());return state}
test('model validation, stale plan and safe additive schema evolution',()=>{
 const s=setup();assert.equal(s.models[0].version,1);
 assert.throws(()=>applyPlatform(s,'platform.apply',{definition,baseVersion:0},context()),/thay đổi/);
 assert.throws(()=>validateModel({...definition,fields:[{key:'constructor',label:'Invalid',type:'text'}]}));
 applyPlatform(s,'platform.create',{model:definition.id,data:{equipment:'Freezer',description:'Repair',priority:'Thường'}},context('warehouse','staff'));
 const removed=structuredClone(definition);removed.fields.shift();assert.ok(planModel(s,removed).rejections.length);
 const additive=structuredClone(definition);additive.fields.push({key:'note',label:'Note',type:'text'});
 applyPlatform(s,'platform.apply',{definition:additive,baseVersion:1},context());assert.equal(s.models[0].history.length,2);
 const wf=structuredClone(additive);wf.workflow.transitions[0].dueHours=48;assert.ok(planModel(s,wf).rejections.length);
 assert.throws(()=>applyPlatform(s,'platform.apply',{definition,baseVersion:2},context('manager')),/Chỉ chủ/);
});
test('record scope, self-approval, reasons, versions and overdue',()=>{
 const s=setup(),data={equipment:'Freezer',description:'Repair',priority:'Khẩn cấp'};
 applyPlatform(s,'platform.create',{model:definition.id,data},context('warehouse','staff'));
 assert.equal(platformView(s,context('warehouse','other')).records.length,0);
 assert.equal(platformView(s,context('viewer','viewer')).models.length,0);
 assert.throws(()=>applyPlatform(s,'platform.update',{model:definition.id,id:'record-1',version:1,data:{...data,status:'approved'}},context('warehouse','staff')),/không thuộc/);
 applyPlatform(s,'platform.transition',{model:definition.id,id:'record-1',version:1,target:'submitted'},context('warehouse','staff'));
 assert.equal(platformView(s,{...context(),now:'2026-11-24T10:00:00Z'}).summary.overdue,1);
 assert.throws(()=>applyPlatform(s,'platform.transition',{model:definition.id,id:'record-1',version:2,target:'approved'},context('manager','staff')),/tự phê duyệt/);
 assert.throws(()=>applyPlatform(s,'platform.transition',{model:definition.id,id:'record-1',version:2,target:'rejected'},context('manager','boss')),/lý do/);
 assert.throws(()=>applyPlatform(s,'platform.transition',{model:definition.id,id:'record-1',version:1,target:'approved'},context('manager','boss')),/thay đổi/);
 applyPlatform(s,'platform.transition',{model:definition.id,id:'record-1',version:2,target:'approved'},context('manager','boss'));
 applyPlatform(s,'platform.transition',{model:definition.id,id:'record-1',version:3,target:'done',reason:'Fixed'},context('warehouse','staff'));
 assert.equal(s.records[0].history.length,3);assert.equal(s.records[0].version,4);
 assert.equal(platformView(s,{...context(),now:'2026-12-24T10:00:00Z'}).summary.overdue,0);
 assert.equal(modelOpenApi(definition).components.schemas.Data.required.length,3);
});

 test('malformed field and transition return validation errors',()=>{
 const m=JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url),'utf8'));
 assert.throws(()=>validateModel({...m,fields:[null]}),e=>e.status===422);
 assert.throws(()=>validateModel({...m,workflow:{...m.workflow,transitions:[null]}}),e=>e.status===422);
 });

test('explicit model scopes override legacy manager access and enforce transitions',()=>{
 const d=structuredClone(definition);d.permissions.scopeByRole={manager:'own',warehouse:'all'};
 const s={};applyPlatform(s,'platform.apply',{definition:d,baseVersion:0},context());
 const data={equipment:'Freezer',description:'Repair',priority:'Thường'};
 applyPlatform(s,'platform.create',{model:d.id,data},context('warehouse','staff'));
 assert.equal(recordScope(d,'manager'),'own');
 assert.equal(recordScope(d,'owner'),'all');
 assert.equal(recordScope(d,'viewer'),'none');
 assert.equal(canRead(d,s.records[0],context('manager','boss')),false);
 assert.equal(platformView(s,context('warehouse','other')).records.length,1);
 applyPlatform(s,'platform.transition',{model:d.id,id:'record-1',version:1,target:'submitted'},context('warehouse','staff'));
 assert.throws(()=>applyPlatform(s,'platform.transition',{model:d.id,id:'record-1',version:2,target:'approved'},context('manager','boss')),{status:403});
 assert.throws(()=>validateModel({...d,permissions:{...d.permissions,scopeByRole:{owner:'own'}}}),{status:422});
 assert.throws(()=>validateModel({...d,permissions:{...d.permissions,scopeByRole:{viewer:'all'}}}),{status:422});
});
