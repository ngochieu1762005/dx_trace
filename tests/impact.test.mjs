/*
 * DX-TRACE | Partial-return reconciliation tests
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File tests/impact.test.mjs
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {recallImpact} from '../lib/impact.mjs';
test('impact reconciles partial and legacy returns, excludes other lots and cancelled shipments',()=>{
 const state={lots:[{id:'a',unit:'hộp'}],partners:[],shipments:[
 ['a','p','delivered',50,17],['a','p','reserved',20,0],['a','q','returned',30,undefined],
 ['a','q','cancelled',100,0],['other','q','delivered',1000,0]
 ].map(([lot,destination,status,quantity,returnedQuantity],i)=>({id:String(i),lot,destination,status,quantity,returnedQuantity}))};
 const result=recallImpact(state,'a');assert.deepEqual(result.total,{sent:80,received:47,outstanding:33,reserved:20});
 assert.equal(result.destinations[0].id,'p');assert.equal(result.destinations[0].receipts.length,2);
 assert.equal(result.fullyReconciled,false);assert.equal(recallImpact(state,'other'),null);
});
