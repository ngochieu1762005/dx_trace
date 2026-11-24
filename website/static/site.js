/* SPDX-License-Identifier: MIT */
'use strict';
const $=id=>document.getElementById(id);
const root=document.body.dataset.root;
let theme;
try{theme=localStorage.getItem('dx-docs-theme')}catch{}
document.documentElement.dataset.theme=theme|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('theme').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('dx-docs-theme',next)}catch{}});
$('menu').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('menu').setAttribute('aria-expanded',String(open))});
for(const pre of document.querySelectorAll('pre')){const code=pre.querySelector('code');if(!code)continue;const button=document.createElement('button');button.type='button';button.textContent='Sao chép';button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.textContent);button.textContent='Đã chép';setTimeout(()=>button.textContent='Sao chép',1400)}catch{button.textContent='Không sao chép được'}});pre.append(button)}
const dialog=$('search-dialog'),input=$('search-input'),results=$('results');
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d');
let index=null,loading=null;
function message(s){const p=document.createElement('p');p.textContent=s;results.replaceChildren(p)}
function search(){const query=normalize(input.value.trim());if(!query){message('Nhập từ khóa để tìm trên toàn bộ tài liệu.');return}if(!index){message('Đang tải chỉ mục…');return}const terms=query.split(/\s+/);const hits=index.map(item=>{const title=normalize(item.title),content=normalize(item.text);let score=0;for(const term of terms){if(!title.includes(term)&&!content.includes(term))return null;score+=title.includes(term)?10:1}return {item,score}}).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12);if(!hits.length){message('Không tìm thấy tài liệu phù hợp.');return}results.replaceChildren(...hits.map(({item})=>{const a=document.createElement('a'),strong=document.createElement('strong'),small=document.createElement('small');a.href=root+item.path;strong.textContent=item.title;small.textContent=item.group+' · '+item.text.slice(0,140);a.append(strong,small);return a}))}
async function openSearch(){if(!dialog.open)dialog.showModal();input.focus();if(!index){loading??=fetch(root+'assets/search.json').then(r=>{if(!r.ok)throw Error('index unavailable');return r.json()});try{index=await loading}catch{loading=null;message('Không thể tải chỉ mục.');return}}search()}
$('search-open').addEventListener('click',openSearch);input.addEventListener('input',search);document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch()}});
const toc=[...document.querySelectorAll('.toc a[href^="#"]')];if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const a of toc){if(a.hash==='#'+encodeURIComponent(entry.target.id)||decodeURIComponent(a.hash)==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')}}},{rootMargin:'-80px 0px -65% 0px'});for(const h of document.querySelectorAll('article h2,article h3'))observer.observe(h)}
