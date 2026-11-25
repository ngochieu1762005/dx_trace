/* DX-TRACE | Quality Control Portal client
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 *
 * No privileged API token, database credentials, or direct Core access.
 * All business decisions remain authoritative in the shared Core API.
 */
import {workspaceUrl} from '/shared/workspace.mjs';
const areaPath = path => workspaceUrl(path,location.search);
const el = (id) => document.getElementById(id);
const state = {me:null,definition:null,records:[],lots:[],pending:null,offset:0,generation:0,mutation:null};
const labels = {
  draft:'Bản nháp', submitted:'Chờ thẩm định', approved:'Đã duyệt',
  rejected:'Không đạt', done:'Đã hoàn tất'
};
const transitions = {
  submitted:'Gửi thẩm định', approved:'Phê duyệt',
  rejected:'Từ chối', done:'Hoàn tất'
};

function notice(message, isError = false) {
  const target = el('notice');
  target.textContent = message;
  target.classList.toggle('error', isError);
}
async function api(path, body) {
  const fingerprint=body===undefined?null:JSON.stringify([path,body]);
  if(fingerprint&&state.mutation?.fingerprint!==fingerprint)state.mutation={fingerprint,key:crypto.randomUUID()};
  const response = await fetch(areaPath(path), {
    method:body === undefined ? 'GET' : 'POST',
    credentials:'same-origin',
    headers:body === undefined ? {} : {
      'content-type':'application/json',
      'idempotency-key':state.mutation.key
    },
    body:body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if(!response.ok) throw new Error(payload.error || 'Core API trả về lỗi ' + response.status);
  if(fingerprint)state.mutation=null;
  return payload;
}
function line(tag, value, className = '') {
  const element = document.createElement(tag);
  element.textContent = String(value ?? '');
  if(className) element.className = className;
  return element;
}
function formatDate(iso) {
  return iso ? new Intl.DateTimeFormat('vi-VN', {
    dateStyle:'short', timeStyle:'short'
  }).format(new Date(iso)) : 'Chưa đặt';
}
function canTransition(record, edge) {
  if(!edge.roles.includes(state.me.role)) return false;
  if(edge.differentActor && record.createdBy === state.me.email) return false;
  return true;
}
function showDecision(record, edge) {
  state.pending = {record,edge};
  el('decision-error').textContent='';
  el('severity-field').hidden=true;
  el('decision-reason').maxLength=2000;
  el('decision-title').textContent = transitions[edge.to] || edge.to;
  el('decision-description').textContent =
    'Hồ sơ ' + record.id + ' · ' + labels[record.status] + ' → ' + labels[edge.to];
  el('decision-reason').value = '';
  el('decision-reason').required = !!edge.reasonRequired;
  el('decision').showModal();
}
function drawRecord(record) {
  const article = document.createElement('article');
  article.className = 'record';
  const head = document.createElement('div');
  head.className = 'record-head';
  const title = document.createElement('div');
  title.append(line('strong', record.data.lot || 'Chưa có mã lô'));
  title.append(line('small', record.id));
  const badge = line('span', labels[record.status] || record.status, 'status ' + record.status);
  head.append(title,badge);
  article.append(head);
  article.append(line('p', record.data.finding, 'finding'));
  const info = document.createElement('div');
  info.className = 'meta';
  info.append(line('span','Lập bởi: ' + record.createdBy));
  info.append(line('span','Phiên bản: ' + record.version));
  if(record.dueAt) info.append(line('span','Hạn: ' + formatDate(record.dueAt) +
    (record.overdue ? ' (quá hạn)' : '')));
  article.append(info);
  const actions = document.createElement('div');
  actions.className = 'record-actions';
  const edges = state.definition.workflow.transitions.filter((edge) =>
    edge.from === record.status && canTransition(record,edge));
  for(const edge of edges) {
    const button = line('button',transitions[edge.to] || edge.to);
    button.type = 'button';
    button.className = edge.to === 'rejected' ? 'danger' : 'secondary';
    button.addEventListener('click',()=>showDecision(record,edge));
    actions.append(button);
  }
  const lot=state.lots.find(item=>item.code===record.data.lot);
  if(record.warehouseIncident){
    article.append(line('p','Đã liên kết sự cố '+record.warehouseIncident.id,'linked'));
    const link=line('a','Xem sự cố trong kho →');
    link.href=areaPath('/#incidents/'+record.warehouseIncident.id);actions.append(link);
  }else if(record.status==='rejected'&&['owner','manager'].includes(state.me.role)){
    const button=line('button',lot?'Cách ly & mở sự cố':'Không tìm thấy lô trong kho');
    button.className='danger';button.type='button';button.disabled=!lot;
    button.addEventListener('click',()=>{
      state.pending={record,lot,escalate:true};
      el('decision-title').textContent='Cách ly lô '+lot.code;
      el('decision-description').textContent='Lô bị chặn xuất ngay khi xác nhận. Nếu đã có sự cố đang mở, phiếu sẽ liên kết vào sự cố đó. Quyết định thu hồi cần phê duyệt riêng.';
      el('decision-reason').value='';el('decision-reason').required=true;el('decision-reason').maxLength=1500;
      el('severity-field').hidden=false;el('severity').value='high';el('decision-error').textContent='';
      el('decision').showModal();
    });actions.append(button);
  }
  if(lot){const trace=line('a','Hồ sơ lô →');trace.href=areaPath('/#trace/'+lot.id);actions.append(trace);}
  if(actions.childNodes.length) article.append(actions);
  if(record.history?.length){
    const history=document.createElement('details');history.append(line('summary','Lịch sử xử lý ('+record.history.length+')'));
    for(const item of record.history)history.append(line('p',formatDate(item.created)+' · '+item.actor+' · '+(labels[item.to]||item.action)+(item.reason?' · '+item.reason:'')));
    article.append(history);
  }
  return article;
}
function render(view) {
  state.definition = view.models.find((entry) => entry.id === 'quality')?.definition;
  state.records = view.records;
  el('total').textContent = String(view.summary.total);
  el('overdue').textContent = String(view.summary.overdue);
  el('pending').textContent = String(view.summary.byStatus.submitted || 0);
  el('completed').textContent = String(view.summary.byStatus.done || 0);
  const root = el('records');
  root.replaceChildren();
  if(!state.records.length) root.append(line('p','Chưa có hồ sơ nào trong phạm vi được phép xem.','empty'));
  else for(const record of state.records) root.append(drawRecord(record));
  el('creation-panel').hidden = !state.definition.permissions.create.includes(state.me.role);
  el('workspace').hidden = false;
  el('setup').hidden = true;
  el('previous').disabled=state.offset===0;el('next').disabled=!view.page.hasMore;
  el('page-info').textContent=view.page.total+' hồ sơ · Trang '+(Math.floor(state.offset/25)+1);
}
async function refresh() {
  const generation=++state.generation;
  const query=new URLSearchParams({limit:'25',offset:String(state.offset),q:el('query').value.trim(),status:el('status-filter').value});
  const [view,session]=await Promise.all([api('/api/models/quality/records?'+query),api('/api/state')]);
  if(generation!==state.generation)return;
  state.me=session.me;state.lots=session.lots;
  const selected=el('lot').value;el('lot').replaceChildren(line('option','Chọn lô hàng'));el('lot').firstChild.value='';
  for(const lot of state.lots){const option=line('option',lot.code+' · '+lot.product);option.value=lot.code;el('lot').append(option);}
  el('lot').value=selected;
  render(view);
}
async function reload(){try{await refresh();notice('Đã cập nhật hồ sơ trong kho hiện tại.');}catch(error){notice(error.message,true);}}
async function init() {
  try {
    const session = await api('/api/state');
    state.me = session.me;state.lots=session.lots;
    el('area-label').textContent=session.demo?'Kho thực hành':'Kho vận hành';
    el('warehouse-link').href=areaPath('/#overview');
    el('platform-link').href=areaPath('/#platform');
    el('identity').textContent = session.me.name + ' · ' + ({owner:'Chủ không gian',manager:'Quản lý',warehouse:'Nhân viên kho',viewer:'Chỉ xem'}[session.me.role] || session.me.role);
    const installed = await api('/api/apps');
    if(installed.applications.some((item)=>item.id === 'quality')) {
      await refresh();
      notice('');
      return;
    }
    el('workspace').hidden = true;
    el('setup').hidden = false;
    const isOwner = state.me.role === 'owner';
    el('install').hidden = !isOwner;
    el('setup-description').textContent = isOwner ?
      'Chủ không gian có thể xem trước kế hoạch và cài manifest, không thay đổi kho hoặc các ứng dụng khác.' :
      'Chỉ chủ không gian có quyền cài manifest. Liên hệ quản trị viên rồi tải lại trang.';
    notice('Core đang hoạt động; mô hình chất lượng chưa được cài trong không gian này.');
  } catch(error) {
    notice(error.message, true);
  }
}
el('install').addEventListener('click',async()=>{
  const button = el('install');
  button.disabled = true;
  try {
    const response = await fetch('/apps/quality/manifest.json',{credentials:'same-origin'});
    if(!response.ok) throw new Error('Không thể tải manifest ứng dụng');
    const manifest = await response.json();
    const plan = await api('/api/apps/plan',{manifest});
    if(plan.rejections.length) throw new Error(plan.rejections.join('; '));
    if(!plan.unchanged) {
      const consent = confirm('Cài ứng dụng Kiểm soát chất lượng phiên bản ' +
        manifest.metadata.version + '? Lõi sẽ ghi lại thay đổi trong nhật ký.');
      if(!consent) return;
      await api('/api/apps/install',{manifest,baseVersion:plan.baseVersion});
    }
    await init();
  } catch(error) { notice(error.message,true); }
  finally {button.disabled = false;}
});
el('record-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const form=event.currentTarget;
  const submit=form.querySelector('button[type=submit]');
  submit.disabled=true;
  try{
    await api('/api/models/quality/records',{data:{
      lot:el('lot').value.trim(),finding:el('finding').value.trim()
    }});
    form.reset();
    await refresh();notice('Đã lưu phiếu kiểm tra.');
  } catch(error){notice(error.message,true);}
  finally{submit.disabled=false;}
});
el('refresh').addEventListener('click',reload);
el('filters').addEventListener('submit',event=>{event.preventDefault();state.offset=0;reload();});
el('status-filter').addEventListener('change',()=>{state.offset=0;reload();});
el('previous').addEventListener('click',()=>{state.offset=Math.max(0,state.offset-25);reload();});
el('next').addEventListener('click',()=>{state.offset+=25;reload();});
el('cancel-decision').addEventListener('click',()=>el('decision').close());
el('decision-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const pending=state.pending;if(!pending)return;
  const {record,edge,lot,escalate}=pending;
  const reason=el('decision-reason').value.trim();
  if((escalate||edge.reasonRequired)&&!reason){el('decision-error').textContent='Cần ghi rõ lý do.';return;}
  const submit=event.currentTarget.querySelector('button[type=submit]');submit.disabled=true;
  try{
    if(escalate)await api('/api/quality/'+record.id+'/escalate',{version:record.version,lot:lot.id,reason,severity:el('severity').value});
    else await api('/api/models/quality/transition',{id:record.id,version:record.version,target:edge.to,reason});
    state.pending=null;el('decision').close();await refresh();
    notice(escalate?'Đã liên kết sự cố; lô bị chặn xuất.':'Đã cập nhật kết quả thẩm định.');
  }catch(error){el('decision-error').textContent=error.message;notice(error.message,true);}
  finally{submit.disabled=false;}
});
init();
