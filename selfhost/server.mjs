/*
 * DX-TRACE | HTTP server and authenticated request dispatch
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File selfhost/server.mjs
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
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const origin=new URL(process.env.PUBLIC_ORIGIN).origin;
const localDemo = process.env.DX_LOCAL_DEMO === '1';
const coreUrl = process.env.DX_CORE_URL;
if (coreUrl && (!process.env.DX_CORE_TOKEN || process.env.DX_CORE_TOKEN.length < 32)) {
 throw new Error('Missing strong DX_CORE_TOKEN for isolated core');
}
// Only the local workstation demo uses in-process backend. The production web
// process loads no database driver, secret store or warehouse domain logic.
const localBackend = coreUrl ? null : await (async () => {
 const [{identity}, api] = await Promise.all([
  import('./runtime.mjs'), import('../app/api/[...path]/route.ts')
 ]);
 return {identity, GET:api.GET, POST:api.POST};
})();

if (localDemo && (process.env.BIND_ADDRESS !== '127.0.0.1' || origin !== 'http://127.0.0.1:8080')) {
 throw new Error('Chế độ demo yêu cầu địa chỉ loopback.');
}
const qualityOrigin = process.env.DX_QUALITY_PORTAL_URL
 ? new URL(process.env.DX_QUALITY_PORTAL_URL) : null;
if (qualityOrigin && (qualityOrigin.protocol !== 'http:' ||
    !['quality-portal','127.0.0.1'].includes(qualityOrigin.hostname) ||
    qualityOrigin.username || qualityOrigin.password ||
    qualityOrigin.search || qualityOrigin.hash)) {
 throw new Error('DX_QUALITY_PORTAL_URL must point to the private quality-portal service');
}
const root=fileURLToPath(new URL('./generated/web',import.meta.url));
const mime={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
createServer(async(req,res)=>{
 try{
 if (localDemo && (req.headers.host !== new URL(origin).host ||
     (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site')) {
   res.writeHead(403).end(); return;
 }
 const url=new URL(req.url,origin);
 if(url.origin!==origin){res.writeHead(400).end();return}
 // Retired interfaces keep bookmarks useful without exposing a second UI.
 const retired = url.pathname.startsWith('/apps/approvals/') || url.pathname==='/approvals'
   ? 'requests' : url.pathname.startsWith('/demo/') || url.pathname==='/try' ? 'overview' : null;
 if(retired && req.method==='GET'){
   const area=url.searchParams.get('area')==='training'?'?area=training':'';
   res.writeHead(302,{location:'/'+area+'#'+retired,'cache-control':'no-store'}).end();return;
 }
 if(localDemo && (url.pathname.startsWith('/oauth2/'))){
   res.writeHead(302,{location:'/?area=training#overview'}).end();return;
 }
 // Second, independently deployed frontend. OAuth2 Proxy authenticates the
 // request at the edge; no identity headers, cookies or privileged Core token
 // ever flow to this static-only application service.
 if(url.pathname==='/apps/quality' && req.method==='GET'){
   res.writeHead(308,{location:'/apps/quality/','cache-control':'no-store'}).end();return;
 }
 if(url.pathname.startsWith('/apps/quality/')){
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
   if(!qualityOrigin){res.writeHead(404).end();return}
   try {
     const allowed = new Map([
       ['/apps/quality/','text/html; charset=utf-8'],
       ['/apps/quality/index.html','text/html; charset=utf-8'],
       ['/apps/quality/app.js','text/javascript; charset=utf-8'],
       ['/apps/quality/styles.css','text/css; charset=utf-8'],
       ['/apps/quality/manifest.json','application/json; charset=utf-8']
     ]);
     const contentType = allowed.get(url.pathname);
     if(!contentType){res.writeHead(404).end();return}
     const upstream=await fetch(new URL(url.pathname,qualityOrigin),{
       method:req.method,redirect:'manual',signal:AbortSignal.timeout(5000)
     });
     if(upstream.status!==200){res.writeHead(upstream.status===404?404:503).end();return}
     const bytes=Buffer.from(await upstream.arrayBuffer());
     if(bytes.length>1024*1024){res.writeHead(502).end();return}
     res.writeHead(200,{
       'content-type':contentType,
       'cache-control':'no-store',
       'x-content-type-options':'nosniff',
       'x-frame-options':'DENY',
       'referrer-policy':'no-referrer',
       'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
     }).end(req.method==='HEAD'?undefined:bytes);
   } catch(error) {
     console.error('Quality portal unavailable:',error?.message);
     res.writeHead(503,{'cache-control':'no-store'}).end();
   }
   return;
 }
 // Look up the workspace route on each navigation, including after uninstall.
 if(req.method==='GET' && /^\/[a-z][a-z0-9]{0,15}\/?$/.test(url.pathname)){
   const name=url.pathname.split('/')[1];
   const lookup='/api/portals/'+name+url.search;
   let registration;
   if(coreUrl){
     const headers={'x-dx-core-token':process.env.DX_CORE_TOKEN};
     for(const field of ['x-forwarded-user','x-forwarded-email'])if(typeof req.headers[field]==='string')headers[field]=req.headers[field];
     registration=await fetch(new URL(lookup,coreUrl),{headers,redirect:'error',signal:AbortSignal.timeout(5000)});
   }else{
     const subject=req.headers['x-forwarded-user'],email=req.headers['x-forwarded-email'];
     const user=localDemo?{userId:'demo:local',email:'demo@localhost.invalid',displayName:'Quản lý kho mẫu'}:
       subject&&email?{userId:'oidc:'+subject,email,displayName:email}:null;
     registration=await localBackend.identity.run(user,()=>localBackend.GET(new Request(new URL(lookup,origin))));
   }
   if(!registration.ok){res.writeHead(registration.status,{'cache-control':'no-store'}).end();return;}
   const {route}=await registration.json();
   let html;
   if(coreUrl){
     const page=await fetch(new URL('/appkit-ui/'+route.service,coreUrl),{headers:{'x-dx-core-token':process.env.DX_CORE_TOKEN},redirect:'error',signal:AbortSignal.timeout(5000)});
     if(!page.ok){res.writeHead(503).end();return;}
     html=await page.text();
   }else html=await readFile(new URL('../apps/model-portal/index.html',import.meta.url));
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',
     'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}).end(html);return;
 }
 if(url.pathname.startsWith('/api/')){
 if(!['GET','POST'].includes(req.method)){res.writeHead(405).end();return}
 const subject=req.headers['x-forwarded-user'],email=req.headers['x-forwarded-email'];
 const user=localDemo ? {userId:'demo:local',email:'demo@localhost.invalid',displayName:'Quản lý kho mẫu'} : typeof subject==='string'&&typeof email==='string'&&email.includes('@')?{userId:'oidc:'+subject,email,displayName:email}:null;
 if(coreUrl){
  // The inbound proxy identity is trusted only after Caddy + OAuth2 Proxy.
  // Never forward a browser-supplied internal access token.
  const upstream=new URL(url.pathname+url.search,coreUrl);
  const headers=new Headers();
  for(const name of ['content-type','content-length','idempotency-key','authorization','origin','sec-fetch-site','x-forwarded-user','x-forwarded-email']){
   const v=req.headers[name];if(typeof v==='string')headers.set(name,v);
  }
  headers.set('x-dx-core-token',process.env.DX_CORE_TOKEN);
  // Do not let a browser-selected Host become the internal origin.
  const body=req.method==='GET'?undefined:Buffer.concat(await (async()=>{
   const chunks=[];let size=0;
   for await(const chunk of req){
    size+=chunk.length;
    if(size>6*1024*1024)throw Object.assign(new Error('Request too large'),{status:413});
    chunks.push(chunk);
   }
   return chunks;
  })());
  const upstreamResponse=await fetch(upstream,{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(25000)});
  const responseHeaders={};
  for(const name of ['content-type','content-disposition','cache-control','x-content-type-options']){
   const value=upstreamResponse.headers.get(name);
   if(value)responseHeaders[name]=value;
  }
  res.writeHead(upstreamResponse.status,responseHeaders).end(Buffer.from(await upstreamResponse.arrayBuffer()));return;
 }
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024){res.writeHead(413).end();return}chunks.push(chunk)}
 const request=new Request(url,{method:req.method,headers:req.headers,body:req.method==='GET'?undefined:Buffer.concat(chunks)});
 const result=await localBackend.identity.run(user,()=>(req.method==='GET'?localBackend.GET:localBackend.POST)(request));
 res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
 }
 if(req.method!=='GET'){res.writeHead(405).end();return}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return}
 const data=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff'}).end(data);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:e.status===413?413:500).end()}
}).listen(Number(process.env.PORT||8080),process.env.BIND_ADDRESS||'127.0.0.1',()=>{if(localDemo)console.log('Mở kho thực hành: '+origin+'/?area=training#overview')});
