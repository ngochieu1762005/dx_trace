/* DX-TRACE | BPMN interchange and executable workflow regression tests
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workflowToBpmn,bpmnToWorkflow} from '../lib/bpmn.mjs';
import {validateModel,applyPlatform,planModel} from '../lib/platform.mjs';

const definition = JSON.parse(readFileSync(new URL('../examples/maintenance/model.json', import.meta.url), 'utf8'));
const context = (role, actor, entity = 'REC-demo') => ({
  role, actor, entity, now: '2026-11-22T10:00:00.000Z'
});

test('export contains an explicit XOR gateway and round-trips all transition policy', () => {
  const xml = workflowToBpmn(definition);
  assert.match(xml, /xmlns:bpmn="http:\/\/www\.omg\.org\/spec\/BPMN\/20100524\/MODEL"/);
  assert.match(xml, /bpmn:exclusiveGateway id="Gateway_submitted"/);
  assert.match(xml, /sourceRef="Gateway_submitted" targetRef="Task_approved"/);
  assert.match(xml, /dx:differentActor="true"/);
  assert.match(xml, /dx:reasonRequired="true"/);
  assert.match(xml, /dx:dueHours="48"/);
  const imported = bpmnToWorkflow(xml);
  assert.equal(imported.modelId, 'maintenance');
  assert.deepEqual(imported.workflow, definition.workflow);
  assert.deepEqual(validateModel({...definition, workflow: imported.workflow}).workflow,
    definition.workflow);
});

test('a model imported from BPMN executes against the actual authorization runtime', () => {
  const workflow = bpmnToWorkflow(workflowToBpmn(definition)).workflow;
  const imported = {...definition, workflow};
  const state = {};
  applyPlatform(state,'platform.apply',{definition:imported,baseVersion:0},context('owner','admin'));
  applyPlatform(state,'platform.create',{
    model:imported.id,data:{equipment:'Sensor',description:'Calibration',priority:'Khẩn cấp'}
  },context('warehouse','operator'));
  applyPlatform(state,'platform.transition',{
    model:imported.id,id:'REC-demo',version:1,target:'submitted'
  },context('warehouse','operator'));
  assert.throws(() => applyPlatform(state,'platform.transition',{
    model:imported.id,id:'REC-demo',version:2,target:'approved'
  },context('manager','operator')), /tự phê duyệt/);
  assert.throws(() => applyPlatform(state,'platform.transition',{
    model:imported.id,id:'REC-demo',version:2,target:'rejected'
  },context('manager','reviewer')), /lý do/);
  applyPlatform(state,'platform.transition',{
    model:imported.id,id:'REC-demo',version:2,target:'approved'
  },context('manager','reviewer'));
  applyPlatform(state,'platform.transition',{
    model:imported.id,id:'REC-demo',version:3,target:'done',reason:'Completed'
  },context('warehouse','operator'));
  assert.equal(state.records[0].status,'done');
  assert.equal(state.records[0].history.length,3);
});

test('conditional transitions survive BPMN round-trip without weakening guards', () => {
  const conditional = structuredClone(definition);
  conditional.workflow.transitions[0].when = {field:'priority',op:'eq',value:'Khẩn cấp'};
  const xml = workflowToBpmn(conditional);
  const next = bpmnToWorkflow(xml).workflow;
  assert.deepEqual(next, conditional.workflow);
  assert.ok(planModel({models:[],records:[]},{...definition,workflow:next}).rejections.length===0);
});

test('fail closed for DTD, arbitrary XML, incomplete routes and lost role metadata', () => {
  const xml = workflowToBpmn(definition);
  const invalid = [
    '<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>' + xml,
    xml.replace('<bpmn:userTask id="Task_draft" name="draft" />',
      '<bpmn:scriptTask id="Task_draft" />'),
    xml.replace('dx:roles="owner,manager,warehouse"', ''),
    xml.replace('targetRef="Task_approved"', 'targetRef="Task_nonexistent"'),
    xml.replace('id="Gateway_submitted"', 'id="Gateway_unknown"'),
    xml.replace('id="Flow_start"', 'id="Flow_start" role="admin"'),
    xml.replace('dx:differentActor="true"', 'dx:differentActor="yes"'),
    xml.replace('sourceRef="Start_1"', 'sourceRef="Task_done"')
  ];
  for (const candidate of invalid) {
    assert.throws(() => bpmnToWorkflow(candidate), {status:422});
  }
  assert.throws(() => bpmnToWorkflow('x'.repeat(100_001)), {status:422});
});

test('round-trip respects non-ASCII process names and stable output', () => {
  const xml = workflowToBpmn({...definition,name:'Bảo trì "thiết bị" & sửa chữa'});
  assert.match(xml, /name="Bảo trì &quot;thiết bị&quot; &amp; sửa chữa"/);
  assert.deepEqual(bpmnToWorkflow(xml).workflow, definition.workflow);
  assert.equal(workflowToBpmn(definition),workflowToBpmn(definition));
});
