/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Durable timer poller tests.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {scanDueTimers} from '../selfhost/process-timer.mjs';
test('timer poller only advances eligible due process and uses versioned idempotency',async()=>{
 const calls=[],errors=[],now='2026-11-23T10:00:00.000Z';
 const records=[
  {workspace:'ws',model:'maintenance',id:'REC-1',payload:JSON.stringify({version:3,process:{status:'running',tokens:[{node:'timer',readyAt:'2026-11-23T09:59:59.000Z'}]}})},
  {workspace:'ws',model:'maintenance',id:'REC-2',payload:JSON.stringify({version:7,process:{status:'running',tokens:[{node:'timer',readyAt:'2026-11-23T11:00:00.000Z'}]}})},
  {workspace:'ws',model:'maintenance',id:'REC-3',payload:JSON.stringify({version:4,process:{status:'completed',tokens:[{node:'timer',readyAt:'2026-11-23T09:00:00.000Z'}]}})}
 ];
 const stat=await scanDueTimers({now,select:async(date,limit)=>{assert.equal(date,now);assert.equal(limit,25);return records;},
  apply:async(workspace,b,key)=>calls.push({workspace,b,key}),logger:{error:(...args)=>errors.push(args)}});
 assert.deepEqual(stat,{due:3,advanced:1,failed:0,skipped:2});
 assert.deepEqual(calls,[{workspace:'ws',b:{model:'maintenance',id:'REC-1',version:3},key:'process-timer:maintenance:REC-1:3'}]);
 assert.equal(errors.length,0);
});
test('one rejected timer command does not block another record',async()=>{
 const messages=[];
 const data=['R1','R2'].map(id=>({workspace:'w',model:'m',id,payload:JSON.stringify({
  version:1,process:{status:'running',tokens:[{readyAt:'2026-11-23T08:00:00.000Z'}]}})}));
 const x=await scanDueTimers({now:'2026-11-23T10:00:00.000Z',select:async()=>data,
  apply:async(w,b)=>{if(b.id==='R1')throw Object.assign(Error('rejected'),{status:409});},
  logger:{error:(text,detail)=>messages.push({text,detail})}});
 assert.deepEqual(x,{due:2,advanced:1,failed:1,skipped:0});
 assert.equal(messages[0].detail.code,409);
});
