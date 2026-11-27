/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import React from 'react';

type Props = {source:string; onChange:(text:string)=>void; disabled:boolean};
export default function AppStudio({source,onChange,disabled}:Props){
 let app;
 try{app=JSON.parse(source)}catch{return null}
 const model=app?.spec?.model;
 if(!model||!Array.isArray(model.fields)||!Array.isArray(model.workflow?.transitions)||!app.metadata)return null;
 function edit(change:()=>void){change();onChange(JSON.stringify(app,null,2))}
 return <fieldset disabled={disabled}><legend>App Studio</legend>
  <label>Tên ứng dụng<input value={model.name||''} onChange={e=>edit(()=>{model.name=e.target.value;app.metadata.name=e.target.value})}/></label>
  <label>Phiên bản<input value={app.metadata.version||''} onChange={e=>edit(()=>{app.metadata.version=e.target.value})}/></label>
  <h3>Trường dữ liệu</h3>
  {model.fields.map((field:any,i:number)=><div className="actions" key={i}><code>{field.key}</code>
   <label>Nhãn<input value={field.label||''} onChange={e=>edit(()=>{field.label=e.target.value})}/></label>
   <label><input type="checkbox" checked={!!field.required} onChange={e=>edit(()=>{field.required=e.target.checked})}/> Bắt buộc</label></div>)}
  <button type="button" className="secondary" onClick={()=>edit(()=>{
   const keys=new Set(model.fields.map((f:any)=>f.key));let i=1;while(keys.has('field_'+i))i++;
   model.fields.push({key:'field_'+i,label:'Trường '+i,type:'text',required:false})
  })}>Thêm trường văn bản</button>
  <h3>Quy trình và quyền chuyển bước</h3>
  {model.workflow.transitions.map((edge:any,i:number)=><fieldset key={i}><legend>{edge.from} → {edge.to}</legend>
   {['owner','manager','warehouse','viewer'].map(role=><label key={role}><input type="checkbox" checked={edge.roles?.includes(role)||false} onChange={e=>edit(()=>{
    const roles=new Set(edge.roles);if(e.target.checked)roles.add(role);else roles.delete(role);edge.roles=[...roles]
   })}/>{role}</label>)}</fieldset>)}
 </fieldset>;
}
