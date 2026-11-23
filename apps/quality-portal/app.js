/* DX-TRACE | Quality Control Portal client
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 *
 * No privileged API token, database credentials, or direct Core access.
 * All business decisions remain authoritative in the shared Core API.
 */
const el = (id) => document.getElementById(id);
const state = {me:null,definition:null,records:[],pending:null};
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
  const response = await fetch(path, {
    method:body === undefined ? 'GET' : 'POST',
    credentials:'same-origin',
    headers:body === undefined ? {} : {
      'content-type':'application/json',
      'idempotency-key':crypto.randomUUID()
    },
    body:body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if(!response.ok) throw new Error(payload.error || 'Core API trả về lỗi ' + response.status);
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
  if(edges.length) article.append(actions);
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
  el('record-form').hidden = !state.definition.permissions.create.includes(state.me.role);
  el('workspace').hidden = false;
  el('setup').hidden = true;
  notice('Đã kết nối Core API. Định danh và quyền được xác thực ở máy chủ.');
}
async function refresh() {
  try {
    const view = await api('/api/models/quality/records?limit=50');
    render(view);
  } catch (error) {
    notice(error.message, true);
  }
}
async function init() {
  try {
    const session = await api('/api/state');
    state.me = session.me;
    el('identity').textContent = session.me.name + ' · ' + session.me.role;
    const installed = await api('/api/apps');
    if(installed.applications.some((item)=>item.id === 'quality')) return refresh();
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
    await refresh();
  } catch(error){notice(error.message,true);}
  finally{submit.disabled=false;}
});
el('refresh').addEventListener('click',refresh);
el('cancel-decision').addEventListener('click',()=>el('decision').close());
el('decision-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const {record,edge}=state.pending || {};
  if(!record||!edge)return;
  const reason=el('decision-reason').value.trim();
  if(edge.reasonRequired&&!reason) {notice('Bước này cần ghi rõ lý do.',true);return;}
  const submit=event.currentTarget.querySelector('button[type=submit]');
  submit.disabled=true;
  try{
    await api('/api/models/quality/transition',{
      id:record.id,version:record.version,target:edge.to,reason
    });
    el('decision').close();
    await refresh();
  }catch(error){notice(error.message,true);await refresh();}
  finally{submit.disabled=false;state.pending=null;}
});
init();
