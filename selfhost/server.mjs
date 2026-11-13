/*
 * DX-TRACE | HTTP server and authenticated request dispatch
 *
 * @Project DX-TRACE
 * @Maintainer Nguyễn Ngọc Hiếu and DX-TRACE contributors
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
import {identity} from './runtime.mjs';
import {GET,POST} from '../app/api/[...path]/route.ts';
const origin=new URL(process.env.PUBLIC_ORIGIN).origin;
const localDemo = process.env.DX_LOCAL_DEMO === '1';
if (localDemo && (process.env.BIND_ADDRESS !== '127.0.0.1' || origin !== 'http://127.0.0.1:8080')) {
 throw new Error('Chế độ demo yêu cầu địa chỉ loopback.');
}
const root=path.resolve('selfhost/generated/web');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
createServer(async(req,res)=>{
 try{
 if (localDemo && (req.headers.host !== new URL(origin).host ||
     (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site')) {
   res.writeHead(403).end(); return;
 }
 const url=new URL(req.url,origin);
 if(url.origin!==origin){res.writeHead(400).end();return}
 if(localDemo && (url.pathname.startsWith('/oauth2/'))){
   res.writeHead(302,{location:'/?area=training#overview'}).end();return;
 }
 if(url.pathname.startsWith('/api/')){
 if(!['GET','POST'].includes(req.method)){res.writeHead(405).end();return}
 const subject=req.headers['x-forwarded-user'],email=req.headers['x-forwarded-email'];
 const user=localDemo ? {userId:'demo:local',email:'demo@localhost.invalid',displayName:'Quản lý kho mẫu'} : typeof subject==='string'&&typeof email==='string'&&email.includes('@')?{userId:'oidc:'+subject,email,displayName:email}:null;
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024){res.writeHead(413).end();return}chunks.push(chunk)}
 const request=new Request(url,{method:req.method,headers:req.headers,body:req.method==='GET'?undefined:Buffer.concat(chunks)});
 const result=await identity.run(user,()=>(req.method==='GET'?GET:POST)(request));
 res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
 }
 if(req.method!=='GET'){res.writeHead(405).end();return}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return}
 const data=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff'}).end(data);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500).end()}
}).listen(Number(process.env.PORT||8080),process.env.BIND_ADDRESS||'127.0.0.1',()=>{if(localDemo)console.log('Mở kho thực hành: '+origin+'/?area=training#overview')});
