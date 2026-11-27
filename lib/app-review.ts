/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {q,hash} from './server.ts';
import {canRead,PlatformError} from './platform.mjs';
import {nativeReview} from './native-review.ts';

export async function appReview(c:any,req:Request,model:string,id:string){
 const row=q(`SELECT m.payload AS model,r.payload AS record,p.versions,p.name
  FROM platform_models m JOIN platform_records r ON r.workspace=m.workspace AND r.model=m.id
  JOIN app_package_models a ON a.workspace=m.workspace AND a.model=m.id
  JOIN app_packages p ON p.workspace=a.workspace AND p.name=a.package
  WHERE m.workspace=? AND m.id=? AND r.id=? AND p.active=1`,c.workspace,model,id).first();
 const record=row&&JSON.parse(row.record);
 if(!row||!canRead(JSON.parse(row.model).definition,record,{role:c.role,actor:c.email||c.name}))
  throw new PlatformError('Record not found',404);
 const review=JSON.parse(row.versions).at(-1).manifest.spec.handover;
 if(!review||model!=='pkg_'+row.name+'_'+review.resource||review.after!==record.status)
  throw new PlatformError('Handover unavailable for this record state',409);
 const reference='appkit/'+model+'/'+id+'/'+record.version;
 const businessKey=await hash(JSON.stringify([c.workspace,reference]));
 const stored=q('SELECT instance_id FROM native_review_requests WHERE workspace=? AND business_key=?',c.workspace,businessKey).first();
 if(req.method==='GET'){
  return stored?.instance_id?nativeReview(c,req,stored.instance_id,'',undefined,reference):{status:stored?'pending':'new',tasks:[]};
 }
 if(req.method!=='POST')throw new PlatformError('Unknown handover operation',405);
 const body=await req.json();
 if(body.action==='start'){
  // Only the record creator can reserve the review; nativeReview enforces independent reviewers.
  if(record.createdBy!==c.email)throw new PlatformError('Record creator must request handover',403);
  const start=new Request(req.url,{method:'POST',headers:{'idempotency-key':businessKey},body:JSON.stringify({reference})});
  return nativeReview(c,start,'start','',undefined,reference);
 }
 if(body.action==='complete'&&stored?.instance_id){
  return nativeReview(c,new Request(req.url,{method:'POST',body:JSON.stringify(body)}),stored.instance_id,'complete',undefined,reference);
 }
 throw new PlatformError('Start the handover before completing a task',409);
}
