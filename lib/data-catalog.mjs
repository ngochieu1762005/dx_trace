/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {modelOpenApi} from './platform.mjs';

// Only callers authorized to read a model receive its metadata. No record
// values, identities, credentials, or cross-workspace statistics are exposed.
export function buildCatalog(models, role) {
  return models.filter(m=>m.definition.permissions.read.includes(role)).map(m=>{
    const d=m.definition;
    return {id:m.id,name:d.name,version:m.version,
      fields:d.fields.map(f=>({key:f.key,label:f.label,type:f.type,required:!!f.required,
        ...(f.type==='choice'?{options:f.options}:{}),
        ...(f.min!==undefined?{min:f.min}:{}),...(f.max!==undefined?{max:f.max}:{})})),
      access:{read:d.permissions.read,create:d.permissions.create,scope:d.permissions.scope},
      lineage:{kind:'declared',input:'/api/models/'+m.id+'/records',
        storage:'platform_records',output:'/api/models/'+m.id,
        fields:d.fields.map(f=>({input:f.key,stored:'data.'+f.key,output:'data.'+f.key}))},
      workflow:{states:d.workflow.states,initial:d.workflow.initial,terminal:d.workflow.terminal},
      openapi:'/api/models/'+m.id+'/openapi'};
  });
}
export function manifestArtifacts(definition) {
  return {catalog:buildCatalog([{id:definition.id,version:0,definition}],definition.permissions.read[0])[0],
    openapi:modelOpenApi(definition)};
}
