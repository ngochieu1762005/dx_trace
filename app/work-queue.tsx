/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Workspace-scoped operations queue.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import React,{useEffect,useState} from 'react';
import {executableTasks} from '../lib/task-view.mjs';
import {workspaceUrl} from '../public/shared/workspace.mjs';
export default function WorkQueue({api,state}:any){
 const [view,setView]=useState<any>(null),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;async function load(){try{const next=await api('models?open=1&order=due&limit=200');if(active){setView(next);setError('')}}catch(e:any){if(active)setError(e.message)}}load();const t=setInterval(load,30000);return()=>{active=false;clearInterval(t)}},[api,state.revision]);
 const role=state.me.role,manager=['owner','manager'].includes(role),write=manager||role==='warehouse';
 const items:any[]=[];
 const lotName=(id:string)=>state.lots.find((lot:any)=>lot.id===id)?.code||id;
 if(manager)for(const incident of state.incidents.filter((i:any)=>i.status!=='closed'))items.push({id:incident.id,kind:'incidents',title:lotName(incident.lot)+' · '+(incident.status==='pending'?'Thẩm định sự cố':'Đối soát thu hồi'),detail:incident.reason,priority:0,href:'/#incidents/'+incident.id});
 if(write)for(const shipment of state.shipments.filter((s:any)=>s.status==='reserved'))items.push({id:shipment.id,kind:'shipments',title:lotName(shipment.lot)+' · Phiếu chờ giao',detail:shipment.quantity+' đơn vị · Kiểm tra trạng thái lô trước khi xác nhận.',priority:2,href:'/#shipments'});
 if(manager)for(const run of (state.workflowRuns||[]).filter((r:any)=>r.status==='submitted'))items.push({id:run.id,kind:'requests',title:run.title,detail:'Đề xuất nội bộ chờ quyết định',priority:2,href:'/#requests'});
 for(const record of view?.records||[]){
  const definition=view.models.find((model:any)=>model.id===record.model)?.definition;
  if(!definition||!executableTasks(definition,record,role,state.me.email).length)continue;
  items.push({id:record.id,kind:'models',title:definition.name+' · '+String(record.data[definition.fields[0].key]||record.id),detail:record.overdue?'Đã quá hạn xử lý':record.dueAt?'Hạn: '+new Date(record.dueAt).toLocaleString('vi-VN'):'Có bước đang chờ bạn',priority:record.overdue?0:1,href:'/#platform/'+record.model+'/'+record.id});
 }
 items.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
 const filtered=items.filter(item=>filter==='all'||item.kind===filter),current=Math.min(page,Math.max(0,Math.ceil(filtered.length/25)-1));
 return <section className="panel pad work-queue"><div className="queue-intro"><div><p className="section-kicker">ƯU TIÊN XỬ LÝ</p><h2>Việc chờ bạn trong kho này</h2><p>Sự cố, giao nhận và hồ sơ nghiệp vụ được gom theo quyền của tài khoản.</p></div><strong>{items.length}<small>mục hiển thị</small></strong></div>
  {error&&<p role="alert" className="notice danger">Không tải được hồ sơ mở rộng: {error}</p>}
  <div className="inventory-filters" role="group" aria-label="Loại công việc">{[['all','Tất cả'],['incidents','Sự cố'],['shipments','Giao nhận'],['models','Nghiệp vụ'],['requests','Đề xuất']].map(([value,label])=><button key={value} className="secondary small" aria-pressed={filter===value} onClick={()=>{setFilter(value);setPage(0)}}>{label}</button>)}</div>
  <div className="queue-list">{filtered.slice(current*25,current*25+25).map(item=><a key={item.id} href={workspaceUrl(item.href,location.search)}><span className={'queue-priority p'+item.priority}>{item.priority===0?'Ưu tiên':'Chờ xử lý'}</span><span><b>{item.title}</b><small>{item.detail}</small><code>{item.id}</code></span><span aria-hidden="true">→</span></a>)}{!filtered.length&&<p className="empty-result">{view?'Chưa có việc phù hợp trong danh sách hiện tại.':'Đang tải hồ sơ nghiệp vụ…'}</p>}</div>
  {filtered.length>25&&<nav className="pager" aria-label="Trang công việc"><button className="secondary small" disabled={!current} onClick={()=>setPage(current-1)}>Trước</button><span>Trang {current+1}</span><button className="secondary small" disabled={(current+1)*25>=filtered.length} onClick={()=>setPage(current+1)}>Sau</button></nav>}
  {view?.page.hasMore&&<p className="notice">Đang xét 200 hồ sơ mở rộng gần hạn nhất trong {view.page.total} hồ sơ đang mở. <a href="#platform">Mở danh sách đầy đủ</a>.</p>}
  <small className="muted">Danh sách tự cập nhật; quyền và điều kiện thực hiện được kiểm tra lại khi lưu thao tác.</small>
 </section>;
}
