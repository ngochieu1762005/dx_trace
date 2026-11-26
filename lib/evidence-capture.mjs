/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {readFileSync,statSync} from 'node:fs';
import {createHash,createPrivateKey,createPublicKey} from 'node:crypto';
import {DomainError} from './domain.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const domainSource=readFileSync(new URL('./domain.mjs',import.meta.url));
const implementationSources=Object.fromEntries(['domain.mjs','server.ts','quality-bridge.ts','quality-recall.ts','native-review.ts','evidence-capture.mjs'].map(name=>
 ['lib/'+name,sha(readFileSync(new URL('./'+name,import.meta.url)))]));
const warehouseBpmn=readFileSync(new URL('../selfhost/flowable/warehouse-decision.bpmn',import.meta.url),'utf8');
const supported=new Set(['incident.create','incident.approve','incident.close','quality.failure','quality.project','quality.escalate','sensor.ingest']);
const permittedTransitions={
 'incident.create':[{from:'absent',to:'pending'}],
 'quality.failure':[{from:'absent',to:'pending'}],
 'sensor.ingest':[{from:'absent',to:'pending'}],
 'incident.approve':[{from:'pending',to:'approved'}],
 'incident.close':[{from:'approved',to:'closed'}],
 'quality.project':[{from:'pending',to:'approved'},{from:'pending',to:'review-rejected'}],
 'quality.escalate':[{from:'rejected-unlinked',to:'rejected-linked'}]
};

export function evidenceSigner(config=process.env) {
 if(!config.DX_EVIDENCE_PRIVATE_KEY_FILE)return null;
 try {
  if(statSync(config.DX_EVIDENCE_PRIVATE_KEY_FILE).size>16384)throw Error('Key too large');
  const privateKey=createPrivateKey(readFileSync(config.DX_EVIDENCE_PRIVATE_KEY_FILE));
  if(privateKey.asymmetricKeyType!=='ed25519')throw Error('Expected Ed25519');
  const publicKey=createPublicKey(privateKey);
  return {privateKey,publicKey:publicKey.export({format:'pem',type:'spki'}).toString(),
   keyId:sha(publicKey.export({format:'der',type:'spki'}))};
 }catch{throw new DomainError('Khóa ký Evidence phải là tệp Ed25519 hợp lệ; quyết định chưa được ghi',503);}
}

/** Capture the source records that actually existed at the guarded state transition. */
export function decisionSnapshot({context:c,command,body,before,after,result,seq,created,eventEntity=result.id,workflowEvidence,extraSources=[]}) {
 if(!supported.has(command))return null;
 let incident=after.incidents.find(i=>i.id===result.id);
 if(command==='sensor.ingest'){
  incident=after.incidents.find(i=>!before.incidents.some(old=>old.id===i.id));
  if(!incident)return null; // Routine telemetry remains in sensor_history.
 }
 if(!incident)return null;
 const lot=after.lots.find(l=>l.id===incident.lot),oldLot=before.lots.find(l=>l.id===incident.lot);
 const oldIncident=before.incidents.find(i=>i.id===incident.id);
 const sources=[
  {id:'lot-before',kind:'warehouse-record',origin:'workspaces.state/lots/'+lot.id,data:oldLot},
  {id:'incident-before',kind:'warehouse-record',origin:'workspaces.state/incidents/'+incident.id,data:oldIncident||null},
  {id:'command-input',kind:'authorized-command',origin:'DX-TRACE Core/'+command,data:body},
  ...extraSources
 ];
 if(command==='sensor.ingest'){
  const device=after.devices.find(d=>d.id===body.device);
  sources.push({id:'sensor-device',kind:'registered-device',origin:'workspaces.state/devices/'+device.id,data:device});
  sources.push({id:'temperature-window',kind:'sensor-observations',origin:'sensor_history/'+device.id,
   data:after.readings.filter(r=>r.device===device.id&&Date.parse(created)-Date.parse(r.recorded)<600000).slice(0,3)});
 }
 if(command==='incident.close')sources.push({id:'shipments-at-close',kind:'warehouse-records',origin:'workspaces.state/shipments',data:before.shipments.filter(s=>s.lot===lot.id)});
 const auditedActor=c.email||c.name||c.id;
 const role=c.role;
 const allowedRoles=command==='sensor.ingest'?['device']:
  ['incident.approve','incident.close','quality.escalate'].includes(command)?['owner','manager']:['owner','manager','warehouse'];
 let workflow={id:'dxtrace_warehouse_decision_v1',version:'1.0.0',bpmn:warehouseBpmn,engine:'DX-TRACE domain rules',
  provenance:'Documentary BPMN of code-defined rules; not execution by a BPMN engine'};
 if(workflowEvidence){
  workflow=workflowEvidence.workflow;
  sources.push({id:'flowable-history',kind:'workflow-engine-history',origin:'Flowable/history/'+workflow.instanceId,data:workflowEvidence.history});
  sources.push({id:'reviewer-decisions',kind:'authorized-review-intents',origin:'native_review_actions/'+workflow.instanceId,data:workflowEvidence.decisions});
 }
 const decision={
  id:'decision-'+seq,workspace:c.workspace,type:command,occurredAt:created,eventSequence:seq,eventEntity,
  identity:{subject:c.id||'device:'+c.name,role,auditActor:auditedActor,
   provider:role==='device'?'workspace-scoped device credential':'authenticated Core request',
   ...(command==='quality.project'?{purpose:'Projection of a completed Flowable outcome; approvers are in reviewer-decisions'}:{})},
  authorization:{allowed:true,permission:command,workspace:c.workspace,method:'Server-side role and workspace checks'},
  transition:command==='quality.escalate'
   ?{entityType:'quality-record',entityId:eventEntity,before:'rejected-unlinked',after:'rejected-linked'}
   :{entityType:'incident',entityId:incident.id,before:oldIncident?.status||'absent',after:incident.status},
  effects:{lot:{id:lot.id,before:oldLot.status,after:lot.status}},
  ...(incident.review?{review:{...incident.review}}:{}),
  simulated:!!before.demo||incident.synthetic===true||body.synthetic===true,
  limits:['Signature attests to recorded inputs and authorized transition; it does not establish sensor calibration, human intent, or a trusted wall-clock timestamp.']
 };
 const policy={id:'dxtrace.warehouse.'+command,version:'1.0.0',action:command,allowedRoles,
  ...(workflowEvidence?{review:workflowEvidence.policy}:{}),
  implementation:{path:command==='quality.escalate'?'lib/quality-bridge.ts':'lib/domain.mjs',
   sha256:command==='quality.escalate'?implementationSources['lib/quality-bridge.ts']:sha(domainSource),sources:implementationSources},
  transitions:permittedTransitions[command],
  conditions:{workspace:c.workspace,lot:lot.id,quarantineBlocksOutbound:true,
   ...(command==='sensor.ingest'?{consecutiveSamples:3,windowSeconds:600,minTemperature:lot.min_temp,maxTemperature:lot.max_temp}:{}),
   ...(command==='quality.project'?{engine:'Flowable',instanceId:incident.review.instance,outcome:incident.review.outcome,historyRequired:true}:{})}};
 return {decision,policy,workflow,lineage:{kind:'captured-at-decision',workspace:c.workspace,capturedAt:created,sources},subjectId:lot.id};
}
