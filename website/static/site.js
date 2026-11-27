/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT */
'use strict';
const $=id=>document.getElementById(id);
const root=document.body.dataset.root;
const en=document.documentElement.lang==='en';
const tr=(vi,english)=>en?english:vi;
let theme;
try{theme=localStorage.getItem('dx-docs-theme')}catch{}
document.documentElement.dataset.theme=theme|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('theme').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('dx-docs-theme',next)}catch{}});
$('menu').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu').setAttribute('aria-expanded',String(open))});
for(const pre of document.querySelectorAll('pre')){const code=pre.querySelector('code');if(!code)continue;const button=document.createElement('button');button.type='button';button.textContent=tr("Sao chép","Copy");button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.textContent);button.textContent=tr("Đã chép","Copied");setTimeout(()=>button.textContent=tr("Sao chép","Copy"),1400)}catch{button.textContent=tr("Không sao chép được","Copy failed")}});pre.append(button)}
const dialog=$('search-dialog'),input=$('search-input'),results=$('results');
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d');
let index=null,loading=null;
function message(s){const p=document.createElement('p');p.textContent=s;results.replaceChildren(p)}
function search(){
 const query=normalize(input.value.trim());
 if(!query){message(tr("Nhập từ khóa để tìm tài liệu và nội dung từng mục.","Search documentation and sections."));return}
 if(!index){message(tr("Đang tải chỉ mục…","Loading index…"));return}
 const terms=query.split(/\s+/);
 const hits=index.map(item=>{
   const title=normalize(item.title),heading=normalize(item.heading||''),content=normalize(item.text);
   let score=0;
   for(const term of terms){
     if(!title.includes(term)&&!heading.includes(term)&&!content.includes(term))return null;
     score+=title.includes(term)?9:0;score+=heading.includes(term)?13:0;score+=content.includes(term)?2:0;
   }
   if(title.includes(query))score+=20;
   if(heading.includes(query))score+=12;
   return {item,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,15);
 if(!hits.length){message(tr("Không tìm thấy tài liệu phù hợp.","No matching documents."));return}
 results.replaceChildren(...hits.map(({item})=>{
   const a=document.createElement('a'),strong=document.createElement('strong'),small=document.createElement('small'),snippet=document.createElement('span');
   a.href=root+item.path;strong.textContent=item.heading||item.title;
   small.textContent=item.group+' · '+item.title;
   const position=normalize(item.text).indexOf(terms[0]);
   const from=Math.max(0,position-35);
   snippet.className='search-snippet';snippet.textContent=(from?'…':'')+item.text.slice(from,from+145)+(item.text.length>from+145?'…':'');
   a.append(small,strong,snippet);return a;
 }));
}
async function openSearch(){
 if(!dialog.open)dialog.showModal();input.focus();
 if(!index){
   loading??=Promise.all(['search.json','sections.json'].map(file=>fetch(root+'assets/'+file).then(r=>{if(!r.ok)throw Error('index unavailable');return r.json()}))).then(groups=>groups.flat());
   try{index=await loading}catch{loading=null;message(tr("Không thể tải chỉ mục.","Unable to load index."));return}
 }
 search();
}
$('search-open').addEventListener('click',openSearch);input.addEventListener('input',search);document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
const toc=[...document.querySelectorAll('.toc a[href^="#"]')];if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const a of toc){if(a.hash==='#'+encodeURIComponent(entry.target.id)||decodeURIComponent(a.hash)==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}}},{rootMargin:'-80px 0px -65% 0px'});for(const h of document.querySelectorAll('article h2,article h3'))observer.observe(h)}

const navFilter=$('nav-filter');
const groups=[...document.querySelectorAll('.nav-group')];
const original=groups.map(group=>group.open);
navFilter.addEventListener('input',()=>{const query=normalize(navFilter.value.trim());groups.forEach((group,i)=>{let visible=0;for(const a of group.querySelectorAll('a')){const match=!query||normalize(a.textContent).includes(query)||normalize(group.querySelector('summary').textContent).includes(query);a.hidden=!match;visible+=Number(match)}group.hidden=!visible;group.open=query?visible>0:original[i]})});
$('print-page')?.addEventListener('click',()=>window.print());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open&&$('sidebar').classList.contains('open')){$('sidebar').classList.remove('open');$('menu').setAttribute('aria-expanded','false');$('menu').focus()}});

const apiFilter=$('api-filter');
if(apiFilter){
 const tables=[...document.querySelectorAll('article table')];
 const rows=tables.flatMap(table=>[...table.querySelectorAll('tbody tr')]);
 for(const row of rows){
   const first=row.cells[0];
   if(!first)continue;
   const match=first.textContent.match(/^(GET|POST)\s+(.+)$/);
   if(!match)continue;
   const method=document.createElement('span'),path=document.createElement('code');
   method.className='http-method '+match[1].toLowerCase();method.textContent=match[1];
   path.textContent=match[2];first.replaceChildren(method,' ',path);
 }
 const update=()=>{
   const terms=normalize(apiFilter.value.trim()).split(/\s+/).filter(Boolean);
   let count=0;
   for(const row of rows){
     const visible=terms.every(term=>normalize(row.textContent).includes(term));
     row.hidden=!visible;if(visible)count++;
   }
   $('api-count').textContent=count+' / '+rows.length+' '+tr('đường dẫn','routes');
 };
 apiFilter.addEventListener('input',update);update();
}
