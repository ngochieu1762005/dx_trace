/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {withWorkspace} from './workspace-queue.mjs';
import {q,db,hash} from './server.ts';
import {models} from './platform-store.ts';
import {bundleDefinitions,planBundle,applyBundle} from './application-bundle.mjs';
import {PlatformError} from './platform.mjs';
const fail=(message:string,status=422)=>{throw new PlatformError(message,status)};
async function load(c:any,bundle:any){
  const defs=bundleDefinitions(bundle);
  const all=await models(c);
  const records=(await q('SELECT payload FROM platform_records WHERE workspace=? AND model IN ('+
    defs.map(()=>'?').join(',')+')',c.workspace,...defs.map(d=>d.id)).all()).results.map((r:any)=>JSON.parse(r.payload));
  return {models:all,records};
}
export async function previewBundle(c:any,bundle:any){
  if(c.role!=='owner')fail('Only the workspace owner may plan a bundle',403);
  return withWorkspace(c.workspace,async()=>planBundle(await load(c,bundle),bundle));
}
export async function installBundle(c:any,bundle:any,baseVersions:any,key:string){
  if(c.role!=='owner')fail('Only the workspace owner may install a bundle',403);
  if(!key||key.length>100)fail('Idempotency-Key is required',400);
  bundleDefinitions(bundle);
  return withWorkspace(c.workspace,async()=>{
    const who=c.email||c.name,fingerprint=await hash(JSON.stringify(['bundle.install',bundle,baseVersions]));
    for(let attempt=0;attempt<6;attempt++){
      const revision=(await q('SELECT revision FROM workspaces WHERE id=?',c.workspace).first()).revision;
      const prior=await q('SELECT * FROM platform_commands WHERE workspace=? AND key=?',c.workspace,key).first();
      if(prior){
        if(prior.actor!==who||prior.fingerprint!==fingerprint)fail('Idempotency-Key already used',409);
        return JSON.parse(prior.result);
      }
      const now=new Date().toISOString(),state=await load(c,bundle);
      const {models:next,result}=applyBundle(state,bundle,baseVersions,{role:c.role,actor:who,now});
      const guard=' WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)';
      const writes=next.filter(m=>!result.applications.find(a=>a.id===m.id)?.unchanged).map(m=>{
        const content=JSON.stringify(m);
        if(Buffer.byteLength(content)>524288)fail('Model history exceeds 512 KiB');
        return q('INSERT INTO platform_models(workspace,id,payload) SELECT ?,?,?'+guard+
          ' ON CONFLICT(workspace,id) DO UPDATE SET payload=excluded.payload',c.workspace,m.id,content,c.workspace,revision);
      });
      const previous=(await q('SELECT hash FROM audit_ledger WHERE workspace=? ORDER BY seq DESC LIMIT 1',c.workspace).first())?.hash||'0'.repeat(64);
      const payload=JSON.stringify({action:'bundle.install',actor:who,entity:result.id,created:now,
        manifestHash:await hash(JSON.stringify(bundle)),applications:result.applications});
      const digest=await hash(previous+'\n'+(revision+1)+'\n'+payload);
      const statements=[...writes,
        q('INSERT INTO platform_commands(workspace,key,actor,fingerprint,result,created) SELECT ?,?,?,?,?,?'+guard,
          c.workspace,key,who,fingerprint,JSON.stringify(result),now,c.workspace,revision),
        q('INSERT INTO audit_ledger(workspace,seq,previous,hash,payload,created) SELECT ?,?,?,?,?,?'+guard,
          c.workspace,revision+1,previous,digest,payload,now,c.workspace,revision),
        q('UPDATE workspaces SET revision=revision+1 WHERE id=? AND revision=?',c.workspace,revision)];
      const outcomes=await db().batch(statements);
      if(outcomes.at(-1).meta.changes===1)return result;
    }
    fail('Concurrent workspace update; retry the plan',409);
  });
}
