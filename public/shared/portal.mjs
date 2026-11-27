/* SPDX-License-Identifier: MIT */
const el=id=>document.getElementById(id);
const area=new URL(location.href).searchParams.get('area')==='training'?'training':'live';
el('home').href='/?area='+area;
async function api(path,body){
 const url=new URL('/api/'+path,location.origin);
 url.searchParams.set('area',area);
 const fingerprint=body&&JSON.stringify([path,body]);
 if(body&&pending?.fingerprint!==fingerprint)pending={fingerprint,key:crypto.randomUUID()};
 const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','idempotency-key':pending.key}:{},body:body?JSON.stringify(body):undefined});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Yêu cầu thất bại');
 if(body)pending=null;
 return data;
}
const node=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
let handover,role,actor,offset=0;
let pending;
async function refresh(append=false){
 const id=el('model').value;
 const result=await api('models/'+id+'/records?offset='+(append?offset:0));
 const model=result.models.find(m=>m.id===id).definition;
 if(!append){
   el('records').replaceChildren();el('fields').replaceChildren();
   el('create').hidden=!model.permissions.create.includes(role);
   for(const field of model.fields){
     const label=node('label',field.label), input=document.createElement(field.type==='choice'?'select':'input');
     if(field.type==='choice')for(const option of field.options)input.add(new Option(option,option));
     else input.type=({boolean:'checkbox',number:'number',date:'date'})[field.type]||'text';
     if(input.type==='number')input.step='any';
     input.name=field.key;input.required=!!field.required&&input.type!=='checkbox';label.append(input);el('fields').append(label);
   }
 }
 for(const record of result.records){
   const card=node('article','');card.append(node('h3',record.id),node('strong',record.status));
   for(const field of model.fields) if(Object.hasOwn(record.data,field.key))card.append(node('p',field.label+' · '+record.data[field.key]));
   for(const transition of model.workflow.transitions.filter(t=>t.from===record.status&&t.roles.includes(role)&&(!t.differentActor||record.createdBy!==actor))){
     const button=node('button',transition.to);
     button.onclick=()=>perform(async()=>{
       const reason=transition.reasonRequired?prompt('Lý do chuyển bước'):'';
       if(transition.reasonRequired&&!reason)return;
       await api('models/'+id+'/transition',{id:record.id,version:record.version,target:transition.to,reason});await refresh();
     });card.append(button);
   }
   if(handover?.model===id&&handover.after===record.status){
     const path='app-handover/'+id+'/'+record.id;
     const show=node('button','Biên bản bàn giao · Flowable');
     show.onclick=()=>perform(async()=>{
       const view=await api(path);const panel=node('section','');show.replaceWith(panel);
       panel.append(node('p',view.outcome||view.status));
       if(['new','pending'].includes(view.status)&&record.createdBy===actor){
         const start=node('button','Yêu cầu bàn giao');start.onclick=()=>perform(async()=>{await api(path,{action:'start'});await refresh()});panel.append(start);
       }
       for(const task of view.tasks.filter(t=>t.canComplete)){
         for(const approved of [true,false]){
           const button=node('button',task.name+' · '+(approved?'Đồng ý':'Từ chối'));
           button.onclick=()=>perform(async()=>{const reason=prompt('Lý do quyết định');if(reason?.trim()){
             await api(path,{action:'complete',taskId:task.id,approved,reason});await refresh()
           }});panel.append(button);
         }
       }
     });card.append(show);
   }
   el('records').append(card);
 }
 if(!append&&!result.records.length)el('records').append(node('p','Chưa có hồ sơ.'));
 offset=result.page.offset+result.records.length;el('next').hidden=!result.page.hasMore;
}
async function perform(fn){try{el('notice').textContent='';await fn();}catch(e){el('notice').textContent=e.message;}}
el('next').onclick=()=>perform(()=>refresh(true));
el('model').onchange=()=>perform(()=>refresh());
el('create').onsubmit=e=>{e.preventDefault();perform(async()=>{
 const values={};for(const input of el('fields').querySelectorAll('input,select'))if(input.type==='checkbox'||input.value!=='')values[input.name]=input.type==='number'?Number(input.value):input.type==='checkbox'?input.checked:input.value;
 await api('models/'+el('model').value+'/records',{data:values});await refresh();el('notice').textContent='Đã lưu hồ sơ.';
});};
await perform(async()=>{
 const [portal,state]=await Promise.all([api('portals/'+location.pathname.split('/')[1]),api('state')]);
 handover=portal.handover;role=state.me.role;actor=state.me.email;el('title').textContent=portal.models[0].name;
 for(const model of portal.models)el('model').add(new Option(model.name,model.id));
 await refresh();
});
