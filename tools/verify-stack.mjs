/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT */
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const args=process.argv.slice(2);
const r=spawnSync('docker',['compose',...args,'config','--format','json'],{encoding:'utf8',maxBuffer:8*1024*1024});
if(r.status!==0)throw Error('Compose render failed; inspect locally without logging secrets');
const {services:s}=JSON.parse(r.stdout);
const net=name=>Object.keys(s[name].networks||{});
assert.match(s['gateway-api'].image,/^apache\/apisix:/);
assert.deepEqual(net('gateway-api').sort(),['appnet','privcore']);
assert.ok(net('core').includes('privcore')&&!net('core').includes('appnet'));
for(const name of ['core','gateway-api','flowable','workflow-db','quality-portal']){
 if(s[name])assert.ok(!(s[name].ports||[]).length,name+' must not publish ports');
}
if(s.flowable){
 assert.ok(net('flowable').includes('workflowdb')&&net('flowable').includes('workflowapi'));
 assert.ok(net('core').includes('coreworkflow')&&net('flowable').includes('coreworkflow')&&!net('core').includes('workflowapi')&&!net('app').includes('workflowapi')&&!net('app').includes('coreworkflow'));
}
assert.ok(typeof s.core.environment.DX_CORE_TOKEN==='string'&&s.core.environment.DX_CORE_TOKEN.length>=32&&typeof s['gateway-api'].environment.DX_GATEWAY_APP_TOKEN==='string'&&s['gateway-api'].environment.DX_GATEWAY_APP_TOKEN.length>=32&&s.core.environment.DX_CORE_TOKEN!==s['gateway-api'].environment.DX_GATEWAY_APP_TOKEN,'Credentials must be distinct and strong');
assert.equal(s.app.environment.DX_CORE_URL,'http://gateway-api:8082');
console.log('PASS desired-state gateway, service network isolation, port policy and credential separation (values hidden)');
