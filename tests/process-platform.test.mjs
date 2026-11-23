/* DX-TRACE | Process engine integrated into transactional platform records.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateModel,applyPlatform,planModel} from '../lib/platform.mjs';
const base=JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url),'utf8'));
const process={
 version:1,completeAs:'done',
 nodes:[
  {id:'start',type:'start'}, {id:'prepare',type:'userTask',roles:['warehouse']},
  {id:'fork',type:'parallelFork'},
  {id:'approve',type:'userTask',roles:['manager'],differentActor:true,reasonRequired:true},
  {id:'delay',type:'timer',afterSeconds:10},
  {id:'inspect',type:'userTask',roles:['owner']},
  {id:'join',type:'parallelJoin'}, {id:'end',type:'end'}
 ],
 flows:[
  {from:'start',to:'prepare'},{from:'prepare',to:'fork'},
  {from:'fork',to:'approve'},{from:'fork',to:'delay'},
  {from:'approve',to:'join'},{from:'delay',to:'inspect'},
  {from:'inspect',to:'join'},{from:'join',to:'end'}
 ]
};
const definition={...base,orchestration:process};
const time='2026-11-23T10:00:00.000Z';
const ctx=(role,actor,now=time)=>({role,actor,now,entity:'REC-test'});
const update=(state,command,b,role,actor,now=time)=>applyPlatform(state,command,{model:'maintenance',id:'REC-test',...b},ctx(role,actor,now));
test('persisted parallel process requires distinct reviewer and fires timer only when due',()=>{
 const state={};
 applyPlatform(state,'platform.apply',{definition,baseVersion:0},ctx('owner','owner'));
 applyPlatform(state,'platform.create',{model:'maintenance',data:{
  equipment:'Pump',description:'Safety check',priority:'Khẩn cấp'
 }},ctx('warehouse','operator'));
 assert.equal(state.records[0].process.tokens[0].node,'prepare');
 assert.throws(()=>update(state,'platform.transition',{version:1,target:'submitted'},'warehouse','operator'),{status:409});
 update(state,'platform.process.complete',{version:1,task:'prepare'},'warehouse','operator');
 assert.equal(state.records[0].process.tokens.length,2);
 assert.throws(()=>update(state,'platform.process.complete',{version:2,task:'approve',reason:'ok'},'manager','operator'),{status:403});
 update(state,'platform.process.complete',{version:2,task:'approve',reason:'Safety approved'},'manager','reviewer');
 assert.equal(state.records[0].process.status,'running');
 assert.ok(planModel(state,{...definition,orchestration:undefined}).rejections.some(s=>s.includes('orchestration')));
 assert.throws(()=>update(state,'platform.process.tick',{version:3},'warehouse','operator'),{status:403});
 update(state,'platform.process.tick',{version:3},'owner','owner');
 assert.equal(state.records[0].process.status,'running');
 update(state,'platform.process.tick',{version:4},'owner','owner','2026-11-23T10:00:11.000Z');
 assert.deepEqual(state.records[0].process.tokens.map(t=>t.node),['inspect']);
 update(state,'platform.process.complete',{version:5,task:'inspect'},'owner','owner','2026-11-23T10:00:11.000Z');
 assert.equal(state.records[0].status,'done');
 assert.equal(state.records[0].process.status,'completed');
 assert.equal(state.records[0].version,6);
 assert.equal(state.records[0].history.filter(e=>e.action==='process.task').length,3);
});
test('process model validates terminal state and read-role assignment',()=>{
 assert.equal(validateModel(definition).orchestration.completeAs,'done');
 assert.throws(()=>validateModel({...definition,orchestration:{...process,completeAs:'approved'}}),{status:422});
 assert.throws(()=>validateModel({...definition,orchestration:{...process,nodes:process.nodes.map(n=>
  n.id==='approve'?{...n,roles:['viewer']}:n)}}),{status:422});
});
