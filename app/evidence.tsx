/* DX-TRACE | Decision evidence and clearly labeled synthetic verification.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import React,{useRef,useState} from 'react';
import {CheckCircle2,Download,FileCheck2,FlaskConical,RefreshCw,ShieldCheck,ShieldX} from 'lucide-react';
import {createEvidenceDemo,tamperEvidenceDemo,verifyEvidenceDemo} from '../public/shared/evidence-demo.mjs';

const checkLabels: Record<string,string> = {
 manifest: 'Tính toàn vẹn của bản kê', workflow: 'Phiên bản quy trình',
 policy: 'Phiên bản chính sách', events: 'Chuỗi mã băm sự kiện',
 lineage: 'Nguồn gốc dữ liệu', signature: 'Chữ ký số'
};

export default function BusinessDecisionEvidence({api}:any){
 const [records,setRecords]=useState<any>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [exporting,setExporting]=useState(''),[demoBusy,setDemoBusy]=useState(false),[demoError,setDemoError]=useState('');
 const [result,setResult]=useState<any>(null),[tampered,setTampered]=useState(false);
 const fixture=useRef<any>(null);
 async function load(more=false){
  setLoading(true);setError('');
  try{const value=await api('evidence'+(more&&records?.nextBefore?'?before='+records.nextBefore:''));setRecords(more?{...value,decisions:[...records.decisions,...value.decisions]}:value)}catch(e:any){setError(e.message)}finally{setLoading(false)}
 }
 async function exportProof(record:any){
  setExporting(record.id);setError('');
  try{
   const url=new URL('/api/evidence/'+encodeURIComponent(record.id)+'/export',location.origin);
   if(new URLSearchParams(location.search).get('area')==='training')url.searchParams.set('area','training');
   const response=await fetch(url,{credentials:'same-origin',redirect:'manual'});
   if(response.type==='opaqueredirect'||response.status===401||(response.status>=300&&response.status<400))throw Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
   if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.error||'Không thể xuất bằng chứng ('+response.status+').')}
   if(!/application\/(gzip|octet-stream)/.test(response.headers.get('content-type')||''))throw Error('Máy chủ không trả về gói bằng chứng hợp lệ.');
   const blob=await response.blob();
   if(blob.size>16*1024*1024)throw Error('Gói bằng chứng vượt giới hạn tải trên giao diện.');
   const download=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=download;link.download=record.id.replace(/[^a-zA-Z0-9_-]/g,'_')+'-evidence.tar.gz';link.click();
   setTimeout(()=>URL.revokeObjectURL(download),1000);
  }catch(e:any){setError(e.message)}finally{setExporting('')}
 }
 async function runDemo(change=false){
  setDemoBusy(true);setDemoError('');
  try{
   if(!fixture.current)fixture.current=await createEvidenceDemo();
   const value=change?tamperEvidenceDemo(fixture.current):fixture.current;
   setResult(await verifyEvidenceDemo(value));setTampered(change);
  }catch{setDemoError('Trình duyệt chưa hỗ trợ Ed25519 trong WebCrypto hoặc trang chưa dùng HTTPS. Dùng CLI để kiểm chứng gói bằng chứng.')}finally{setDemoBusy(false)}
 }
 return <section className="panel pad decision-evidence" aria-label="Bằng chứng quyết định nghiệp vụ">
  <header className="evidence-heading"><div><p className="section-kicker">DX-TRACE EVIDENCE ENGINE</p><h2>Mỗi quyết định, một hồ sơ có thể kiểm chứng</h2><p>Đối chiếu người quyết định, quyền tại thời điểm xử lý, chính sách, quy trình, dữ liệu đầu vào và trạng thái trước–sau.</p></div><ShieldCheck size={32} strokeWidth={1.4} aria-hidden="true"/></header>
  <div className="evidence-facts" aria-label="Thành phần bằng chứng">{['Danh tính','Quyền thực hiện','Phiên bản chính sách','Phiên bản quy trình','Nguồn dữ liệu','Trạng thái trước / sau','Toàn vẹn & chữ ký'].map(text=><span key={text}><CheckCircle2 size={13} aria-hidden="true"/>{text}</span>)}</div>
  <div className="evidence-live">
   <div className="evidence-toolbar"><div><h3>Quyết định trong kho hiện tại</h3><p>Hồ sơ được lưu khi quyết định phát sinh. Các quyết định cũ không được dựng lại thành bằng chứng mới.</p></div><button className="secondary" onClick={()=>load()} disabled={loading}><RefreshCw size={15} aria-hidden="true"/>{loading?'Đang tải…':'Tải danh sách'}</button></div>
   {error&&<p role="alert" className="notice danger">{error}</p>}
   {records&&<>
    <p className="evidence-signing">{records.signing?.configured?'Máy chủ đã cấu hình khóa ký cho các quyết định mới.':'Chưa cấu hình khóa ký. Hồ sơ chưa ký không thể xuất thành gói đã xác thực.'}{records.signing?.keyId&&<> Mã khóa: <code>{records.signing.keyId}</code>.</>}</p>
    {records.decisions?.length?<div className="table-scroll"><table><thead><tr><th>Quyết định</th><th>Người thực hiện</th><th>Thời điểm</th><th>Bằng chứng</th></tr></thead><tbody>{records.decisions.map((record:any)=><tr key={record.id}><td><strong>{record.subjectId||record.id}</strong><small className="evidence-record-kind">{record.kind} · {record.id}</small>{record.simulated&&<span className="cold-chain-fixture">Dữ liệu mô phỏng</span>}</td><td>{typeof record.actor==='string'?record.actor:(record.actor?.displayName||record.actor?.id||'—')}</td><td>{record.occurredAt?new Date(record.occurredAt).toLocaleString('vi-VN'):'—'}</td><td>{record.signingStatus==='signed'?<button className="small secondary" disabled={!!exporting} onClick={()=>exportProof(record)}><Download size={14} aria-hidden="true"/>{exporting===record.id?'Đang xuất…':'Tải .tar.gz'}</button>:<span className="evidence-unsigned">Chưa ký tại thời điểm ghi</span>}</td></tr>)}</tbody></table></div>:<div className="evidence-empty"><FileCheck2 size={22} aria-hidden="true"/><p>Chưa có hồ sơ quyết định được ghi bởi Evidence Engine trong kho này.</p></div>}
    {records.nextBefore&&<button className="secondary small" disabled={loading} onClick={()=>load(true)}>{loading?'Đang tải…':'Tải thêm quyết định'}</button>}
   </>}
   <p className="evidence-trust">Kiểm tra gói ngoại tuyến bằng CLI với khóa công khai hoặc mốc đối chiếu nhận từ nguồn tin cậy độc lập. Khóa nằm cùng gói bằng chứng không tự tạo ra sự tin cậy.</p>
  </div>
  <details className="evidence-demo" open>
   <summary><FlaskConical size={18} aria-hidden="true"/>Thử phát hiện bằng chứng bị sửa<span>MÔ PHỎNG</span></summary>
   <p className="evidence-demo-disclaimer">Dữ liệu RC-2026-001 dưới đây hoàn toàn giả lập. Trình duyệt kiểm SHA-256 và Ed25519 trên mẫu tạm thời; đây không phải kết quả kiểm thử một quyết định hay hệ thống đang vận hành.</p>
   <div className="evidence-demo-card">
    <div className="evidence-file"><FileCheck2 size={25} aria-hidden="true"/><div><strong>recall-evidence.tar.gz</strong><small>Mã thu hồi: RC-2026-001 · Mẫu minh họa trong bộ nhớ</small></div></div>
    <div className="evidence-checks" aria-live="polite">{(result?.checks || Object.keys(checkLabels).map(id => ({id}))).map((check:any)=><div key={check.id}><span>{checkLabels[check.id]}</span><strong className={check.valid===undefined?'pending':check.valid?'valid':'invalid'}>{check.valid===undefined?'CHƯA KIỂM':check.valid?'HỢP LỆ':'KHÔNG HỢP LỆ'}</strong></div>)}</div>
    {result&&<div className={'evidence-verdict '+(result.valid?'valid':'invalid')} role="status">{result.valid?<ShieldCheck size={21} aria-hidden="true"/>:<ShieldX size={21} aria-hidden="true"/>}<div><strong>{result.valid?'Bằng chứng mẫu hợp lệ':'Phát hiện bằng chứng mẫu đã bị sửa'}</strong><p>{result.valid?'Các thành phần khớp với manifest và khóa của phiên minh họa.':'Kết quả kiểm định đã đổi từ “không đạt” thành “đạt”. Manifest, chuỗi sự kiện và nguồn dữ liệu không còn khớp.'}</p></div></div>}
   </div>
   {tampered&&<p className="evidence-demo-note">Chữ ký gốc vẫn xác minh được trên manifest đã ký. Tuy nhiên, dữ liệu hiện tại khác nội dung manifest nên toàn bộ bằng chứng bị từ chối.</p>}
   {demoError&&<p role="alert" className="notice danger">{demoError}</p>}
   <div className="actions"><button disabled={demoBusy} onClick={()=>runDemo(false)}>{demoBusy?'Đang kiểm tra…':result?'Khôi phục & kiểm tra mẫu':'Kiểm tra mẫu minh họa'}</button><button className="secondary" disabled={demoBusy||!result||tampered} onClick={()=>runDemo(true)}>Mô phỏng sửa kết quả kiểm định</button></div>
  </details>
 </section>;
}
