/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Durable, deterministic token-based process engine.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors.
 *
 * Restricted executable BPMN control-flow subset: start, userTask,
 * parallel fork/join, intermediate relative timer, end.
 * Deliberately excludes script execution, loops, nested forks, service tasks
 * and cron. All human completions stay within workspace transaction + RBAC.
 */
import {PlatformError} from './platform.mjs';
const bad=(msg,status=422)=>{throw new PlatformError('Process: '+msg,status);};
const ID=/^[a-z][a-z0-9_]{0,39}$/;
const TYPES=new Set(['start','userTask','parallelFork','parallelJoin','timer','end']);
const ROLES=new Set(['owner','manager','warehouse','viewer']);
const MAX_NODES=40;
const fieldKeys=(obj,keys)=>Object.keys(obj).every(k=>keys.includes(k));
const validISO=(value)=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;

export function validateProcess(input,readRoles=['owner','manager','warehouse','viewer']){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1||
    !Array.isArray(input.nodes)||!Array.isArray(input.flows)||
    input.nodes.length<3||input.nodes.length>MAX_NODES||input.flows.length<2||input.flows.length>70||
    !ID.test(input.completeAs||'')||!fieldKeys(input,['version','nodes','flows','completeAs']))
    bad('invalid process definition');
 const nodes=new Map();
 for(const node of input.nodes){
  if(!node||typeof node!=='object'||!ID.test(node.id||'')||!TYPES.has(node.type)||
    nodes.has(node.id))bad('invalid or duplicated node');
  if(node.type==='userTask'){
   if(!fieldKeys(node,['id','type','roles','differentActor','reasonRequired'])||
      !Array.isArray(node.roles)||!node.roles.length||new Set(node.roles).size!==node.roles.length||
      node.roles.some(v=>!ROLES.has(v)||!readRoles.includes(v))||
      ['differentActor','reasonRequired'].some(k=>node[k]!==undefined&&typeof node[k]!=='boolean'))
      bad('invalid user task policy');
  }else if(node.type==='timer'){
   if(!fieldKeys(node,['id','type','afterSeconds'])||!Number.isSafeInteger(node.afterSeconds)||
      node.afterSeconds<1||node.afterSeconds>31536000)bad('invalid timer duration');
  }else if(!fieldKeys(node,['id','type']))bad('unsupported node attributes');
  nodes.set(node.id,node);
 }
 const starts=[...nodes.values()].filter(n=>n.type==='start'),
       ends=[...nodes.values()].filter(n=>n.type==='end'),
       forks=[...nodes.values()].filter(n=>n.type==='parallelFork'),
       joins=[...nodes.values()].filter(n=>n.type==='parallelJoin');
 if(starts.length!==1||ends.length!==1||forks.length!==joins.length||forks.length>1)
   bad('requires one start/end and at most one matched parallel fork/join');
 const incoming=new Map([...nodes.keys()].map(k=>[k,[]]));
 const outgoing=new Map([...nodes.keys()].map(k=>[k,[]]));
 const seen=new Set();
 for(const flow of input.flows){
  if(!flow||!fieldKeys(flow,['from','to'])||!nodes.has(flow.from)||!nodes.has(flow.to)||
      flow.from===flow.to||seen.has(flow.from+':'+flow.to))bad('invalid flow');
  seen.add(flow.from+':'+flow.to);
  outgoing.get(flow.from).push(flow.to);incoming.get(flow.to).push(flow.from);
 }
 for(const node of nodes.values()){
  const i=incoming.get(node.id).length,o=outgoing.get(node.id).length;
  if(node.type==='start'&&(i!==0||o!==1)||
     node.type==='end'&&(o!==0||i!==1)||
     node.type==='parallelFork'&&(i!==1||o<2||o>5)||
     node.type==='parallelJoin'&&(i<2||i>5||o!==1)||
     ['userTask','timer'].includes(node.type)&&(i!==1||o!==1))
    bad('invalid node degree: '+node.id);
 }
 if(forks.length&&outgoing.get(forks[0].id).length!==incoming.get(joins[0].id).length)
   bad('parallel split/join branch counts differ');
 // Reject cycles, unreachable nodes and dead ends before starting work.
 const pending=new Map([...nodes.keys()].map(id=>[id,incoming.get(id).length]));
 const queue=[starts[0].id],ordered=[];
 while(queue.length){
  const current=queue.shift();ordered.push(current);
  for(const target of outgoing.get(current)){
   pending.set(target,pending.get(target)-1);
   if(pending.get(target)===0)queue.push(target);
  }
 }
 if(ordered.length!==nodes.size||ordered.at(-1)!==ends[0].id)
   bad('process must be a fully reachable DAG ending in end');
 if(forks.length){
  const fork=forks[0].id,join=joins[0].id,branches=outgoing.get(fork),encountered=new Set();
  for(const branch of branches){
   let cursor=branch,steps=0;
   while(cursor!==join){
    if(++steps>MAX_NODES||encountered.has(cursor)||cursor===fork||
       nodes.get(cursor).type==='end'||outgoing.get(cursor).length!==1)
      bad('parallel branches must be disjoint and meet at their join');
    encountered.add(cursor);
    cursor=outgoing.get(cursor)[0];
   }
  }
  if(incoming.get(join).some(id=>!encountered.has(id)))bad('unexpected join predecessor');
 }
 return structuredClone(input);
}
const iso=(date)=>new Date(date).toISOString();
function evaluate(def,state,now){
 const nodes=new Map(def.nodes.map(n=>[n.id,n]));
 const next=new Map(def.flows.map(f=>[f.from,[]]));
 const incoming=new Map(def.nodes.map(n=>[n.id,0]));
 for(const flow of def.flows){next.get(flow.from).push(flow.to);incoming.set(flow.to,incoming.get(flow.to)+1);}
 const enqueue=(node)=>state.tokens.push({id:'token'+state.nextId++,node});
 let steps=0,changed=false;
 while(true){
  const index=state.tokens.findIndex(t=>nodes.get(t.node).type!=='userTask'&&
    (nodes.get(t.node).type!=='timer'||!t.readyAt||t.readyAt<=now));
  if(index===-1)break;
  if(++steps>200)bad('automatic transition budget exceeded',409);
  const token=state.tokens.splice(index,1)[0],n=nodes.get(token.node);
  changed=true;
  if(n.type==='start'||n.type==='parallelJoin'){
   if(n.type==='parallelJoin'){
    const count=(state.joins[n.id]||0)+1;
    if(count>incoming.get(n.id))bad('join overrun',409);
    state.joins[n.id]=count;
    if(count<incoming.get(n.id))continue;
    delete state.joins[n.id];
   }
   enqueue(next.get(n.id)[0]);
  }else if(n.type==='parallelFork'){
   for(const dest of next.get(n.id))enqueue(dest);
  }else if(n.type==='timer'){
   if(!token.readyAt){
    token.readyAt=iso(Date.parse(now)+n.afterSeconds*1000);
    state.tokens.push(token);
   }else enqueue(next.get(n.id)[0]);
  }else if(n.type==='end'){
   state.completedAt=now;
  }else bad('unexpected automatic node');
 }
 if(state.completedAt){
  if(state.tokens.length||Object.keys(state.joins).length)bad('end before parallel branch completion',409);
  state.status='completed';
 }
 return changed;
}
export function startProcess(input,{now,actor}){
 const def=validateProcess(input);
 if(!validISO(now)||typeof actor!=='string'||!actor)bad('verified actor and timestamp required');
 const start=def.nodes.find(n=>n.type==='start');
 const state={revision:1,status:'running',nextId:2,tokens:[{id:'token1',node:start.id}],
  joins:{},history:[{action:'start',actor,created:now}],completedAt:null};
 evaluate(def,state,now);
 return state;
}
export function completeProcessTask(input,instance,{task,actor,role,creator,reason,now}){
 const def=validateProcess(input);
 if(!validISO(now)||!ID.test(task||'')||!actor||!role)bad('task or actor is invalid');
 if(instance?.status!=='running')bad('process is not running',409);
 const node=def.nodes.find(n=>n.id===task);
 if(!node||node.type!=='userTask')bad('not an executable user task',404);
 if(!node.roles.includes(role))bad('role cannot complete this task',403);
 if(node.differentActor&&creator===actor)bad('creator cannot self approve',403);
 if(node.reasonRequired&&(typeof reason!=='string'||!reason.trim()||reason.length>2000))
   bad('reason is mandatory');
 if(reason!==undefined&&(typeof reason!=='string'||reason.length>2000))bad('invalid reason');
 const index=instance.tokens.findIndex(t=>t.node===task);
 if(index<0)bad('task not currently active',409);
 const next=def.flows.find(f=>f.from===task);
 const state=structuredClone(instance);
 state.tokens.splice(index,1);
 state.tokens.push({id:'token'+state.nextId++,node:next.to});
 state.history.push({action:'complete',task,actor,role,reason:reason||'',created:now});
 if(state.history.length>200)bad('process history limit reached',409);
 evaluate(def,state,now);
 state.revision++;
 return state;
}
export function tickProcess(input,instance,{now}){
 const def=validateProcess(input);
 if(!validISO(now))bad('trusted timestamp required');
 if(instance?.status!=='running')bad('process is not running',409);
 const state=structuredClone(instance);
 const changed=evaluate(def,state,now);
 if(changed){state.revision++;state.history.push({action:'timer_tick',created:now});}
 return {state,changed};
}
