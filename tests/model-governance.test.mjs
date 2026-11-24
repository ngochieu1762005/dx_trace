/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateModel,validateValues,modelOpenApi,planModel} from '../lib/platform.mjs';
const initial=JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url),'utf8'));
test('conditional fields and text constraints are enforced server-side and in the published schema',()=>{
 const d=structuredClone(initial);
 d.fields.find(f=>f.key==='description').minLength=3;
 d.fields.find(f=>f.key==='description').maxLength=100;
 d.fields.find(f=>f.key==='cost').requiredWhen={field:'priority',equals:'Khẩn cấp'};
 const m=validateModel(d);
 const basic={equipment:'Fridge',description:'Inspection',priority:'Thường'};
 assert.deepEqual(validateValues(m,basic),basic);
 assert.throws(()=>validateValues(m,{...basic,description:'x'}),{status:422});
 assert.throws(()=>validateValues(m,{...basic,priority:'Khẩn cấp'}),{status:422});
 assert.equal(validateValues(m,{...basic,priority:'Khẩn cấp',cost:0}).cost,0);
 const spec=modelOpenApi(m).components.schemas.Data.properties;
 assert.equal(spec.description.minLength,3);
 assert.deepEqual(spec.cost['x-dxtrace-required-when'],{field:'priority',equals:'Khẩn cấp'});
 const p=planModel({models:[{id:d.id,version:1,definition:initial}],records:[{model:d.id,id:'REC-1',status:'draft',data:{...basic,priority:'Khẩn cấp'}}]},d);
 assert.equal(p.rejections.length,1);
});
test('invalid constraints and missing reference fields are rejected',()=>{
 for(const rule of [{field:'missing',equals:true},{field:'cost',equals:1},{field:'priority',equals:'Unknown'}]){
  const d=structuredClone(initial);d.fields.find(f=>f.key==='cost').requiredWhen=rule;
  assert.throws(()=>validateModel(d),{status:422});
 }
 const bad=structuredClone(initial);bad.fields[0].minLength=300;bad.fields[0].maxLength=2;
 assert.throws(()=>validateModel(bad),{status:422});
});
