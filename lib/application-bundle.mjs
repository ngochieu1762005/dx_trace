/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {manifestToModel} from './appkit.mjs';
import {applyPlatform,planModel,PlatformError} from './platform.mjs';
const fail=(message,status=422)=>{throw new PlatformError(message,status)};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));

export function bundleDefinitions(bundle){
  if(!keys(bundle,['apiVersion','kind','metadata','spec'])||
     JSON.stringify(bundle).length>500000||
     bundle.apiVersion!=='dxtrace.io/v2'||bundle.kind!=='ApplicationBundle'||
     !keys(bundle.metadata,['id','name','version'])||
     !keys(bundle.spec,['applications']))fail('Invalid application bundle');
  const {id,name,version}=bundle.metadata;
  if(typeof id!=='string'||!/^[a-z][a-z0-9_]{0,39}$/.test(id)||
     typeof name!=='string'||!name.trim()||name.length>200||
     typeof version!=='string'||!/^\d+\.\d+\.\d+$/.test(version))fail('Invalid bundle metadata');
  const apps=bundle.spec.applications;
  if(!Array.isArray(apps)||!apps.length||apps.length>12)fail('Bundle requires 1–12 applications');
  const definitions=apps.map(manifestToModel);
  if(new Set(definitions.map(d=>d.id)).size!==definitions.length)fail('Duplicate model ID in bundle');
  return definitions;
}
export function planBundle(state,bundle){
  const plans=bundleDefinitions(bundle).map(definition=>planModel(state,definition));
  return {id:bundle.metadata.id,version:bundle.metadata.version,
    baseVersions:Object.fromEntries(plans.map(p=>[p.definition.id,p.baseVersion])),
    models:plans.map(p=>({id:p.definition.id,baseVersion:p.baseVersion,nextVersion:p.unchanged?p.baseVersion:p.nextVersion,
      records:p.records,unchanged:p.unchanged,rejections:p.rejections})),
    applicable:plans.every(p=>p.rejections.length===0)};
}
export function applyBundle(state,bundle,baseVersions,context){
  if(context.role!=='owner')fail('Only the workspace owner may install a bundle',403);
  const definitions=bundleDefinitions(bundle),plan=planBundle(state,bundle);
  if(!object(baseVersions)||Object.keys(baseVersions).length!==definitions.length||
     definitions.some(d=>!Object.hasOwn(baseVersions,d.id)||baseVersions[d.id]!==plan.baseVersions[d.id]))
    fail('Bundle plan is stale; obtain a new plan',409);
  if(!plan.applicable)fail('Bundle rejected: '+plan.models.flatMap(p=>p.rejections.map(r=>p.id+': '+r)).join('; '),409);
  // Stage everything before any caller persists a row.
  const staged={models:structuredClone(state.models||[]),records:state.records||[]};
  const results=definitions.map(definition=>applyPlatform(staged,'platform.apply',
    {definition,baseVersion:baseVersions[definition.id]},context));
  return {models:staged.models.filter(m=>definitions.some(d=>d.id===m.id)),
    result:{id:bundle.metadata.id,version:bundle.metadata.version,applications:results}};
}
