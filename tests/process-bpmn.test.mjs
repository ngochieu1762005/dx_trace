/* DX-TRACE | Standard BPMN 2.0 XML export of executable parallel process.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {processToBpmn} from '../lib/process-bpmn.mjs';
const graph=JSON.parse(readFileSync(new URL('../examples/maintenance/process.parallel.json',import.meta.url),'utf8'));
test('export has parallel diverge/converge, ISO duration, user task policy and stable flow references',()=>{
 const xml=processToBpmn(graph,{modelId:'maintenance_parallel',name:'Chất lượng & bảo trì'});
 assert.match(xml,/xmlns:bpmn="http:\/\/www.omg.org\/spec\/BPMN\/20100524\/MODEL"/);
 assert.match(xml,/id="Process_maintenance_parallel"/);
 assert.match(xml,/<bpmn:parallelGateway id="fork" gatewayDirection="Diverging"/);
 assert.match(xml,/<bpmn:parallelGateway id="join" gatewayDirection="Converging"/);
 assert.match(xml,/PT60S<\/bpmn:timeDuration>/);
 assert.match(xml,/id="quality_review" name="quality_review" dx:roles="manager" dx:differentActor="true" dx:reasonRequired="true"/);
 assert.match(xml,/sourceRef="owner_signoff" targetRef="join"/);
 assert.equal(xml,processToBpmn(graph,{modelId:'maintenance_parallel',name:'Chất lượng & bảo trì'}));
});
test('BPMN export escapes XML model name and rejects invalid graph',()=>{
 const xml=processToBpmn(graph,{modelId:'maintenance_parallel',name:'R&D "A" < B'});
 assert.match(xml,/name="R&amp;D &quot;A&quot; &lt; B"/);
 assert.throws(()=>processToBpmn(graph,{modelId:'../pwned'}),/Invalid process model/);
 const invalid={...graph,nodes:graph.nodes.map(n=>n.id==='waiting_period'?{...n,afterSeconds:0}:n)};
 assert.throws(()=>processToBpmn(invalid),{status:422});
});
