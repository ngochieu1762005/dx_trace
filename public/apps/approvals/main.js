/*
 * DX-TRACE | Standalone approvals client, shared DX-OS Core API
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors
 * Licensed under the MIT License; see LICENSE at the repository root.
 */
const $=(id)=>document.getElementById(id);
const statuses={draft:'Bản nháp',submitted:'Chờ duyệt',approved:'Đã duyệt',rejected:'Từ chối'};
let role='viewer';
const route=(path)=>'/api/'+path+($('training').checked?'?area=training':'');
async function api(path,data){
 const res=await fetch(route(path),{method:data===undefined?'GET':'POST',credentials:'same-origin',headers:data===undefined?{}:{'content-type':'application/json','idempotency-key':crypto.randomUUID()},body:data===undefined?undefined:JSON.stringify(data)});
 const payload=await res.json();
 if(!res.ok)throw Error(payload.error||'Không thể thực hiện yêu cầu');
 return payload;
}
function text(node,value){node.textContent=String(value??'')}
function btn(label,callback,secondary=false){
 const b=document.createElement('button');
 text(b,label);if(secondary)b.className='secondary';
 b.addEventListener('click',async()=>{b.disabled=true;try{await callback();await load()}catch(err){text($('message'),err.message)}finally{b.disabled=false}});
 return b;
}
function display(run){
 const el=document.createElement('article');el.className='item';
 const top=document.createElement('div');top.className='row';
 const title=document.createElement('h3');text(title,run.title);
 const tag=document.createElement('span');tag.className='tag';text(tag,statuses[run.status]||run.status);
 top.append(title,tag);el.append(top);
 const info=document.createElement('small');text(info,run.id);el.append(info);
 const body=document.createElement('p');text(body,run.content);el.append(body);
 const controls=document.createElement('div');controls.className='tools';
 const canSubmit=['owner','manager','warehouse'].includes(role),canApprove=['owner','manager'].includes(role);
 if(run.status==='draft'&&canSubmit)controls.append(btn('Gửi duyệt',()=>api('workflow/'+encodeURIComponent(run.id)+'/transition',{target:'submitted'})));
 if(run.status==='submitted'&&canApprove){
  controls.append(btn('Phê duyệt',()=>api('workflow/'+encodeURIComponent(run.id)+'/transition',{target:'approved'})));
  controls.append(btn('Từ chối',()=>api('workflow/'+encodeURIComponent(run.id)+'/transition',{target:'rejected'}),true));
 }
 el.append(controls);return el;
}
async function load(){
 text($('message'),'');
 try{
  const [state,platform]=await Promise.all([api('state'),api('platform')]);
  role=state.me.role;
  text($('who'),(state.me.name||state.me.email)+' · '+role);
  text($('count'),(state.workflowRuns||[]).length+' đề xuất');
  $('save').disabled=!['owner','manager','warehouse'].includes(role);
  const list=$('items');list.replaceChildren();
  for(const run of state.workflowRuns||[])list.append(display(run));
  if(!list.children.length)text(list,'Chưa có đề xuất nào. Tạo bản nháp để bắt đầu.');
  if(!platform.applications?.some(x=>x.id==='requests'))throw Error('Core API chưa khai báo ứng dụng phê duyệt');
 }catch(err){
  text($('message'),err.message);
  text($('items'),'Không thể đọc dữ liệu chung. Hãy đăng nhập vào DX-TRACE trước.');
 }
}
$('form').addEventListener('submit',async(e)=>{
 e.preventDefault();$('save').disabled=true;
 try{await api('workflow',{title:$('title').value.trim(),content:$('content').value.trim()});$('form').reset();await load()}
 catch(err){text($('message'),err.message)}
 finally{$('save').disabled=false}
});
$('refresh').addEventListener('click',load);
$('training').addEventListener('change',load);
await load();
