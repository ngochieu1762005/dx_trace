/* DX-TRACE | Executable parallel/timer process regression tests.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProcess,startProcess,completeProcessTask,tickProcess} from '../lib/process-runtime.mjs';
const now='2026-11-23T10:00:00.000Z';
const later='2026-11-23T11:00:01.000Z';
const definition={
 version:1,completeAs:'done',nodes:[
  {id:'start',type:'start'},
  {id:'prepare',type:'userTask',roles:['warehouse']},
  {id:'fork',type:'parallelFork'},
  {id:'quality',type:'userTask',roles:['manager'],differentActor:true,reasonRequired:true},
  {id:'wait',type:'timer',afterSeconds:3600},
  {id:'release',type:'userTask',roles:['owner'],reasonRequired:true},
  {id:'join',type:'parallelJoin'},
  {id:'finish',type:'end'}
 ],flows:[
  {from:'start',to:'prepare'},{from:'prepare',to:'fork'},
  {from:'fork',to:'quality'},{from:'fork',to:'wait'},
  {from:'quality',to:'join'},{from:'wait',to:'release'},
  {from:'release',to:'join'},{from:'join',to:'finish'}
 ]};
const input=(task,actor,role,at=now,reason='Verified')=>({
 task,actor,role,creator:'operator',reason,now:at
});
test('parallel branches wait for both human approvals and timer before completing',()=>{
 const p=validateProcess(definition);
 let s=startProcess(p,{now,actor:'operator'});
 assert.deepEqual(s.tokens.map(t=>t.node),['prepare']);
 assert.equal(s.revision,1);
 s=completeProcessTask(p,s,input('prepare','operator','warehouse'));
 assert.deepEqual(s.tokens.map(t=>t.node),['quality','wait']);
 assert.equal(s.tokens.find(t=>t.node==='wait').readyAt,'2026-11-23T11:00:00.000Z');
 assert.throws(()=>completeProcessTask(p,s,input('quality','operator','manager')), {status:403});
 assert.throws(()=>completeProcessTask(p,s,input('quality','supervisor','viewer')), {status:403});
 assert.throws(()=>completeProcessTask(p,s,input('quality','supervisor','manager',now,'')), {status:422});
 s=completeProcessTask(p,s,input('quality','supervisor','manager'));
 assert.equal(s.status,'running');
 assert.equal(s.joins.join,1);
 assert.deepEqual(s.tokens.map(t=>t.node),['wait']);
 const noop=tickProcess(p,s,{now});
 assert.equal(noop.changed,false);
 assert.deepEqual(noop.state,s);
 s=tickProcess(p,s,{now:later}).state;
 assert.deepEqual(s.tokens.map(t=>t.node),['release']);
 assert.throws(()=>completeProcessTask(p,s,input('release','operator','warehouse',later)),{status:403});
 s=completeProcessTask(p,s,input('release','owner','owner',later));
 assert.equal(s.status,'completed');
 assert.equal(s.completedAt,later);
 assert.equal(s.tokens.length,0);
 assert.deepEqual(s.joins,{});
 assert.equal(s.history.filter(h=>h.action==='complete').length,3);
 assert.throws(()=>completeProcessTask(p,s,input('quality','supervisor','manager',later)),{status:409});
});
test('durable JSON process state survives restart and protects stale task replay',()=>{
 const s=startProcess(definition,{now,actor:'operator'});
 const serialized=JSON.parse(JSON.stringify(s));
 const next=completeProcessTask(definition,serialized,input('prepare','operator','warehouse'));
 assert.deepEqual(s.tokens.map(t=>t.node),['prepare']);
 assert.equal(next.revision,2);
 assert.throws(()=>completeProcessTask(definition,next,input('prepare','operator','warehouse')),{status:409});
});
test('process validation rejects cycles, unsafe scripts, malformed splits, nested joins and bad policies',()=>{
 const invalid=[
  {...definition,nodes:definition.nodes.map(n=>n.id==='quality'?{...n,type:'scriptTask'}:n)},
  {...definition,flows:[...definition.flows,{from:'finish',to:'prepare'}]},
  {...definition,flows:definition.flows.filter(f=>f.from!=='fork'||f.to!=='wait')},
  {...definition,nodes:definition.nodes.map(n=>n.id==='quality'?{...n,roles:['admin']}:n)},
  {...definition,nodes:definition.nodes.map(n=>n.id==='wait'?{...n,afterSeconds:-1}:n)},
  {...definition,nodes:definition.nodes.map(n=>n.id==='release'?{...n,differentActor:'false'}:n)},
  {...definition,nodes:definition.nodes.map(n=>n.id==='release'?{...n,type:'parallelFork'}:n)}
 ];
 for(const p of invalid)assert.throws(()=>validateProcess(p),{status:422});
});
