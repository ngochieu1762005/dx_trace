/* DX-TRACE | Declarative app manifest contracts and application isolation
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {manifestToModel,modelToManifest,listedApplication} from '../lib/appkit.mjs';
import {applyPlatform,platformView} from '../lib/platform.mjs';

const maintenance = JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url),'utf8'));
const purchase = JSON.parse(readFileSync(new URL('../examples/purchase/model.json',import.meta.url),'utf8'));
const manifest = (model, version='1.0.0') => ({
  apiVersion:'dxtrace.io/v1',kind:'DeclarativeApplication',
  metadata:{id:model.id,name:model.name,version,description:'Independently installed workflow app'},
  spec:{model}
});
const actor = (role='owner', who='owner', entity='REC-one') =>
  ({role,actor:who,entity,now:'2026-11-22T09:00:00.000Z'});

test('application manifest validates and round-trips without executable scripts', () => {
  const source=manifest(maintenance);
  const model=manifestToModel(source);
  assert.deepEqual(modelToManifest(model),source);
  assert.equal(listedApplication({id:maintenance.id,version:7,definition:model}).entrypoint,'/#platform');
  const hostile = [
    {...source,kind:'CodeApplication'},
    {...source,metadata:{...source.metadata,entrypoint:'https://third-party.invalid/script.js'}},
    {...source,spec:{model:maintenance,scripts:['curl attacker']}},
    {...source,spec:{model:{...maintenance,name:'Different name'}}},
    {...source,metadata:{...source.metadata,version:'latest'}},
    {...source,metadata:{...source.metadata,id:'__proto__'}},
    {...source,metadata:{...source.metadata,description:'x'.repeat(501)}}
  ];
  for (const item of hostile) assert.throws(()=>manifestToModel(item),{status:422});
  assert.throws(()=>modelToManifest({...model,application:{version:'1.0.0',url:'evil'}}),{status:422});
});

test('different applications share an unchanged runtime without sharing record data', () => {
  const state={};
  const m1=manifestToModel(manifest(maintenance));
  const m2=manifestToModel(manifest(purchase,'2.0.0'));
  for (const model of [m1,m2]) {
    applyPlatform(state,'platform.apply',{definition:model,baseVersion:0},actor());
  }
  assert.deepEqual(state.models.map(m=>m.id),[maintenance.id,purchase.id]);
  const data=Object.fromEntries(maintenance.fields.filter(f=>f.required).map(f=>[
    f.key,f.type==='choice'?f.options[0]:f.type==='number'?1:
      f.type==='boolean'?false:f.type==='date'?'2026-11-22':'Example'
  ]));
  applyPlatform(state,'platform.create',{model:m1.id,data},actor('warehouse','operator'));
  assert.equal(platformView(state,actor('owner','owner')).records.length,1);
  assert.equal(state.records[0].model,maintenance.id);
  assert.equal(state.models[1].definition.application.version,'2.0.0');
});
