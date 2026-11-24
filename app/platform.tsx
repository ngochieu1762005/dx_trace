/* DX-TRACE | Model-based operations console. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import React,{useEffect,useState,useRef} from 'react';
import ProcessTasks from './process-tasks';
import parallel from '../examples/maintenance/process.parallel.json';
import {executableTasks} from '../lib/task-view.mjs';
import {fieldRequired} from '../lib/platform.mjs';
import sample from '../examples/maintenance/model.json';
import purchase from '../examples/purchase/model.json';
import quality from '../examples/quality/model.json';
import customer from '../examples/customer/model.json';
import maintenanceApp from '../examples/maintenance/app.json';
import purchaseApp from '../examples/purchase/app.json';
import operationsBundle from '../examples/bundles/operations.json';
const templates=[sample,purchase,quality,customer,{...sample,id:'maintenance_parallel',name:'Bảo trì · kiểm tra song song',orchestration:parallel}];
import {csvText} from '../lib/inventory-view.mjs';
import {workspaceUrl} from '../public/shared/workspace.mjs';
export default function Platform({api,role,actor,selection=''}:any){
 const [view,setView]=useState<any>({models:[],records:[],summary:{total:0,overdue:0}}),[modelId,setModelId]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[source,setSource]=useState(JSON.stringify(sample,null,2)),[plan,setPlan]=useState<any>(null),[values,setValues]=useState<any>({}),[status,setStatus]=useState('all'),[selected,setSelected]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState('');
 const [profile,setProfile]=useState<any>(null);
 const [offset,setOffset]=useState(0),[search,setSearch]=useState('');
 const [bpmnXml,setBpmnXml]=useState('');
 const [appSource,setAppSource]=useState(JSON.stringify(maintenanceApp,null,2)),[appPlan,setAppPlan]=useState<any>(null);
 const [bundleSource,setBundleSource]=useState(JSON.stringify(operationsBundle,null,2)),[bundlePlan,setBundlePlan]=useState<any>(null);
 useEffect(()=>{if(selection){const [model,record]=selection.split('/');setModelId(model);setSelected(record||'');setSearch(record||'');setStatus('all');setOffset(0)}},[selection]);
 const pending=useRef<any>(null),generation=useRef(0);
 const load=async()=>{const generationId=++generation.current;try{const query=new URLSearchParams({limit:'50',offset:String(offset),status,q:search});if(modelId)query.set('model',modelId);const next=await api('models?'+query);if(generationId!==generation.current)return;setView(next);if(!modelId&&next.models.length)setModelId(next.models[0].id);setError('')}catch(e:any){if(generationId===generation.current)setError(e.message)}};
 useEffect(()=>{const start=setTimeout(load,250);const t=setInterval(()=>{if(document.visibilityState==='visible')load()},30000);return()=>{clearTimeout(start);clearInterval(t);generation.current++}},[modelId,status,offset,search]);
 const run=async(fn:()=>Promise<any>)=>{setBusy(true);setError('');setMessage('');try{await fn()}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const mutate=async(path:string,body:any)=>{const fingerprint=JSON.stringify([path,body]);if(pending.current?.fingerprint!==fingerprint)pending.current={fingerprint,key:crypto.randomUUID()};const r=await api(path,body,pending.current.key);pending.current=null;await load();return r};
 const model=view.models.find((m:any)=>m.id===modelId)||view.models[0],def=model?.definition;
 const records=view.records.filter((r:any)=>r.model===model?.id&&(status==='all'||status==='overdue'?status==='all'||r.overdue:r.status===status));
 const record=view.records.find((r:any)=>r.id===selected&&r.model===model?.id);
 const name=(s:string)=>({draft:'Bản nháp',submitted:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối',done:'Hoàn tất',escalated:'Chờ chủ không gian'} as any)[s]||s;
 const exportCsv=()=>{const body=csvText([['Mã hồ sơ','Trạng thái','Hạn xử lý',...def.fields.map((f:any)=>f.label)],...records.map((r:any)=>[r.id,r.status,r.dueAt||'',...def.fields.map((f:any)=>r.data[f.key])])]);const url=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=model.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 return <div className="platform-console">
 <p className="muted">Nghiệp vụ mở rộng dùng chung tài khoản, quyền và nhật ký của kho hiện tại. Dữ liệu tự làm mới mỗi 30 giây.</p>
 {error&&<p role="alert" className="notice">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
 <div className="quick-actions"><div><h2>Hồ sơ cần xử lý</h2><p>{view.summary.total} hồ sơ được phép xem · {view.summary.overdue} quá hạn</p></div><button className="secondary" disabled={busy} onClick={()=>run(load)}>Làm mới</button></div>
 {view.models.some((m:any)=>m.definition.application?.uiPath)&&
  <section className="panel pad"><h2>Ứng dụng độc lập dùng chung DX-TRACE Core</h2>
   <p className="muted">Những ứng dụng dưới đây có giao diện riêng, nhưng sử dụng lại danh tính, phân quyền, dữ liệu, API và workflow hiện có.</p>
   <div className="actions">{view.models.filter((m:any)=>m.definition.application?.uiPath).map((m:any)=>
    <a key={m.id} className="button secondary" href={workspaceUrl(m.definition.application.uiPath,location.search)}>{m.definition.name} · Mở ứng dụng <span aria-hidden="true">↗</span></a>
   )}</div>
  </section>}
 {model?<><details className="panel pad"><summary>Danh mục và chất lượng dữ liệu</summary>
  <p className="muted">Thống kê trên toàn bộ hồ sơ bạn được phép đọc của mô hình đang chọn; không chỉ trang hiện tại.</p>
  <button className="secondary" disabled={busy} onClick={()=>run(async()=>setProfile(await api('catalog/'+encodeURIComponent(model.id)+'/profile')))}>Đo độ đầy đủ dữ liệu</button>
  {profile?.model===model.id&&profile.version===model.version&&<><p>{profile.total} hồ sơ · Cập nhật gần nhất: {profile.latest?new Date(profile.latest).toLocaleString('vi-VN'):'Chưa có dữ liệu'}</p>
  <div className="table-scroll"><table><thead><tr><th>Trường</th><th>Có dữ liệu</th><th>Thiếu</th><th>Độ đầy đủ</th></tr></thead><tbody>{profile.fields.map((f:any)=><tr key={f.key}><td>{f.label}{f.required?' *':f.conditional?' (có điều kiện)':''}</td><td>{f.present}</td><td>{f.missing}</td><td>{profile.total?Math.round(f.present/profile.total*100)+'%':'—'}</td></tr>)}</tbody></table></div></>}
 </details><section className="panel pad"><div className="actions"><label>Nghiệp vụ <select aria-label="Nghiệp vụ" value={model.id} onChange={e=>{setModelId(e.target.value);setStatus('all');setValues({});setSelected('');setOffset(0)}}>{view.models.map((m:any)=><option key={m.id} value={m.id}>{m.definition.name} · v{m.version}</option>)}</select></label><button className="secondary" onClick={exportCsv}>Xuất CSV trang này</button></div>
 <div className="inventory-filters" aria-label="Trạng thái hồ sơ">{['all',...def.workflow.states,'overdue'].map((s:string)=><button key={s} aria-pressed={status===s} className="secondary small" onClick={()=>{setStatus(s);setOffset(0);setSelected('')}}>{s==='all'?'Tất cả':s==='overdue'?'Quá hạn':name(s)}</button>)}</div>
 <label>Tìm trong hồ sơ<input value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);setSelected('')}} placeholder="Mã hoặc nội dung hồ sơ" maxLength={200}/></label><div className="table-scroll"><table><thead><tr><th>Hồ sơ</th><th>Trạng thái</th><th>Hạn xử lý</th><th>Người tạo</th></tr></thead><tbody>{records.map((r:any)=><tr key={r.id}><td><button className="text-link" onClick={()=>{setSelected(r.id);setReason('')}}>{String(r.data[def.fields[0].key]||r.id)}</button><small>{r.id}</small></td><td>{name(r.status)}</td><td>{r.dueAt?new Date(r.dueAt).toLocaleString('vi-VN'):'—'}{r.overdue&&<b> · Quá hạn</b>}</td><td>{r.createdBy}</td></tr>)}{!records.length&&<tr><td colSpan={4}>Không có hồ sơ phù hợp.</td></tr>}</tbody></table></div><div className="actions"><button className="secondary" disabled={busy||offset===0} onClick={()=>{setOffset(Math.max(0,offset-50));setSelected('')}}>Trang trước</button><span>{view.page?.total||0} hồ sơ phù hợp · Trang {Math.floor(offset/50)+1}</span><button className="secondary" disabled={busy||!view.page?.hasMore} onClick={()=>{setOffset(offset+50);setSelected('')}}>Trang sau</button></div></section>
 {record&&<section className="panel pad"><h2>Chi tiết {record.id}</h2><dl>{def.fields.map((f:any)=><div key={f.key}><dt>{f.label}</dt><dd>{String(record.data[f.key]??'—')}</dd></div>)}</dl><label>Lý do / kết quả xử lý<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000}/></label><div className="actions">{def.workflow.transitions.filter((t:any)=>!record.process&&executableTasks(def,record,role,actor).some((task:any)=>task.id===t.to)).map((t:any)=><button key={t.to} disabled={busy} onClick={()=>run(async()=>{await mutate('models/'+model.id+'/transition',{id:record.id,version:record.version,target:t.to,reason});setReason('');setMessage('Đã cập nhật hồ sơ')})}>{name(t.to)}{t.reasonRequired?' (cần lý do)':''}</button>)}</div>{record.process&&<ProcessTasks definition={def} record={record} role={role} actor={actor} busy={busy} reason={reason} onComplete={(task:string)=>run(async()=>{await mutate('models/'+model.id+'/process-complete',{id:record.id,version:record.version,task,reason});setReason('');setMessage('Đã hoàn tất bước xử lý')})}/>}<h3>Lịch sử</h3>{record.history.length?record.history.map((h:any,i:number)=><p key={i}>{new Date(h.created).toLocaleString('vi-VN')} · {h.actor} · {name(h.from||'')} → {name(h.to||h.action)}{h.reason?' · '+h.reason:''}</p>):<p>Chưa có bước xử lý.</p>}</section>}
 {def.permissions.create.includes(role)&&<section className="panel pad"><h2>Tạo hồ sơ {def.name}</h2><form onSubmit={e=>{e.preventDefault();run(async()=>{await mutate('models/'+model.id+'/records',{data:values});setValues({});setMessage('Đã tạo hồ sơ')})}}><div className="form-grid">{def.fields.map((f:any)=><label key={f.key}><span>{f.label}{fieldRequired(f,values)?' *':''}</span>{f.type==='choice'||f.type==='boolean'?<select required={fieldRequired(f,values)} value={String(values[f.key]??'')} onChange={e=>setValues({...values,[f.key]:f.type==='boolean'?e.target.value===''?'':e.target.value==='true':e.target.value})}><option value="">Chọn</option>{(f.type==='boolean'?['true','false']:f.options).map((v:string)=><option key={v} value={v}>{v==='true'?'Có':v==='false'?'Không':v}</option>)}</select>:<input required={fieldRequired(f,values)} type={f.type==='number'?'number':f.type==='date'?'date':'text'} step={f.type==='number'?'any':undefined} minLength={f.minLength} maxLength={f.maxLength} min={f.min} max={f.max} value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:f.type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value})}/>}</label>)}</div><button disabled={busy}>Tạo hồ sơ</button></form></section>}</>:<section className="panel pad"><h2>Chưa có nghiệp vụ mở rộng</h2><p>Chủ không gian có thể xem kế hoạch và áp dụng mẫu bảo trì bên dưới. Mẫu yêu cầu một người khác phê duyệt hồ sơ.</p></section>}
 {role==='owner'&&<section className="panel pad"><h2>Cấu hình mô hình nghiệp vụ</h2>
 <details className="appkit-panel"><summary>Ứng dụng mở rộng · AppKit</summary>
  <p className="muted">Cài một ứng dụng khai báo, không chạy mã bên ngoài. Ứng dụng dùng lại tài khoản, dữ liệu, phân quyền và quy trình của nền tảng.</p>
  <label>Gói ứng dụng mẫu <select defaultValue="maintenance" onChange={e=>{setAppSource(JSON.stringify(e.target.value==='purchase'?purchaseApp:maintenanceApp,null,2));setAppPlan(null)}}>
   <option value="maintenance">Bảo trì thiết bị</option><option value="purchase">Yêu cầu mua sắm</option>
  </select></label>
  <label>Manifest JSON<textarea className="model-source" value={appSource} spellCheck={false} onChange={e=>{setAppSource(e.target.value);setAppPlan(null)}}/></label>
  <div className="actions">
   <button className="secondary" disabled={busy} onClick={()=>run(async()=>setAppPlan(await api('apps/plan',{manifest:JSON.parse(appSource)})))}>Xem kế hoạch cài đặt</button>
   <button disabled={busy||!appPlan||appPlan.unchanged||appPlan.rejections.length>0} onClick={()=>run(async()=>{
    await mutate('apps/install',{manifest:JSON.parse(appSource),baseVersion:appPlan.baseVersion});
    setModelId(appPlan.definition.id);setPlan(null);setAppPlan(null);setSelected('');setMessage('Đã cài ứng dụng khai báo');
   })}>Cài ứng dụng</button>
  </div>
  {appPlan&&<div role="status"><p>Phiên bản {appPlan.baseVersion} → {appPlan.nextVersion} · {appPlan.records} hồ sơ hiện có · {appPlan.unchanged?'Không thay đổi':appPlan.rejections.length?'Không thể cài':'Có thể cài'}</p>{appPlan.rejections.map((v:string)=><p key={v}>{v}</p>)}</div>}
 </details>
 <details className="appkit-panel"><summary>Gói nghiệp vụ · AppKit v2</summary>
  <p className="muted">Xem tác động từng mô hình trước khi cài đặt đồng thời. Nếu một mô hình không tương thích, cả gói sẽ bị từ chối.</p>
  <label>Gói JSON<textarea className="model-source" value={bundleSource} spellCheck={false} disabled={busy} onChange={e=>{setBundleSource(e.target.value);setBundlePlan(null)}}/></label>
  <div className="actions">
   <button className="secondary" disabled={busy} onClick={()=>run(async()=>{setBundlePlan(null);const bundle=JSON.parse(bundleSource);setBundlePlan({bundle,preview:await api('apps/bundle-plan',{bundle})})})}>Xem kế hoạch cả gói</button>
   <button disabled={busy||!bundlePlan?.preview.applicable||bundlePlan.preview.models.every((m:any)=>m.unchanged)} onClick={()=>run(async()=>{
    const result=await mutate('apps/bundle-install',{bundle:bundlePlan.bundle,baseVersions:bundlePlan.preview.baseVersions});
    setBundlePlan(null);setPlan(null);setAppPlan(null);setModelId(result.applications[0].id);setOffset(0);setStatus('all');setSelected('');setValues({});setMessage('Đã áp dụng gói nghiệp vụ');
   })}>Áp dụng toàn bộ gói</button>
  </div>
  {bundlePlan&&<div role="status"><p>{bundlePlan.preview.applicable?'Có thể áp dụng':'Không thể áp dụng'} · {bundlePlan.preview.models.length} mô hình</p>
   <div className="table-scroll"><table><thead><tr><th>Mô hình</th><th>Phiên bản</th><th>Hồ sơ</th><th>Kiểm tra</th></tr></thead><tbody>{bundlePlan.preview.models.map((m:any)=><tr key={m.id}><td>{m.id}</td><td>{m.baseVersion} → {m.nextVersion}</td><td>{m.records}</td><td>{m.rejections.length?m.rejections.join('; '):m.unchanged?'Không đổi':'Hợp lệ'}</td></tr>)}</tbody></table></div>
  </div>}
 </details><label>Thư viện mẫu<select defaultValue="maintenance" onChange={e=>{setSource(JSON.stringify(templates.find(t=>t.id===e.target.value),null,2));setPlan(null)}}>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><p>Xem tác động trước khi áp dụng. Không xóa hoặc đổi kiểu trường đang có dữ liệu. Muốn quay về phiên bản cũ, chọn phiên bản rồi xem kế hoạch lại.</p>{model&&<label>Phiên bản đã lưu<select aria-label="Phiên bản mô hình" defaultValue="" onChange={e=>{const h=model.history.find((h:any)=>h.version===Number(e.target.value));if(h){setSource(JSON.stringify(h.definition,null,2));setPlan(null)}}}><option value="">Chọn phiên bản</option>{model.history.map((h:any)=><option key={h.version} value={h.version}>v{h.version} · {h.created}</option>)}</select></label>}<label>Định nghĩa JSON<textarea className="model-source" value={source} spellCheck={false} onChange={e=>{setSource(e.target.value);setPlan(null)}}/></label>
 <div className="bpmn-import">
  <div className="actions"><strong>Trao đổi BPMN 2.0</strong>
   {model&&<a className="button secondary" href={'/api/models/'+encodeURIComponent(model.id)+'/bpmn'} download={'workflow-'+model.id+'.bpmn'}>Tải BPMN của mô hình</a>}
   {model&&<button className="secondary" disabled={busy} onClick={()=>{setSource(JSON.stringify(def,null,2));setPlan(null)}}>Sử dụng định nghĩa đang chọn</button>}
  </div>
  <p className="muted">Hỗ trợ start event, user task, cổng XOR và end event. Phân quyền và điều kiện nằm trong thuộc tính DX; không hỗ trợ toàn bộ BPMN hoặc trình kéo thả.</p>
  <label>Nhập file BPMN (.bpmn, XML)
   <input type="file" accept=".bpmn,.xml,application/xml,text/xml" onChange={async(e)=>{const file=e.target.files?.[0];if(!file)return;await run(async()=>{if(file.size>100000)throw new Error('Tệp BPMN vượt giới hạn 100 KB');setBpmnXml(await file.text());setPlan(null)})}}/>
  </label>
  <label>Nội dung BPMN cần kiểm tra<textarea className="model-source" rows={7} value={bpmnXml} spellCheck={false} placeholder="Chọn file BPMN đã xuất để chỉnh sửa hoặc nhập lại" onChange={e=>{setBpmnXml(e.target.value);setPlan(null)}}/></label>
  <button className="secondary" disabled={busy||!bpmnXml.trim()} onClick={()=>run(async()=>setPlan(await api('models/bpmn/plan',{xml:bpmnXml,definition:JSON.parse(source)})))}>Xem kế hoạch từ BPMN</button>
 </div><div className="actions"><button className="secondary" disabled={busy} onClick={()=>run(async()=>setPlan(await api('models/plan',{definition:JSON.parse(source)})))}>Xem kế hoạch</button><button disabled={busy||!plan||plan.rejections.length>0||plan.unchanged} onClick={()=>run(async()=>{await mutate('models/apply',{definition:plan.definition,baseVersion:plan.baseVersion});setModelId(plan.definition.id);setOffset(0);setStatus('all');setSelected('');setValues({});setPlan(null);setMessage('Đã áp dụng mô hình')})}>Áp dụng mô hình</button></div>{plan&&<div role="status"><p>Phiên bản {plan.baseVersion} → {plan.nextVersion} · {plan.records} hồ sơ hiện có · {plan.unchanged?'Không thay đổi':plan.rejections.length?'Không thể áp dụng':'Có thể áp dụng'}</p>{plan.rejections.map((r:string)=><p key={r}>{r}</p>)}</div>}</section>}
 </div>;
}
