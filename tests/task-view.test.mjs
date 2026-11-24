/* DX-TRACE | Task projection respects role, separation of duties and active tokens.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {executableTasks} from '../lib/task-view.mjs';
const definition={workflow:{transitions:[{from:'submitted',to:'approved',roles:['manager'],differentActor:true,when:{field:'amount',op:'gte',value:5}}]},orchestration:{nodes:[{id:'review',type:'userTask',roles:['manager'],differentActor:true},{id:'inspect',type:'userTask',roles:['warehouse']},{id:'wait',type:'timer'}]}};
test('parallel tasks expose only active authorized human work',()=>{
 const record={createdBy:'creator',process:{status:'running',tokens:[{node:'review'},{node:'wait'}]}};
 assert.deepEqual(executableTasks(definition,record,'manager','creator'),[]);
 assert.deepEqual(executableTasks(definition,record,'warehouse','other'),[]);
 assert.deepEqual(executableTasks(definition,record,'manager','other').map(t=>t.id),['review']);
 record.process.status='completed';
 assert.deepEqual(executableTasks(definition,record,'manager','other'),[]);
});
test('state-machine task projection excludes self approval and unmet conditions',()=>{
 const record={createdBy:'creator',status:'submitted',data:{amount:10}};
 assert.deepEqual(executableTasks(definition,record,'viewer','other'),[]);
 assert.deepEqual(executableTasks(definition,record,'manager','creator'),[]);
 assert.equal(executableTasks(definition,record,'manager','other').length,1);
 record.data.amount=1;
 assert.deepEqual(executableTasks(definition,record,'manager','other'),[]);
});
