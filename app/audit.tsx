/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Audit evidence and independent checkpoint export.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import React,{useState} from 'react';
import {verifyAuditBundle} from '../lib/audit-proof.mjs';
import BusinessDecisionEvidence from './evidence';
function download(name:string,value:any){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function AuditEvidence({api}:any){
 const [bundle,setBundle]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function verify(){
  setBusy(true);setError('');setBundle(null);
  try{const value=await api('audit-ledger/export'),result=await verifyAuditBundle(value);if(!result.valid)throw Error(result.reason);setBundle(value)}
  catch(e:any){setError(e.message)}finally{setBusy(false)}
 }
 return <><BusinessDecisionEvidence api={api}/><section className="panel pad audit-evidence" aria-label="Kiểm chứng nhật ký">
  <div><p className="section-kicker">MINH CHỨNG VẬN HÀNH</p><h2>Kiểm chứng nhật ký độc lập</h2><p>Kiểm tra chuỗi SHA-256 tại trình duyệt, tải gói sự kiện và giữ một mốc đối chiếu ở nơi riêng biệt.</p></div>
  <button className="secondary" disabled={busy} onClick={verify}>{busy?'Đang kiểm tra…':'Kiểm tra & chuẩn bị gói minh chứng'}</button>
  {error&&<p role="alert" className="notice danger">{error}</p>}
  {bundle&&<div className="audit-result" role="status"><b>Chuỗi hợp lệ · {bundle.checkpoint.entries} sự kiện</b><code>{bundle.checkpoint.head}</code><p>Mốc đến số thứ tự {bundle.checkpoint.seq}. Không bao gồm dữ liệu trước khi bật ledger.</p><div className="actions"><button onClick={()=>download('DX-TRACE-audit-'+bundle.checkpoint.seq+'.json',bundle)}>Tải gói nhật ký</button><button className="secondary" onClick={()=>download('DX-TRACE-checkpoint-'+bundle.checkpoint.seq+'.json',bundle.checkpoint)}>Tải mốc đối chiếu</button></div></div>}
  <small>Chuỗi hash không phải chữ ký số. Để phát hiện việc viết lại hoặc cắt ngắn lịch sử, hãy lưu mốc đối chiếu ngoài máy chủ và kiểm tra lần xuất sau bằng công cụ verify-audit.</small>
 </section></>;
}
