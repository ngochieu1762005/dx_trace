/*
 * DX-TRACE | Warehouse commands, stock rules and incident transitions
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File lib/domain.mjs
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {applyPlatform} from './platform.mjs';
import {defaultWorkflow,advanceWorkflow} from './workflow.mjs';
import {seedDemo} from './demo.mjs';

export class DomainError extends Error {constructor(message,status=409){super(message);this.status=status}}
const fail=(m,s=409)=>{throw new DomainError(m,s)};
const str=(v,n=200)=>typeof v==='string'&&v.trim().length>0&&v.length<=n?v.trim():fail('Thông tin văn bản không hợp lệ',422);
const positive=v=>Number.isInteger(v)&&v>0&&v<=1e8?v:fail('Số lượng phải là số nguyên dương',422);
const within=(v,options)=>options.includes(v)?v:fail('Lựa chọn không hợp lệ',422);
export const initial=()=>({name:'Không gian của tôi',partners:[],lots:[],shipments:[],incidents:[],events:[],documents:[],devices:[],readings:[],files:[],requests:{}});
export const available=(s,l)=>l.quantity-s.shipments.filter(x=>x.lot===l.id&&x.status!=='cancelled').reduce((n,x)=>n+x.quantity,0);
export function apply(source,cmd,b,c){
 const s=structuredClone(source),created=c.now,entity=c.entity;let result={id:entity};let detail='';
 const manager=['owner','manager'].includes(c.role),write=['owner','manager','warehouse'].includes(c.role);
 if(!write&&cmd!=='sensor.ingest'&&!cmd.startsWith('platform.'))fail('Bạn không có quyền thực hiện thao tác',403);
 const lot=id=>s.lots.find(x=>x.id===id)||fail('Không tìm thấy lô hàng',404);
 const get=(a,id)=>s[a].find(x=>x.id===id)||fail('Không tìm thấy hồ sơ',404);
 const isActive=l=>l.status==='active'&&l.expiry>=created.slice(0,10);
 const incident=(lid,reason,severity)=>{const l=lot(lid);if(s.incidents.some(i=>i.lot===lid&&i.status!=='closed'))fail('Lô này đã có sự cố đang mở');l.status='quarantine';s.incidents.unshift({id:entity,lot:lid,reason,severity,status:'pending',created,updated:created});return l};
 switch(cmd){
 case 'workflow.create': {s.workflowRuns??=[];s.workflowRuns.unshift({id:entity,title:str(b.title),content:str(b.content,4000),definition:defaultWorkflow.id,status:'draft',created,updated:created});detail='Tạo đề xuất '+b.title;break}
 case 'workflow.transition': {s.workflowRuns??=[];const run=get('workflowRuns',b.id);try{Object.assign(run,advanceWorkflow(defaultWorkflow,run,b.target,c.role),{updated:created})}catch(e){fail(e.message,403)}detail='Chuyển đề xuất '+run.id+' → '+run.status;result={id:run.id};break}
 case 'demo.seed': {if(c.role!=='owner')fail('Chỉ chủ không gian được nạp mẫu',403);if(s.lots.length||s.partners.length||s.events.length)fail('Không gian đã có dữ liệu, không nạp đè');return {state:seedDemo(s,created),result:{ok:true}}}
 case 'partner.create':s.partners.unshift({id:entity,name:str(b.name),kind:within(b.kind,['supplier','destination']),contact:String(b.contact||'').slice(0,200),address:String(b.address||'').slice(0,500),created});detail='Thêm đối tác '+b.name;break;
 case 'lot.create':{
  const code=str(b.code,80);if(s.lots.some(l=>l.code===code))fail('Mã lô đã tồn tại');if(!s.partners.some(p=>p.id===b.supplier&&p.kind==='supplier'))fail('Nhà cung cấp không hợp lệ',422);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(b.expiry)||Number.isNaN(Date.parse(b.expiry))||new Date(b.expiry).toISOString().slice(0,10)!==b.expiry)fail('Ngày hết hạn không hợp lệ',422);
  if(!Number.isFinite(b.min_temp)||!Number.isFinite(b.max_temp)||b.min_temp>=b.max_temp||b.min_temp< -100||b.max_temp>150)fail('Ngưỡng nhiệt độ không hợp lệ',422);
  if(!/^\d{0,14}$/.test(b.barcode||''))fail('Mã vạch không hợp lệ',422);
  s.lots.unshift({id:entity,code,product:str(b.product),supplier:b.supplier,quantity:positive(b.quantity),unit:str(b.unit,30),expiry:b.expiry,location:str(b.location),min_temp:b.min_temp,max_temp:b.max_temp,barcode:b.barcode||'',notes:String(b.notes||'').slice(0,2000),status:'active',created});detail='Nhập lô '+code;break;
 }
 case 'shipment.create':{const l=lot(b.lot);if(!isActive(l))fail('Lô bị chặn hoặc đã hết hạn');if(!s.partners.some(p=>p.id===b.destination&&p.kind==='destination'))fail('Điểm nhận không hợp lệ');const q=positive(b.quantity);if(q>available(s,l))fail('Không đủ tồn kho khả dụng');s.shipments.unshift({id:entity,lot:l.id,destination:b.destination,quantity:q,status:'reserved',created,updated:created});detail='Giữ '+q+' '+l.unit+' từ '+l.code;break}
 case 'shipment.deliver':case 'shipment.cancel':case 'shipment.return':{
  const sh=get('shipments',b.id),l=lot(sh.lot);const action=cmd.split('.')[1];
  if(action==='deliver'){if(sh.status!=='reserved'||!isActive(l))fail('Không thể giao phiếu này');sh.status='delivered'}
  if(action==='cancel'){if(sh.status!=='reserved')fail('Chỉ hủy phiếu chưa giao');sh.status='cancelled'}
  if(action==='return'){if(sh.status!=='delivered'||!s.incidents.some(i=>i.lot===l.id&&i.status==='approved'))fail('Chưa đủ điều kiện nhận trả');const outstanding=sh.quantity-(sh.returnedQuantity||0);
   const received=positive(b.quantity===undefined?outstanding:b.quantity);
   if(received>outstanding)fail('Số lượng trả vượt số còn phải thu hồi');
   sh.returnedQuantity=(sh.returnedQuantity||0)+received;
   if(sh.returnedQuantity===sh.quantity)sh.status='returned';
   detail='Nhận trả '+received+' '+l.unit+' · '+sh.id+' · còn '+(outstanding-received)+' '+l.unit;}
  sh.updated=created;detail=detail||({deliver:'Xác nhận giao ',cancel:'Hủy phiếu ',return:'Xác nhận nhận trả '})[action]+sh.id;result={id:sh.id};break;
 }
 case 'quality.failure':{
  const old=s.incidents.find(i=>i.review?.ticket===b.ticket);
  if(old){
    if(old.lot!==b.lot||old.reason!==b.reason.trim()||old.severity!==b.severity)fail('Request key reused');
    return {state:s,result:{id:old.id}};
  }
  const l=incident(b.lot,str(b.reason,1500),within(b.severity,['medium','high','critical']));
  s.incidents[0].review={engine:'Flowable',ticket:b.ticket,reporter:b.reporter,instance:null,outcome:null};
  detail='Kiểm định không đạt · cách ly '+l.code;break;
 }
 case 'quality.bind':case 'quality.project':{
  const i=get('incidents',b.id),r=i.review;
  if(!r||!b.instance||r.instance&&r.instance!==b.instance)fail('Workflow binding conflict');
  if(cmd==='quality.bind')r.instance=b.instance;
  else{
    if(r.instance!==b.instance||r.outcome&&r.outcome!==b.outcome)fail('Workflow outcome conflict');
    r.outcome=within(b.outcome,['accepted','rejected']);
    if(r.outcome==='accepted'){i.status='approved';lot(i.lot).status='recall';}
    else i.status='review-rejected';
  }
  i.updated=created;result={id:i.id};detail='Flowable '+b.instance+' · '+(r.outcome||'running');break;
 }
 case 'incident.create':{const l=incident(b.lot,str(b.reason,2000),within(b.severity,['medium','high','critical']));detail='Cách ly '+l.code+': '+b.reason;break}
 case 'incident.approve':case 'incident.close':{
  if(!manager)fail('Cần quyền quản lý để phê duyệt',403);const i=get('incidents',b.id),l=lot(i.lot);
  if(cmd==='incident.approve'){if(i.review)fail('Quyết định thu hồi thuộc Flowable');if(i.status!=='pending')fail('Sự cố không ở trạng thái chờ duyệt');i.status='approved';l.status='recall';detail='Phê duyệt thu hồi '+l.code}
  else{if(i.status!=='approved')fail('Sự cố chưa được phê duyệt');if(s.shipments.some(sh=>sh.lot===i.lot&&['reserved','delivered'].includes(sh.status)))fail('Cần hủy phiếu chưa giao và nhận trả hết hàng đã giao');i.status='closed';detail='Đóng sự cố '+i.id+'; lô vẫn bị chặn xuất'}
  i.updated=created;result={id:i.id};break;
 }
 case 'document.create':s.documents.unshift({id:entity,title:str(b.title),content:str(b.content,20000),created});detail='Thêm tài liệu '+b.title;break;
 case 'device.create':if(!manager)fail('Cần quyền quản lý',403);lot(b.lot);s.devices.unshift({id:entity,name:str(b.name),lot:b.lot,active:true,created});detail='Kết nối thiết bị '+b.name;break;
 case 'device.revoke':{if(!manager)fail('Cần quyền quản lý',403);get('devices',b.id).active=false;detail='Thu hồi khóa '+b.id;break}
 case 'file.create':{if(!s.lots.some(l=>l.id===b.entity)&&!s.incidents.some(i=>i.id===b.entity))fail('Hồ sơ đính kèm không tồn tại',404);s.files.unshift({id:entity,entity:b.entity,name:str(b.name),mime:b.mime,size:b.size,hash:b.hash,scan:b.scan,created});detail='Lưu tệp '+b.name;break}
 case 'workspace.rename':if(c.role!=='owner')fail('Chỉ chủ không gian được đổi tên',403);s.name=str(b.name,100);detail='Đổi tên không gian';break;
 case 'sensor.ingest':{
  const d=get('devices',b.device);if(!d.active)fail('Khóa thiết bị đã bị thu hồi',401);const l=lot(d.lot);
  if(!Number.isFinite(b.temperature)||b.temperature< -100||b.temperature>150)fail('Nhiệt độ không hợp lệ',422);
  if(!b.recorded||Number.isNaN(Date.parse(b.recorded))||Math.abs(Date.parse(created)-Date.parse(b.recorded))>600000)fail('Thời gian đo phải trong vòng 10 phút hiện tại',422);
  const rid=d.id+':'+str(b.id,100);if(s.readings.some(r=>r.id===rid))return {state:s,result:{id:rid,duplicate:true}};
  s.readings.unshift({id:rid,device:d.id,lot:l.id,temperature:b.temperature,recorded:new Date(b.recorded).toISOString(),received:created});s.readings.sort((a,b)=>b.recorded.localeCompare(a.recorded));
  const recent=s.readings.filter(r=>r.device===d.id&&Date.parse(created)-Date.parse(r.recorded)<600000).slice(0,3);
  if(recent.length===3&&recent.every(r=>r.temperature<l.min_temp||r.temperature>l.max_temp)&&!s.incidents.some(i=>i.lot===l.id&&i.status!=='closed'))incident(l.id,'Ba lần đo liên tiếp vượt ngưỡng: '+d.name,'high');
  detail='Nhận số đo '+d.name+': '+b.temperature+' °C';result={id:rid};break;
 }
 default:if(cmd.startsWith('platform.')){result=applyPlatform(s,cmd,b,c);detail=cmd+' · '+result.id;break}fail('Không tìm thấy thao tác',404);
 }
 s.events.unshift({id:entity,actor:c.actor,action:cmd,entity:b.id||entity,detail,created});
 if(JSON.stringify(s).length>1800000)fail('Không gian đã đạt giới hạn lưu trữ của phiên bản này. Xuất dữ liệu để lưu trữ.',413);
 return {state:s,result};
}
export function insights(s,time=Date.now()){
 const out=[],today=new Date(time).toISOString().slice(0,10),soon=new Date(time+7*864e5).toISOString().slice(0,10);
 for(const l of s.lots){if(l.expiry<today)out.push({title:l.code+' đã hết hạn',detail:'Đã chặn xuất hàng theo hạn dùng.',lot:l.id,level:'high'});else if(l.expiry<=soon)out.push({title:l.code+' sắp hết hạn',detail:'Hạn sử dụng '+l.expiry+'. Kiểm tra số lượng còn trong kho.',lot:l.id,level:'medium'});for(const d of s.devices.filter(d=>d.lot===l.id&&d.active)){const r=s.readings.find(r=>r.device===d.id);if(!r||time-Date.parse(r.recorded)>900000)out.push({title:d.name+' mất cập nhật',detail:'Chưa có số đo trong 15 phút gần đây.',lot:l.id,level:'medium'})}}
 for(const i of s.incidents.filter(i=>i.status!=='closed'))out.push({title:i.id+' cần xử lý',detail:i.reason,lot:i.lot,level:i.severity});return out;
}
