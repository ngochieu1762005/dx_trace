/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Synthetic browser evidence demonstration.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
const encoder=new TextEncoder();
const bytes=value=>encoder.encode(typeof value==='string'?value:JSON.stringify(value));
const hex=value=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',bytes(value)));
const eventHash=event=>digest(event.previous+'\n'+event.seq+'\n'+event.payload);

/** Fixture only: these assertions are invented, never loaded from a workspace. */
export async function createEvidenceDemo(){
 const key=await crypto.subtle.generateKey({name:'Ed25519'},false,['sign','verify']);
 const policy={id:'recall-policy',version:'demo-1',allowedRoles:['manager'],synthetic:true};
 const workflow='<definitions id="synthetic-demo-1"><process id="recall-demo-1"/></definitions>';
 const lineage={source:'synthetic-inspection',inspectionId:'QC-DEMO-001',result:'failed',temperature:12.4,synthetic:true};
 const decision={id:'RC-2026-001',synthetic:true,actor:'Quản lý minh họa',role:'manager',policyVersion:'demo-1',workflowVersion:'recall-demo-1',before:'quarantine',after:'recall',lineageHash:await digest(lineage)};
 const first={seq:1,previous:'0'.repeat(64),payload:JSON.stringify({type:'inspection',result:'failed',synthetic:true})};
 const event={...first,hash:await eventHash(first)};
 const files={'decision.json':JSON.stringify(decision),'policy.json':JSON.stringify(policy),'workflow.bpmn':workflow,'data-lineage.json':JSON.stringify(lineage),'events.jsonl':JSON.stringify(event)+'\n'};
 const hashes=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,content])=>[name,await digest(content)])));
 const manifest=JSON.stringify({schema:'dxtrace.browser-demo.v1',synthetic:true,files:hashes});
 const signature=await crypto.subtle.sign('Ed25519',key.privateKey,bytes(manifest));
 // The trusted key is retained separately in this tab. It is not read from files.
 return {files,manifest,signature,trustedKey:key.publicKey};
}

export function tamperEvidenceDemo(fixture){
 const files={...fixture.files};
 const lineage=JSON.parse(files['data-lineage.json']);lineage.result='passed';
 files['data-lineage.json']=JSON.stringify(lineage);
 const event=JSON.parse(files['events.jsonl']);
 const payload=JSON.parse(event.payload);payload.result='passed';event.payload=JSON.stringify(payload);
 files['events.jsonl']=JSON.stringify(event)+'\n';
 return {...fixture,files};
}

export async function verifyEvidenceDemo(fixture){
 const {files}=fixture,manifest=JSON.parse(fixture.manifest);
 const decision=JSON.parse(files['decision.json']),policy=JSON.parse(files['policy.json']);
 const manifestMatches=(await Promise.all(Object.entries(manifest.files).map(async([name,hash])=>await digest(files[name])===hash))).every(Boolean);
 const events=files['events.jsonl'].trim().split('\n').map(row=>JSON.parse(row));
 let previous='0'.repeat(64),chain=events.length>0;
 for(let i=0;i<events.length;i++){
  const event=events[i];chain=chain&&event.seq===i+1&&event.previous===previous&&event.hash===await eventHash(event);previous=event.hash;
 }
 const checks=[
  {id:'manifest',label:'Manifest integrity',valid:manifestMatches},
  {id:'workflow',label:'Workflow version',valid:files['workflow.bpmn'].includes('id="'+decision.workflowVersion+'"')&&await digest(files['workflow.bpmn'])===manifest.files['workflow.bpmn']},
  {id:'policy',label:'Policy version',valid:decision.policyVersion===policy.version&&policy.allowedRoles.includes(decision.role)&&await digest(files['policy.json'])===manifest.files['policy.json']},
  {id:'events',label:'Event hash chain',valid:chain},
  {id:'lineage',label:'Data lineage',valid:await digest(files['data-lineage.json'])===decision.lineageHash},
  {id:'signature',label:'Digital signature',valid:await crypto.subtle.verify('Ed25519',fixture.trustedKey,fixture.signature,bytes(fixture.manifest))}
 ];
 return {valid:checks.every(check=>check.valid),checks};
}
