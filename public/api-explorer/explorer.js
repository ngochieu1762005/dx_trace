/* DX-TRACE API Explorer | SPDX-License-Identifier: MIT */
'use strict';
(async()=>{
const el=id=>document.getElementById(id), en=document.documentElement.lang==='en';
const t=(vi,eng)=>en?eng:vi, livePage=document.body.dataset.live==='1';
const origin=livePage?location.origin:'https://app.dxtrace.hieuds.com';
const catalog=await fetch('./catalog.json').then(r=>{if(!r.ok)throw Error('catalog unavailable');return r.json()}).catch(()=>null);
if(!catalog){el('status').textContent=t('Không tải được API catalog.','Unable to load API catalog.');return}
const txt=(o)=>o[en?'en':'vi'];
const option=(select,value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o)};
const select=el('endpoint'), filter=el('filter'), method=el('method'), params=el('params'), body=el('body'), query=el('query'), output=el('output'), response=el('response'), language=el('language');
let current=null, requestId=crypto.randomUUID();
function choices(){
 const old=select.value,word=filter.value.trim().toLowerCase();select.replaceChildren();
 for(const e of catalog){if((method.value==='all'||method.value===e.method)&&(!livePage||e.live)&&[e.path,e.method,txt(e.title),txt(e.group)].join(' ').toLowerCase().includes(word))option(select,e.id,e.method+' '+(e.auth==='oauth2'?'':'/api')+e.path+' — '+txt(e.title))}
 if([...select.options].some(o=>o.value===old))select.value=old;
 choose();
}
function choose(){
 current=catalog.find(e=>e.id===select.value)||null;params.replaceChildren();response.textContent='';el('run').disabled=true;
 el('new-key').hidden=!current?.idempotency;
 el('copy').disabled=!current;
 if(!current){
   el('open-live').hidden=true;el('body-label').hidden=true;el('multipart-note').hidden=true;
   el('note').textContent=t('Không có đường dẫn phù hợp.','No matching route.');
   for(const field of ['auth','status','sample','output'])el(field).textContent='';
   query.value='';body.value='';return;
 }
 requestId=crypto.randomUUID();
 el('note').textContent=txt(current.note);
 el('auth').textContent=current.auth+(current.idempotency?' · Idempotency-Key':'');
 for(const match of current.path.matchAll(/\{([^}]+)\}/g)){const label=document.createElement('label'),input=document.createElement('input');label.textContent=match[1];input.dataset.param=match[1];input.required=true;input.placeholder=match[1]==='id'?'maintenance':match[1]==='code'?'12345678':'ID';label.append(input);params.append(label);input.addEventListener('input',generate)}
 query.value=JSON.stringify(current.query,null,2);
 body.value=current.body===null?'':JSON.stringify(current.body,null,2);
 body.disabled=current.method==='GET'||current.multipart;
 el('body-label').hidden=current.method==='GET';
 el('multipart-note').hidden=!current.multipart;
 el('sample').textContent=current.response===null?t('Xem mô tả endpoint; phản hồi có thể là XML, tệp hoặc JSON động.','See endpoint notes; response may be XML, a file or dynamic JSON.'):JSON.stringify(current.response,null,2);
 generate();
}
function request(){
 if(!current)throw Error(t('Chọn endpoint.','Select an endpoint.'));
 let path=current.path;
 for(const input of params.querySelectorAll('input')){
   const value=input.value.trim();
   if(!value||value.length>120||!/^[-a-zA-Z0-9_.:@]+$/.test(value)||value==='.'||value==='..')throw Error(t('Nhập tham số hợp lệ: ','Enter a valid parameter: ')+input.dataset.param);
   path=path.replace('{'+input.dataset.param+'}',encodeURIComponent(value));
 }
 const q=JSON.parse(query.value||'{}');
 if(!q||Array.isArray(q)||typeof q!=='object'||Object.values(q).some(v=>typeof v==='object'))throw Error(t('Query phải là object JSON phẳng.','Query must be a flat JSON object.'));
 const external=current.auth==='oauth2';
 const url=external?new URL(path,'https://external.example.org'):new URL('/api'+path,origin);
 for(const [k,v] of Object.entries(q))if(k!=='area'){if(livePage&&!['limit','offset','status','q','open','order','model','after'].includes(k))throw Error(t('Query không được hỗ trợ trong console thật.','Query parameter not allowed in live console.'));url.searchParams.set(k,String(v));}
 if(!external&&current.auth!=='device')url.searchParams.set('area','training');
 const headers={};
 if(external)headers.Authorization='Bearer OAUTH_ACCESS_TOKEN';
 if(current.auth==='device')headers.Authorization='Bearer DEVICE_TOKEN';
 if(current.idempotency)headers['Idempotency-Key']=requestId;
 let payload;
 if(current.method==='POST'&&!current.multipart){
   payload=JSON.parse(body.value);
   if(!payload||Array.isArray(payload)||typeof payload!=='object')throw Error(t('Body phải là object JSON.','Body must be a JSON object.'));
   headers['Content-Type']='application/json';
 }
 return {url,headers,payload};
}
const shell=s=>"'"+String(s).replace(/'/g,"'\"'\"'")+"'";
function generate(){
 try{
 const {url,headers,payload}=request();
 let code;
 if(language.value==='curl'){
   const parts=['curl --fail-with-body -X '+current.method+' '+shell(url.href)];
   if(!['device','public','oauth2'].includes(current.auth))parts.push('-b '+shell('SESSION_COOKIE_FILE'));
   for(const [k,v] of Object.entries(headers))parts.push('-H '+shell(k+': '+v));
   if(current.multipart)parts.push('-F '+shell('file=@example.pdf'),'-F '+shell('entity=LOT_ID'));
   else if(payload!==undefined)parts.push('--data-raw '+shell(JSON.stringify(payload)));
   code=parts.join(' \\\n  ');
 }else if(language.value==='python'){
   const h=JSON.stringify(headers),p=JSON.stringify(payload??null);
   code='import json\nimport requests\n\nsession = requests.Session()\n# For session endpoints, configure an authorized session locally.\nheaders = json.loads('+JSON.stringify(h)+')\n';
   if(current.multipart)code+="with open('example.pdf', 'rb') as file:\n    response = session.post("+JSON.stringify(url.href)+", headers=headers, files={'file': file}, data={'entity':'LOT_ID'}, timeout=20)\n";
   else code+='response = session.request('+JSON.stringify(current.method)+', '+JSON.stringify(url.href)+', headers=headers, json=json.loads('+JSON.stringify(p)+'), timeout=20)\n';
   code+='print(response.status_code, response.text)';
 }else{
   code='// Run from the authenticated application origin, not the docs domain.\n';
   if(current.multipart)code+="const form = new FormData();\nform.append('file', document.querySelector('input[type=file]').files[0]);\nform.append('entity', 'LOT_ID');\n";
   code+='const response = await fetch('+JSON.stringify(current.auth==='oauth2'?url.href:url.pathname+url.search)+', {\n  method: '+JSON.stringify(current.method)+',\n  headers: '+JSON.stringify(headers,null,2)+',\n  credentials: "same-origin"'+(current.multipart?',\n  body: form':payload!==undefined?',\n  body: '+JSON.stringify(JSON.stringify(payload)): '')+'\n});\nconsole.log(response.status, await response.text());';
 }
 output.textContent=code;el('status').textContent=t('Lệnh mẫu đã sẵn sàng.','Example request ready.');
 el('run').disabled=!(livePage&&current.live&&current.method==='GET');
 el('open-live').hidden=livePage||!current.live;
 el('open-live').href=origin+'/api-explorer/'+(en?'en.html':'index.html')+'?op='+encodeURIComponent(current.id);
 }catch(e){output.textContent=e.message;el('run').disabled=true;el('open-live').hidden=true;el('status').textContent=t('Điền đầy đủ tham số.','Complete the parameters.')}
}
async function run(){
 if(!livePage||!current?.live||current.method!=='GET')return;
 try{
 const {url}=request();if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))throw Error('Invalid origin');
 el('run').disabled=true;response.textContent=t('Đang gọi API…','Calling API…');
 const started=performance.now(),r=await fetch(url.pathname+url.search,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)});
 const reader=r.body?.getReader();let size=0,chunks=[];
 if(reader){for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256*1024){await reader.cancel();throw Error(t('Phản hồi vượt 256 KiB.','Response exceeds 256 KiB.'))}chunks.push(value)}}
 const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length}
 const raw=new TextDecoder().decode(data);let content=raw;try{content=JSON.stringify(JSON.parse(raw),null,2)}catch{}
 response.textContent='HTTP '+r.status+' · '+Math.round(performance.now()-started)+' ms\n'+content;
 }catch(e){response.textContent=t('Không gọi được API: ','API request failed: ')+e.message}finally{el('run').disabled=false}
}
for(const node of [query,body,language])node.addEventListener('input',generate);
select.addEventListener('change',choose);filter.addEventListener('input',choices);method.addEventListener('change',choices);
el('new-key').addEventListener('click',()=>{requestId=crypto.randomUUID();generate()});
el('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.textContent);el('status').textContent=t('Đã sao chép.','Copied.')}catch{el('status').textContent=t('Không sao chép được.','Copy failed.')}});
el('run').addEventListener('click',run);
el('run').hidden=!livePage;choices();const op=new URLSearchParams(location.search).get('op');if([...select.options].some(o=>o.value===op)){select.value=op;choose()}
})();
