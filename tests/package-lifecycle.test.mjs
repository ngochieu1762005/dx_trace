/* SPDX-License-Identifier: MIT */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadPackage,scaffold} from '../tools/app-cli.mjs';
import {compilePackage} from '../lib/app-package.mjs';

test('package compatibility, tenancy, record preservation and stale writes',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'dx-package-'));
 process.env.DATA_DIR=temp;
 try{
  const {identity}=await import('../selfhost/runtime.mjs');
  const {GET,POST}=await import('../app/api/[...path]/route.ts');
  const call=async(path,body,who='owner',status=200)=>{
   const user={userId:who,email:who+'@example.test',displayName:who};
   const request=new Request('http://localhost/api/'+path,{method:body?'POST':'GET',headers:{'idempotency-key':crypto.randomUUID()},body:body?JSON.stringify(body):undefined});
   const response=await identity.run(user,()=>(body?POST:GET)(request));const result=await response.json();
   assert.equal(response.status,status,JSON.stringify(result));return result;
  };
  const pkg=await loadPackage('examples/maintenance');
  const change=(action,revision,input,status=200)=>call('packages/maintenance/'+action,{revision,package:input},'owner',status);
  const bad=structuredClone(pkg);bad.manifest.spec.requiresCore='>=2.0.0 <3.0.0';assert.throws(()=>compilePackage(bad));
  const badPath=structuredClone(pkg);badPath.manifest.spec.schemas[0]='../other.json';assert.throws(()=>compilePackage(badPath));
  const badPermission=structuredClone(pkg);badPermission.manifest.spec.permissions.push('core:admin');
  await change('install',0,badPermission,422);
  assert.equal((await call('packages/maintenance/status')).revision,0);
  await change('install',0,pkg);
  await call('members',{email:'staff@example.test',role:'warehouse'});
  await call('packages/maintenance/uninstall',{revision:1},'staff',403);
  await call('portals/maintenance',null,'other',404);
  assert.equal((await call('portals/maintenance',null,'staff')).models.length,2);
  const model='models/pkg_maintenance_maintenance/';
  const record=await call(model+'records',{data:{equipment:'Pump',description:'Seal',priority:'Thường'}},'staff');
  await call(model+'transition',{id:record.id,version:1,target:'submitted'},'staff');
  await call(model+'transition',{id:record.id,version:2,target:'approved'},'staff',403);
  await call(model+'transition',{id:record.id,version:2,target:'approved'});
  const next=structuredClone(pkg);next.manifest.metadata.version='1.2.0';
  const broken=structuredClone(next);const schemaKey='schemas/maintenance.json';
  const schema=JSON.parse(broken.files[schemaKey]);schema.fields[0].type='boolean';broken.files[schemaKey]=JSON.stringify(schema);
  await change('upgrade',1,broken,409);
  assert.equal((await call('packages/maintenance/status')).revision,1);
  await change('upgrade',1,next);
  await change('uninstall',1,undefined,409);
  await change('rollback',2);
  const second=join(temp,'purchase');await scaffold(second);
  await call('packages/purchase/install',{revision:0,package:await loadPackage(second)});
  await change('uninstall',3);
  await call('portals/maintenance',null,'owner',404);await call(model+'records',null,'owner',404);
  await call('portals/purchase');await call('models/pkg_purchase_purchase/records',{data:{equipment:'Desk',description:'Fix',priority:'Thường'}});
  await change('install',4,pkg);
  assert.equal((await call(model+'records')).records[0].status,'approved');
  assert.equal((await call('audit-ledger/verify')).valid,true);
  const root=join(temp,'linked');await mkdir(root);await symlink(join(second,'app.yaml'),join(root,'app.yaml'));
  await assert.rejects(()=>loadPackage(root),/Invalid resource/);
 }finally{await rm(temp,{recursive:true,force:true});}
});
