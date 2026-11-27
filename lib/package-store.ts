/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {q,db,hash} from './server.ts';
import {applyPlatform,PlatformError} from './platform.mjs';
import {compilePackage,compareVersions} from './app-package.mjs';
import {withWorkspace} from './workspace-queue.mjs';

const fail=(message:string,status=409):never=>{throw new PlatformError(message,status)};
const getPackage=(workspace:string,name:string)=>q('SELECT * FROM app_packages WHERE workspace=? AND name=?',workspace,name).first();
function describe(row:any) {
 const stack=JSON.parse(row.versions);
 const app=compilePackage(stack.at(-1));
 return {name:app.name,version:app.version,revision:row.revision,active:!!row.active,route:app.route,
   permissions:app.permissions,models:app.models.map(m=>m.id),rollbackVersion:stack.at(-2)?.manifest.metadata.version??null};
}
export function portalLinks(c:any,models:any[]){
 const visible=new Map(models.map(m=>[m.id,m.definition.name]));
 const links=new Map();
 for(const row of q('SELECT package,model FROM app_package_models WHERE workspace=? AND archived IS NULL ORDER BY package,model',c.workspace).all().results){
   if(!visible.has(row.model))continue;
   if(!links.has(row.package)||row.model==='pkg_'+row.package+'_'+row.package)
     links.set(row.package,{path:'/'+row.package,name:visible.get(row.model)});
 }
 return [...links.values()];
}
export function portal(c:any,name:string) {
 const row=getPackage(c.workspace,name);
 if(!row?.active) fail('Portal not installed',404);
 const app=compilePackage(JSON.parse(row.versions).at(-1));
 const models=app.models.filter(m=>m.permissions.read.includes(c.role));
 if(!models.length) fail('Portal not found',404);
 return {name,route:app.route,handover:app.handover&&process.env.DX_FLOWABLE_URL?{model:'pkg_'+name+'_'+app.handover.resource,after:app.handover.after}:null,models:models.map(m=>({id:m.id,name:m.name}))};
}
export async function packages(c:any,req:Request,name:string,action:string) {
 if(c.role!=='owner') fail('Only workspace owners manage packages',403);
 if(req.method==='GET'){
   if(!name) return {applications:q('SELECT * FROM app_packages WHERE workspace=? AND active=1 ORDER BY name',c.workspace).all().results.map(describe)};
   if(action==='status'){
     const row=getPackage(c.workspace,name);
     return row?describe(row):{name,active:false,revision:0};
   }
 }
 if(req.method!=='POST'||!['install','upgrade','rollback','uninstall'].includes(action)) fail('Unknown package operation',404);
 const body=await req.json();
 return withWorkspace(c.workspace,async()=>{
   const workspaceRevision=q('SELECT revision FROM workspaces WHERE id=?',c.workspace).first().revision;
   const row=getPackage(c.workspace,name);
   if(body?.revision!==(row?.revision??0)) fail('Package revision changed; inspect status before retrying');
   if(action==='install'?row?.active:!row?.active) fail('Package is already installed or inactive');
   const stack=row?JSON.parse(row.versions):[];
   const old=stack.at(-1);
   if(action==='rollback'){
     if(stack.length<2) fail('No previous release');
     stack.pop();
   } else if(action!=='uninstall'){
     const next=compilePackage(body.package);
     if(name!==next.name) fail('Package name mismatch',422);
     if(old && JSON.stringify(old)!==JSON.stringify(body.package) && compareVersions(next.version,old.manifest.metadata.version)<=0)
       fail('Upgrade requires a higher version');
     if(action==='upgrade' && compareVersions(next.version,old.manifest.metadata.version)<=0) fail('Version already installed');
     if(!old||JSON.stringify(old)!==JSON.stringify(body.package)) stack.push(body.package);
   }
   const app=compilePackage(stack.at(-1));
   if(old){
     const before=compilePackage(old).models.map(m=>m.id).sort();
     if(JSON.stringify(before)!==JSON.stringify(app.models.map(m=>m.id).sort())) fail('Schema ownership must remain stable across releases');
   }
   const active=action!=='uninstall', revision=(row?.revision??0)+1;
   const serialized=JSON.stringify(stack);
   if(Buffer.byteLength(serialized)>2000000) fail('Package history exceeds 2 MiB');
   const guard=' WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)';
   const fence=[c.workspace,workspaceRevision];
   const writes=[];
   const who=c.email||c.name,now=new Date().toISOString();
   for(const definition of app.models){
     const id=definition.id;
     const owned=q('SELECT * FROM app_package_models WHERE workspace=? AND model=?',c.workspace,id).first();
     const current=q('SELECT payload FROM platform_models WHERE workspace=? AND id=?',c.workspace,id).first();
     if(owned && owned.package!==name || current && !owned) fail('Model already owned: '+id);
     if(!active){
       if(!current) fail('Installed model missing: '+id);
       writes.push(q('UPDATE app_package_models SET archived=? WHERE workspace=? AND model=? AND EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)',current.payload,c.workspace,id,...fence));
       writes.push(q('DELETE FROM platform_models WHERE workspace=? AND id=? AND EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)',c.workspace,id,...fence));
       continue;
     }
     const previous=current?.payload||owned?.archived;
     const records=q('SELECT payload FROM platform_records WHERE workspace=? AND model=?',c.workspace,id).all().results.map((r:any)=>JSON.parse(r.payload));
     const state={models:previous?[JSON.parse(previous)]:[],records};
     applyPlatform(state,'platform.apply',{definition,baseVersion:state.models[0]?.version??0},{role:c.role,actor:who,now});
     const content=JSON.stringify(state.models[0]);
     if(Buffer.byteLength(content)>524288) fail('Model history exceeds 512 KiB');
     writes.push(q('INSERT INTO app_package_models(workspace,model,package) SELECT ?,?,?'+guard+' ON CONFLICT(workspace,model) DO UPDATE SET archived=NULL',c.workspace,id,name,...fence));
     writes.push(q('INSERT INTO platform_models(workspace,id,payload) SELECT ?,?,?'+guard+' ON CONFLICT(workspace,id) DO UPDATE SET payload=excluded.payload',c.workspace,id,content,...fence));
   }
   const previous=q('SELECT hash FROM audit_ledger WHERE workspace=? ORDER BY seq DESC LIMIT 1',c.workspace).first()?.hash||'0'.repeat(64);
   const payload=JSON.stringify({action:'app.'+action,entity:name,actor:who,version:app.version,revision,created:now,packageHash:await hash(JSON.stringify(stack.at(-1)))});
   const digest=await hash(previous+'\n'+(workspaceRevision+1)+'\n'+payload);
   writes.push(q('INSERT INTO app_packages(workspace,name,revision,active,versions) SELECT ?,?,?,?,?'+guard+' ON CONFLICT(workspace,name) DO UPDATE SET revision=excluded.revision,active=excluded.active,versions=excluded.versions',c.workspace,name,revision,Number(active),serialized,...fence),
     q('INSERT INTO audit_ledger(workspace,seq,previous,hash,payload,created) SELECT ?,?,?,?,?,?'+guard,c.workspace,workspaceRevision+1,previous,digest,payload,now,...fence),
     q('UPDATE workspaces SET revision=revision+1 WHERE id=? AND revision=?',...fence));
   if(!db().batch(writes).at(-1).meta.changes) fail('Workspace changed; retry after inspecting status');
   return {name,version:app.version,revision,active,route:active?app.route.path:null};
 });
}
