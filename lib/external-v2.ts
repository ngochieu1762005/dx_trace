/* SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors */
import {getSessionUser} from '../selfhost/runtime.mjs';
import {q,ctx,memberArea} from './server.ts';
import {models,queryRecords,changePlatform} from './platform-store.ts';
import {PlatformError,platformView,modelOpenApi} from './platform.mjs';
import {executableTasks} from './task-view.mjs';
import {portalLinks} from './package-store.ts';
import {listedApplication} from './appkit.mjs';
const fail=(message:string,status=422):never=>{throw new PlatformError(message,status)};
const json=(data:any)=>Response.json(data,{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const modelId=/^[a-z][a-z0-9_]{0,39}$/;
const recordId=/^REC-[a-f0-9-]{36}$/;
const keys=(value:any,allowed:string[])=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k));
export async function externalV2(req:Request,legacy=false){
 const url=new URL(req.url),parts=url.pathname.split('/').slice(3);
 if(req.method!=='GET'&&(req.headers.get('sec-fetch-site')==='cross-site'||req.headers.get('origin')&&req.headers.get('origin')!==url.origin))fail('Invalid origin',403);
 if(legacy && (req.method!=='GET'||parts.length!==3||parts[0]!=='models'||parts[2]!=='records'))fail('Unknown route',404);
 const bound=!legacy||url.searchParams.has('workspace');
 async function boundContext(){
 const user=await getSessionUser();
 if(!user)fail('Authentication required',401);
 const member=await q('SELECT * FROM members WHERE id=?',user.userId).first();
 if(!member||member.role==='disabled'||member.workspace!==url.searchParams.get('workspace')||
    member.email.toLowerCase()!==user.email.toLowerCase())fail('Explicit workspace membership required',403);
 return memberArea(member,req);
 }
 const c=bound?await boundContext():await ctx(req);
 const visible=(await models(c)).filter((m:any)=>m.definition.permissions.read.includes(c.role));
 if(parts.length===1&&parts[0]==='apps'&&req.method==='GET'){
  const allowed=(url.searchParams.get('models')||'').split(',');
  if(allowed.length>100||allowed.some(id=>!modelId.test(id)))fail('Invalid model allowlist');
  return json({applications:visible.filter((m:any)=>allowed.includes(m.id)).map(listedApplication)});
 }
 const [resource,model,kind,id,action]=parts;
 if(resource!=='models'||!modelId.test(model||'')||parts.length>5)fail('Unknown route',404);
 const m=visible.find((item:any)=>item.id===model);
 if(!m)fail('Model not found',404);
 if(kind==='schema'&&parts.length===3&&req.method==='GET'){
  const source=modelOpenApi(m.definition);
  const base='/v2/models/'+model;
  const internal='/api/models/'+model;
  const transition=structuredClone(source.paths[internal+'/transition'].post);
  const schema=transition.requestBody.content['application/json'].schema;
  delete schema.properties.id;schema.required=schema.required.filter((k:string)=>k!=='id');
  transition.parameters.push({name:'id',in:'path',required:true,schema:{type:'string'}});
  return json({model,version:m.version,definition:m.definition,openapi:{
   ...source,info:{title:m.definition.name,version:'2',description:'OAuth bearer token and registered client model/workspace ACL. Write operations require Idempotency-Key.'},
   components:{...source.components,securitySchemes:{bearer:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}},
   security:[{bearer:[]}],paths:{[base+'/records']:source.paths[internal+'/records'],
    [base+'/records/{id}']:{get:{parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],responses:{200:{description:'Visible record'},404:{description:'Not found'}}}},
    [base+'/records/{id}/transition']:{post:transition}}
  }});
 }
 if(kind!=='records'||id&&!recordId.test(id))fail('Unknown route',404);
 if(req.method==='GET'&&parts.length===3){
  const params=new URLSearchParams(url.search);params.set('model',model);
  const view=await queryRecords(c,params);
  if(legacy){
   const models=view.models.filter((item:any)=>item.id===model);
   return json({models,records:view.records,summary:view.summary,page:view.page,portals:portalLinks(c,models)});
  }
  return json({records:view.records,summary:view.summary,page:view.page});
 }
 const findRecord=async()=>{
  const row=await q('SELECT payload FROM platform_records WHERE workspace=? AND model=? AND id=?',c.workspace,model,id).first();
  const view=platformView({models:[m],records:row?[JSON.parse(row.payload)]:[]},{role:c.role,actor:c.email||c.name,now:new Date().toISOString()});
  if(!view.records.length)fail('Record not found',404);
  return view.records[0];
 };
 if(req.method==='GET'&&parts.length===5){
  const record=await findRecord();
  if(action==='tasks')return json({tasks:executableTasks(m.definition,record,c.role,c.email||c.name)});
  if(action==='evidence'){
   if(!['owner','manager'].includes(c.role))fail('Management role required',403);
   const rows=(await q(`SELECT e.id,e.occurred_at,e.signing_status,e.checkpoint FROM evidence_decisions e
    JOIN audit_ledger a ON a.workspace=e.workspace AND a.seq=e.seq
    WHERE e.workspace=? AND e.kind='platform.transition' AND e.subject_id=? AND json_extract(a.payload,'$.model')=?
    ORDER BY e.seq DESC LIMIT 100`,c.workspace,id,model).all()).results;
   return json({decisions:rows});
  }
  fail('Unknown route',404);
 }
 if(req.method==='GET'&&parts.length===4)return json(await findRecord());
 if(req.method!=='POST')fail('Unknown route',404);
 const key=req.headers.get('idempotency-key')||'';
 if(!/^[A-Za-z0-9._:-]{1,100}$/.test(key))fail('Idempotency-Key required',400);
 const body=await req.json().catch(()=>null);
 if(parts.length===3){
  if(!keys(body,['data'])||!body.data||typeof body.data!=='object'||Array.isArray(body.data))fail('Expected data object');
  if(!m.definition.permissions.create.includes(c.role))fail('Forbidden',403);
  return json(await changePlatform(c,'platform.create',{model,data:body.data},key));
 }
 if(parts.length===5&&action==='transition'){
  await findRecord();
  if(!keys(body,['version','target','reason'])||!Number.isSafeInteger(body.version)||body.version<1||typeof body.target!=='string'||body.reason!==undefined&&typeof body.reason!=='string')fail('Expected version, target and optional reason');
  return json(await changePlatform(c,'platform.transition',{model,id,version:body.version,target:body.target,...(body.reason===undefined?{}:{reason:body.reason})},key));
 }
 fail('Unknown route',404);
}
