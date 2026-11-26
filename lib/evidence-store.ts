/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {q} from './server.ts';
import {DomainError} from './domain.mjs';
import {evidenceSigner} from './evidence-capture.mjs';
import {createEvidenceArchive,encodeEvidenceArchive,serializeEvidenceEvents,verifyEvidenceArchive} from './business-evidence.mjs';

const authorize=(c:any)=>{if(!['owner','manager'].includes(c.role))throw new DomainError('Cần quyền quản lý để đọc bằng chứng quyết định',403);};
const ledgerColumns='seq,previous,hash,payload';

/** Called before the state batch; its INSERT uses the same revision guard as the decision. */
export async function evidenceInsert(c:any,snapshot:any,row:any,revision:number){
 if(!snapshot)return null;
 const signer=evidenceSigner();
 let content:any={snapshot,simulated:snapshot.decision.simulated},publicKey=null,checkpoint=null;
 if(signer){
  const events=(await q('SELECT '+ledgerColumns+' FROM audit_ledger WHERE workspace=? AND seq<=? ORDER BY seq',c.workspace,revision).all()).results;
  events.push({seq:row.seq,previous:row.previous,hash:row.hash,payload:row.payload});
  const sealed=createEvidenceArchive({...snapshot,events},{privateKey:signer.privateKey,createdAt:snapshot.decision.occurredAt});
  // Keep one copy of each ledger row; exporting reconstructs the exact prefix without re-signing.
  content={simulated:snapshot.decision.simulated,files:Object.fromEntries(Object.entries(sealed.files).filter(([name])=>name!=='events.jsonl').map(([name,bytes])=>[name,Buffer.from(bytes as any).toString('base64')]))};
  publicKey=sealed.publicKey;checkpoint=sealed.checkpoint;
 }
 const d=snapshot.decision;
 return q(`INSERT INTO evidence_decisions(workspace,id,seq,kind,subject_id,actor,occurred_at,policy_version,workflow_version,signing_status,public_key,checkpoint,payload)
  SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM workspaces WHERE id=? AND revision=?)`,
  c.workspace,d.id,row.seq,d.type,snapshot.subjectId,d.identity.auditActor,d.occurredAt,snapshot.policy.version,
  String(snapshot.workflow.version),signer?'signed':'unsigned',publicKey,checkpoint,JSON.stringify(content),c.workspace,revision);
}

export async function evidenceRoute(c:any,req:Request,key:string,action:string){
 authorize(c);
 if(req.method!=='GET')throw new DomainError('Evidence chỉ hỗ trợ đọc và xuất gói đã ghi nhận',405);
 if(!key){
  const before=Number(new URL(req.url).searchParams.get('before')||Number.MAX_SAFE_INTEGER);
  if(!Number.isSafeInteger(before)||before<1)throw new DomainError('Cursor không hợp lệ',422);
  const rows=(await q(`SELECT id,seq,kind,subject_id,actor,occurred_at,policy_version,workflow_version,signing_status,json_extract(payload,'$.simulated') AS simulated
   FROM evidence_decisions WHERE workspace=? AND seq<? ORDER BY seq DESC LIMIT 101`,c.workspace,before).all()).results;
  const signer=evidenceSigner();
  return Response.json({decisions:rows.slice(0,100).map((r:any)=>({id:r.id,kind:r.kind,subjectId:r.subject_id,actor:r.actor,
   occurredAt:r.occurred_at,policyVersion:r.policy_version,workflowVersion:r.workflow_version,signingStatus:r.signing_status,simulated:r.simulated===1})),
   nextBefore:rows.length>100?rows[99].seq:null,signing:{configured:!!signer,keyId:signer?.keyId||null}},
   {headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 }
 if(action!=='export'||!/^decision-[1-9][0-9]*$/.test(key))throw new DomainError('Không tìm thấy bằng chứng',404);
 const row:any=await q('SELECT * FROM evidence_decisions WHERE workspace=? AND id=?',c.workspace,key).first();
 if(!row)throw new DomainError('Không tìm thấy bằng chứng',404);
 if(row.signing_status!=='signed')throw new DomainError('Quyết định này chưa được ký tại thời điểm ghi nhận; không thể ký hồi tố khi xuất',409);
 try{
  const saved=JSON.parse(row.payload),events=(await q('SELECT '+ledgerColumns+' FROM audit_ledger WHERE workspace=? AND seq<=? ORDER BY seq',c.workspace,row.seq).all()).results;
  const files=Object.fromEntries(Object.entries(saved.files).map(([name,bytes])=>[name,Buffer.from(bytes as string,'base64')]));
  files['events.jsonl']=serializeEvidenceEvents(events);
  const archive=encodeEvidenceArchive(files);
  const report=verifyEvidenceArchive(archive,{publicKey:row.public_key,checkpoint:row.checkpoint});
  if(!report.valid)throw Error('Captured evidence no longer verifies');
  return new Response(new Uint8Array(archive),{headers:{'content-type':'application/gzip','content-disposition':'attachment; filename="'+key+'-evidence.tar.gz"',
   'cache-control':'no-store','x-content-type-options':'nosniff','x-dx-evidence-checkpoint':row.checkpoint}});
 }catch{throw new DomainError('Bằng chứng đã lưu không còn toàn vẹn; xuất bị từ chối',409);}
}
