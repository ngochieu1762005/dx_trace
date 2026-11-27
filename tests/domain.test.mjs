/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/*
 * DX-TRACE | Stock, permissions and state transition tests
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File tests/domain.test.mjs
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
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,apply,available,insights} from '../lib/domain.mjs';
const now='2026-11-06T10:00:00.000Z';let i=0;
function run(s,cmd,b,role='owner'){return apply(s,cmd,b,{role,actor:'test',now,entity:'ID-'+(++i)}).state}
function setup(){let s=initial();s=run(s,'partner.create',{name:'Farm',kind:'supplier'});const supplier=s.partners[0].id;s=run(s,'partner.create',{name:'Shop',kind:'destination'});s=run(s,'lot.create',{code:'L1',product:'Milk',supplier,quantity:100,unit:'box',expiry:'2026-12-01',location:'A1',min_temp:2,max_temp:8});return s}
const ship=(s,quantity)=>run(s,'shipment.create',{lot:s.lots[0].id,destination:s.partners[0].id,quantity});
test('reserves stock and rejects overselling without changing original',()=>{const s=ship(setup(),60);assert.equal(available(s,s.lots[0]),40);assert.throws(()=>ship(s,41));assert.equal(s.shipments.length,1)});
test('cancel restores available stock and cannot be repeated',()=>{let s=ship(setup(),60);const id=s.shipments[0].id;s=run(s,'shipment.cancel',{id});assert.equal(available(s,s.lots[0]),100);assert.throws(()=>run(s,'shipment.cancel',{id}))});
test('viewer cannot mutate',()=>assert.throws(()=>run(setup(),'document.create',{title:'A',content:'B'},'viewer'),e=>e.status===403));
test('expired lot cannot be shipped',()=>{const s=setup();s.lots[0].expiry='2026-11-05';assert.throws(()=>ship(s,1));assert.ok(insights(s,Date.parse(now)).length)});
test('quarantine blocks delivery; recall cannot close before returns',()=>{let s=ship(setup(),10);const sh=s.shipments[0].id;s=run(s,'shipment.deliver',{id:sh});s=run(s,'incident.create',{lot:s.lots[0].id,reason:'Cold chain',severity:'high'});const incident=s.incidents[0].id;assert.throws(()=>ship(s,1));assert.throws(()=>run(s,'incident.approve',{id:incident},'warehouse'),e=>e.status===403);s=run(s,'incident.approve',{id:incident});assert.throws(()=>run(s,'incident.close',{id:incident}));s=run(s,'shipment.return',{id:sh});s=run(s,'incident.close',{id:incident});assert.equal(s.lots[0].status,'recall');assert.equal(available(s,s.lots[0]),90)});
test('invalid dates rejected',()=>{const s=setup();assert.throws(()=>run(s,'lot.create',{...s.lots[0],code:'L2',expiry:'2026-02-30'}))});
test('three consecutive sensor excursions create one incident; duplicates ignored',()=>{let s=setup();s=run(s,'device.create',{name:'Sensor',lot:s.lots[0].id});const device=s.devices[0].id;for(let n=0;n<3;n++)s=run(s,'sensor.ingest',{device,id:String(n),temperature:12,recorded:now},'device');assert.equal(s.incidents.length,1);s=run(s,'sensor.ingest',{device,id:'2',temperature:12,recorded:now},'device');assert.equal(s.readings.length,3);assert.equal(s.incidents.length,1)});
test('revoked device and old readings rejected',()=>{let s=setup();s=run(s,'device.create',{name:'Sensor',lot:s.lots[0].id});const device=s.devices[0].id;assert.throws(()=>run(s,'sensor.ingest',{device,id:'1',temperature:4,recorded:'2026-11-05T00:00:00Z'},'device'));s=run(s,'device.revoke',{id:device});assert.throws(()=>run(s,'sensor.ingest',{device,id:'2',temperature:4,recorded:now},'device'),e=>e.status===401)});
import {seedDemo} from '../lib/demo.mjs';
import {resolveScan} from '../lib/scan.mjs';
import {defaultWorkflow,advanceWorkflow} from '../lib/workflow.mjs';
test('demo is consistent and never overwrites existing data',()=>{const s=seedDemo(initial(),now);assert.equal(s.demo,true);assert.equal(s.lots.length,16);for(const l of s.lots)assert.ok(available(s,l)>=0);for(const sh of s.shipments){assert.ok(s.lots.find(l=>l.id===sh.lot));assert.ok(s.partners.find(p=>p.id===sh.destination))}assert.throws(()=>seedDemo(s,now))});
test('QR labels resolve to exact lots; external URL never navigates',()=>{const lots=[{id:'L1',code:'ABC',barcode:'12345678'}];assert.deepEqual(resolveScan('DXTRACE:LOT:L1',lots,'https://example.com'),{lot:'L1'});assert.deepEqual(resolveScan('https://example.com/#trace/L1',lots,'https://example.com'),{lot:'L1'});assert.ok(resolveScan('https://evil.example/#trace/L1',lots,'https://example.com').error);assert.ok(resolveScan('javascript:alert(1)',lots,'https://example.com').error)});
test('barcode multiple batches requires selection; unknown numeric permits lookup',()=>{assert.deepEqual(resolveScan('12345678',[{id:'A',barcode:'12345678'},{id:'B',barcode:'12345678'}],''),{query:'12345678'});assert.deepEqual(resolveScan('12345678',[],''),{barcode:'12345678'})});
test('generic workflow requires submission and manager approval',()=>{let r={status:'draft'};assert.throws(()=>advanceWorkflow(defaultWorkflow,r,'approved','owner'));r=advanceWorkflow(defaultWorkflow,r,'submitted','warehouse');assert.throws(()=>advanceWorkflow(defaultWorkflow,r,'approved','warehouse'));assert.equal(advanceWorkflow(defaultWorkflow,r,'approved','manager').status,'approved')});
test('second application persists workflow and audit using shared domain',()=>{let s=run(initial(),'workflow.create',{title:'Bổ sung cảm biến',content:'Kho lạnh A cần thiết bị mới.'},'warehouse');const id=s.workflowRuns[0].id;s=run(s,'workflow.transition',{id,target:'submitted'},'warehouse');s=run(s,'workflow.transition',{id,target:'approved'},'manager');assert.equal(s.workflowRuns[0].status,'approved');assert.equal(s.events.length,3)});
test('partial recalls track actual units across receipts and require full reconciliation',()=>{
 let s=ship(setup(),50);
 const shipment=s.shipments[0].id;
 s=run(s,'shipment.deliver',{id:shipment});
 s=run(s,'incident.create',{lot:s.lots[0].id,reason:'Recall',severity:'high'});
 const incident=s.incidents[0].id;
 s=run(s,'incident.approve',{id:incident});
 s=run(s,'shipment.return',{id:shipment,quantity:17});
 assert.equal(s.shipments[0].returnedQuantity,17);
 assert.equal(s.shipments[0].status,'delivered');
 assert.throws(()=>run(s,'incident.close',{id:incident}));
 assert.throws(()=>run(s,'shipment.return',{id:shipment,quantity:34}));
 s=run(s,'shipment.return',{id:shipment,quantity:33});
 assert.equal(s.shipments[0].status,'returned');
 assert.equal(run(s,'incident.close',{id:incident}).incidents[0].status,'closed');
});
