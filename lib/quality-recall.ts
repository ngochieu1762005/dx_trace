/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {change,read,hash} from './server.ts';
import {nativeReview,nativeReviewEvidence} from './native-review.ts';
import {PlatformError} from './platform.mjs';

export async function qualityRecall(c:any,req:Request,key:string,action:string){
 if(!['owner','manager','warehouse'].includes(c.role))throw new PlatformError('Recall access denied',403);
 const report=req.method==='POST'&&key==='start'&&!action;
 if(report){
   if(!process.env.DX_FLOWABLE_URL)throw new PlatformError('Enable the Flowable overlay before reporting',503);
   const idem=req.headers.get('idempotency-key');
   if(!idem||idem.length>100)throw new PlatformError('Idempotency-Key required',400);
   const body=await req.json(), ticket=await hash(JSON.stringify([c.workspace,c.id,idem]));
   const result=await change(c,'quality.failure',{lot:body.lot,reason:body.reason,severity:body.severity,
     reporter:c.id,ticket},'report-'+ticket);
   key=result.id;
 }
 const incident=(await read(c.workspace)).data.incidents.find((i:any)=>i.id===key&&i.review);
 if(!incident)throw new PlatformError('Recall case not found',404);
 const review=incident.review;
 if(req.method==='GET'&&!action){
   return {incident:key,lot:incident.lot,outcome:review.outcome,
     workflow:review.instance?await nativeReview(c,req,review.instance,''):null};
 }
 if(req.method!=='POST'||(!report&&!['complete','sync'].includes(action)))throw new PlatformError('Unknown recall action',404);
 const internal=(body:any)=>new Request(req.url,{method:'POST',headers:{'idempotency-key':review.ticket},body:JSON.stringify(body)});
 let workflow;
 if(!review.instance){
   if(action==='complete')throw new PlatformError('Start or sync the workflow first',409);
   workflow=await nativeReview(c,internal({reference:key}),'start','',{incident:key,reporter:review.reporter});
   await change(c,'quality.bind',{id:key,instance:workflow.id},'bind-'+review.ticket);
 }else if(action==='complete'){
   workflow=await nativeReview(c,req,review.instance,'complete');
 }else{
   workflow=await nativeReview(c,new Request(req.url),review.instance,'');
 }
 if(workflow.status==='ended'){
   if(!['accepted','rejected'].includes(workflow.outcome))throw new PlatformError('Unknown engine outcome; lot held for reconciliation',409);
   if(!review.outcome){
    const captured=await nativeReviewEvidence(c,workflow.id);
    const workflowEvidence={workflow:{id:captured.definition.key,version:String(captured.definition.version),bpmn:captured.bpmn,
     instanceId:captured.instanceId,engine:captured.engine,provenance:'Deployed Flowable resource and persisted engine history at projection'},
     history:captured,decisions:captured.decisions,policy:captured.policy};
    await change(c,'quality.project',{id:key,instance:workflow.id,outcome:workflow.outcome},'project-'+review.ticket,{workflowEvidence});
   }
 }
 return {incident:key,lot:incident.lot,workflow};
}
