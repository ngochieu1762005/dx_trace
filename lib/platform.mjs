/* DX-TRACE | Declarative records and workflow engine
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
export class PlatformError extends Error { constructor(message,status=422){super(message);this.status=status} }
const fail=(m,s=422)=>{throw new PlatformError(m,s)};
const roles=['owner','manager','warehouse','viewer'];
const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9_]{0,39}$/.test(v);
const text=(v,max=200)=>typeof v==='string'&&v.trim()&&v.length<=max;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validateModel(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Mô hình phải là đối tượng JSON');
 const m=structuredClone(input);
 if(!identifier(m.id)||!text(m.name))fail('Mã hoặc tên mô hình không hợp lệ');
 if(!Array.isArray(m.fields)||!m.fields.length||m.fields.length>30)fail('Mô hình cần 1–30 trường');
 const names=new Set();
 for(const f of m.fields){
  if(!f||typeof f!=='object'||!identifier(f.key)||['__proto__','constructor','prototype'].includes(f.key)||names.has(f.key)||!text(f.label))fail('Tên trường không hợp lệ hoặc trùng');
  names.add(f.key);
  if(!['text','number','boolean','date','choice'].includes(f.type))fail('Kiểu trường không hỗ trợ');
  if(f.required!==undefined&&typeof f.required!=='boolean')fail('required phải là boolean');
  if(f.type==='choice'&&(!Array.isArray(f.options)||!f.options.length||f.options.length>30||f.options.some(x=>!text(x))||new Set(f.options).size!==f.options.length))fail('Danh sách lựa chọn không hợp lệ');
 }
 const checkRoles=list=>Array.isArray(list)&&list.length>0&&list.every(r=>roles.includes(r))&&new Set(list).size===list.length;
 if(!m.permissions||!checkRoles(m.permissions.read)||!checkRoles(m.permissions.create)||!['all','own'].includes(m.permissions.scope))fail('Quyền đọc/tạo/phạm vi không hợp lệ');
 if(m.permissions.create.some(r=>!m.permissions.read.includes(r)))fail('Vai trò tạo phải có quyền đọc');
 const w=m.workflow;
 if(!w||!Array.isArray(w.states)||!w.states.length||w.states.length>20||w.states.some(x=>!identifier(x))||new Set(w.states).size!==w.states.length||!w.states.includes(w.initial))fail('Trạng thái quy trình không hợp lệ');
 if(!Array.isArray(w.terminal)||w.terminal.some(x=>!w.states.includes(x))||!Array.isArray(w.transitions)||w.transitions.length>50)fail('Quy trình không hợp lệ');
 const edges=new Set();
 for(const t of w.transitions){
  if(!t||typeof t!=='object')fail('Bước chuyển phải là đối tượng');
  const id=t.from+':'+t.to;
  if(!w.states.includes(t.from)||!w.states.includes(t.to)||w.terminal.includes(t.from)||t.from===t.to||edges.has(id)||!checkRoles(t.roles)||t.roles.some(r=>!m.permissions.read.includes(r)))fail('Bước chuyển không hợp lệ');
  edges.add(id);
  for(const flag of ['reasonRequired','differentActor'])if(t[flag]!==undefined&&typeof t[flag]!=='boolean')fail('Điều kiện bước chuyển phải là boolean');
  if(t.dueHours!==undefined&&(!Number.isInteger(t.dueHours)||t.dueHours<1||t.dueHours>8760))fail('Hạn xử lý phải từ 1 đến 8760 giờ');
 }
 return m;
}
export function validateValues(model,data){
 if(!data||typeof data!=='object'||Array.isArray(data))fail('Dữ liệu phải là đối tượng');
 const keys=new Set(model.fields.map(f=>f.key));
 if(Object.keys(data).some(k=>!keys.has(k)))fail('Có trường không thuộc mô hình');
 const result={};
 for(const f of model.fields){const v=data[f.key];
  if(v===undefined||v===null||v===''){if(f.required)fail('Thiếu trường: '+f.label);continue}
  if(f.type==='text'&&!text(v,4000)||f.type==='number'&&(typeof v!=='number'||!Number.isFinite(v))||f.type==='boolean'&&typeof v!=='boolean'||f.type==='choice'&&!f.options.includes(v))fail('Giá trị không hợp lệ: '+f.label);
  if(f.type==='date'&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))fail('Ngày không hợp lệ: '+f.label);
  result[f.key]=v;
 }
 return result;
}
export const canRead=(model,record,c)=>model.permissions.read.includes(c.role)&&(model.permissions.scope==='all'||['owner','manager'].includes(c.role)||record.createdBy===c.actor);
export function planModel(state,input){
 const definition=validateModel(input),old=(state.models||[]).find(x=>x.id===definition.id),records=(state.records||[]).filter(x=>x.model===definition.id);
 const rejections=[];
 if(old){
  for(const f of old.definition.fields){const next=definition.fields.find(x=>x.key===f.key);if(records.length&&(!next||next.type!==f.type))rejections.push('Không xóa hoặc đổi kiểu trường đã có dữ liệu: '+f.key)}
  if(!same(old.definition.workflow,definition.workflow)&&records.some(r=>!old.definition.workflow.terminal.includes(r.status)))rejections.push('Có hồ sơ chưa kết thúc; chưa thể đổi quy trình');
 }
 for(const r of records){try{validateValues(definition,r.data);if(!definition.workflow.states.includes(r.status))fail('Trạng thái cũ không tồn tại')}catch(e){rejections.push(r.id+': '+e.message)}}
 return {definition,baseVersion:old?.version||0,nextVersion:(old?.version||0)+1,records:records.length,unchanged:old?same(old.definition,definition):false,rejections};
}
export function applyPlatform(state,cmd,b,c){
 state.models??=[];state.records??=[];
 const model=()=>state.models.find(x=>x.id===b.model)||fail('Không tìm thấy mô hình',404);
 if(cmd==='platform.apply'){
  if(c.role!=='owner')fail('Chỉ chủ không gian được áp dụng mô hình',403);
  const p=planModel(state,b.definition);if(b.baseVersion!==p.baseVersion)fail('Mô hình đã thay đổi, hãy xem kế hoạch lại',409);
  if(p.rejections.length)fail(p.rejections.join('; '),409);
  if(p.unchanged)return {id:p.definition.id,version:p.baseVersion,unchanged:true};
  const old=state.models.find(x=>x.id===p.definition.id);
  const next={id:p.definition.id,version:p.nextVersion,definition:p.definition,updated:c.now,history:[...(old?.history||[]),{version:p.nextVersion,definition:p.definition,actor:c.actor,created:c.now}]};
  if(next.history.length>50)fail('Đã đạt 50 phiên bản mô hình; cần lưu trữ trước khi tiếp tục',409);
  state.models=state.models.filter(x=>x.id!==next.id);state.models.push(next);return {id:next.id,version:next.version};
 }
 const m=model(),def=m.definition;
 if(cmd==='platform.create'){
  if(!def.permissions.create.includes(c.role))fail('Không có quyền tạo hồ sơ',403);
  const record={id:c.entity,model:m.id,modelVersion:m.version,version:1,data:validateValues(def,b.data),status:def.workflow.initial,createdBy:c.actor,created:c.now,updated:c.now,history:[]};
  state.records.push(record);return {id:record.id,version:1};
 }
 const r=state.records.find(x=>x.id===b.id&&x.model===m.id)||fail('Không tìm thấy hồ sơ',404);
 if(!canRead(def,r,c))fail('Không có quyền đọc hồ sơ',403);
 if(b.version!==r.version)fail('Hồ sơ đã thay đổi, hãy tải lại',409);
 if(cmd==='platform.update'){
  if(!def.permissions.create.includes(c.role)||r.createdBy!==c.actor||r.status!==def.workflow.initial)fail('Chỉ sửa hồ sơ của mình ở trạng thái đầu',403);
  const next=validateValues(def,b.data);r.history.push({action:'update',actor:c.actor,created:c.now,before:r.data,after:next});r.data=next;
 }else if(cmd==='platform.transition'){
  const edge=def.workflow.transitions.find(t=>t.from===r.status&&t.to===b.target);
  if(!edge)fail('Bước chuyển không hợp lệ',409);
  if(!edge.roles.includes(c.role))fail('Không có quyền thực hiện bước này',403);
  if(edge.differentActor&&r.createdBy===c.actor)fail('Người tạo không được tự phê duyệt',403);
  if(edge.reasonRequired&&!text(b.reason,2000))fail('Bước này bắt buộc có lý do');
  if(b.reason!==undefined&&typeof b.reason!=='string')fail('Lý do phải là văn bản');
  r.history.push({action:'transition',from:r.status,to:b.target,reason:(b.reason||'').slice(0,2000),actor:c.actor,created:c.now});
  r.status=b.target;r.dueAt=edge.dueHours?new Date(Date.parse(c.now)+edge.dueHours*3600000).toISOString():null;
 }else fail('Không tìm thấy thao tác',404);
 r.version++;r.updated=c.now;return {id:r.id,version:r.version};
}
export function platformView(state,c){
 const models=(state.models||[]).filter(m=>m.definition.permissions.read.includes(c.role)).map(m=>({...m,history:c.role==='owner'?m.history:undefined}));
 const records=(state.records||[]).filter(r=>{const m=models.find(m=>m.id===r.model);return m&&canRead(m.definition,r,c)}).map(r=>({...r,overdue:!!r.dueAt&&r.dueAt<c.now&&!models.find(m=>m.id===r.model).definition.workflow.terminal.includes(r.status)}));
 return {models,records,summary:{total:records.length,overdue:records.filter(r=>r.overdue).length,byStatus:records.reduce((out,r)=>{out[r.status]=(out[r.status]||0)+1;return out},{})}};
}
export function modelOpenApi(def){
 const properties=Object.fromEntries(def.fields.map(f=>[f.key,{type:f.type==='number'?'number':f.type==='boolean'?'boolean':'string',...(f.type==='date'?{format:'date'}:{}),...(f.type==='choice'?{enum:f.options}:{})}]));
 const base='/api/models/'+def.id;
 const response={200:{description:'Thành công'},401:{description:'Chưa đăng nhập'},403:{description:'Không đủ quyền'},409:{description:'Xung đột phiên bản'},422:{description:'Dữ liệu không hợp lệ'}};
 return {openapi:'3.0.3',info:{title:def.name,version:'1'},components:{schemas:{Data:{type:'object',additionalProperties:false,properties,required:def.fields.filter(f=>f.required).map(f=>f.key)}},securitySchemes:{session:{type:'apiKey',in:'cookie',name:'_oauth2_proxy'}}},security:[{session:[]}],paths:{[base+'/transition']:{post:{summary:'Chuyển trạng thái: id, version, target, reason; yêu cầu Idempotency-Key',responses:response}},[base+'/records']:{get:{summary:'Danh sách theo quyền hiện tại',responses:response},post:{summary:'Tạo hồ sơ',parameters:[{in:'header',name:'Idempotency-Key',required:true,schema:{type:'string'}}],requestBody:{required:true,content:{'application/json':{schema:{type:'object',properties:{data:{$ref:'#/components/schemas/Data'}},required:['data']}}}},responses:response}}}};
}
