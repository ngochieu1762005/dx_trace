/* DX-TRACE | Writer scheduling regression. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {withWorkspace} from '../lib/workspace-queue.mjs';
test('same workspace serializes, separate workspace progresses, failure releases queue',async()=>{
 let release;const gate=new Promise(r=>release=r),events=[];
 const a=withWorkspace('a',async()=>{events.push('a1');await gate;throw Error('expected')});const rejected=assert.rejects(a,/expected/);
 const b=withWorkspace('a',async()=>events.push('a2'));
 await withWorkspace('b',async()=>events.push('b1'));assert.deepEqual(events,['a1','b1']);
 release();await rejected;await b;assert.deepEqual(events,['a1','b1','a2']);
 assert.equal(await withWorkspace('a',async()=>42),42);
});
test('queue refuses overload and recovers after draining',async()=>{
 let release;const gate=new Promise(r=>release=r);
 const pending=Array.from({length:100},()=>withWorkspace('busy',()=>gate));
 await assert.rejects(()=>withWorkspace('busy',async()=>{}),e=>e.status===503);
 release();await Promise.all(pending);assert.equal(await withWorkspace('busy',async()=>true),true);
});
