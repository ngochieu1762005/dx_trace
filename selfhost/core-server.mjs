/*
 * DX-TRACE | Isolated headless core HTTP service
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2026 DX-TRACE contributors
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {identity} from './runtime.mjs';
import {GET,POST} from '../app/api/[...path]/route.ts';

const origin=new URL(process.env.PUBLIC_ORIGIN).origin;
const token=process.env.DX_CORE_TOKEN;
if(!token || token.length<32)throw Error('DX_CORE_TOKEN must have at least 32 characters');
const authorized=(value)=>{
 if(typeof value!=='string')return false;
 const a=Buffer.from(value),b=Buffer.from(token);
 return a.length===b.length && timingSafeEqual(a,b);
};
const json=(status,message)=>Response.json({error:message},{status,headers:{'cache-control':'no-store'}});

createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin);
  let result;
  if(!authorized(req.headers['x-dx-core-token']))result=json(403,'Core API chỉ chấp nhận yêu cầu từ cổng nội bộ');
  else if(!url.pathname.startsWith('/api/'))result=json(404,'Headless core không cung cấp giao diện');
  else if(!['GET','POST'].includes(req.method))result=json(405,'Phương thức không được hỗ trợ');
  else{
   const subject=req.headers['x-forwarded-user'],email=req.headers['x-forwarded-email'];
   const user=typeof subject==='string' && typeof email==='string' && email.includes('@')
    ? {userId:'oidc:'+subject,email,displayName:email}:null;
   const chunks=[];let size=0;
   for await(const chunk of req){
    size+=chunk.length;
    if(size>6*1024*1024){result=json(413,'Yêu cầu vượt quá 6 MB');break}
    chunks.push(chunk);
   }
   if(!result){
    const headers={...req.headers,host:new URL(origin).host};
    delete headers['x-dx-core-token'];
    const request=new Request(url,{method:req.method,headers,body:req.method==='GET'?undefined:Buffer.concat(chunks)});
    result=await identity.run(user,()=>(req.method==='GET'?GET:POST)(request));
   }
  }
  res.writeHead(result.status,Object.fromEntries(result.headers));
  res.end(Buffer.from(await result.arrayBuffer()));
 }catch(error){
  console.error('Core request failed:',error?.message);
  res.writeHead(500,{'content-type':'application/json'}).end(JSON.stringify({error:'Internal server error'}));
 }
}).listen(Number(process.env.PORT||8081),process.env.BIND_ADDRESS||'127.0.0.1',()=>{
 console.log('DX-TRACE headless core listening (private network only)');
});
