/* DX-TRACE | Private API policy gateway.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 * The gateway is internal-only: OAuth2 Proxy and the app authenticate users.
 */
import {createServer} from 'node:http';
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const MAX_BODY=6*1024*1024;
const MAX_RESPONSE=12*1024*1024;
const FORWARDED=['content-type','idempotency-key','authorization','origin','sec-fetch-site','x-forwarded-user','x-forwarded-email'];
const REPLY=['content-type','content-disposition','cache-control','x-content-type-options'];
const eq=(actual,expected)=>{
  if(typeof actual!=='string')return false;
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
};
export function gatewayConfig(env=process.env){
  const appToken=env.DX_GATEWAY_APP_TOKEN;
  const coreToken=env.DX_CORE_TOKEN;
  if(typeof appToken!=='string'||appToken.length<32||typeof coreToken!=='string'||coreToken.length<32||eq(appToken,coreToken)){
    throw Error('Gateway requires two different, randomly generated 32+ character secrets');
  }
  const coreUrl=new URL(env.DX_GATEWAY_CORE_URL||'http://core:8081');
  if(coreUrl.protocol!=='http:'||!['core','127.0.0.1','localhost'].includes(coreUrl.hostname)||coreUrl.username||coreUrl.password||coreUrl.search||coreUrl.hash||coreUrl.pathname!=='/'){
    throw Error('Gateway upstream must be the private Core HTTP service');
  }
  const limit=Number(env.DX_GATEWAY_REQUESTS_PER_MINUTE||120);
  if(!Number.isSafeInteger(limit)||limit<1||limit>10000)throw Error('Invalid gateway request limit');
  return {appToken,coreToken,coreUrl,limit};
}
export function createGateway(config,{upstreamFetch=fetch,clock=Date.now}={}){
  const {appToken,coreToken,coreUrl,limit}=config;
  const clients=new Map();
  const reply=(res,status,body,headers={})=>{
    res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers});
    res.end(JSON.stringify({error:body}));
  };
  return createServer(async(req,res)=>{
    try{
      if(!eq(req.headers['x-dx-core-token'],appToken))return reply(res,403,'Internal gateway credentials required');
      if(!['GET','POST'].includes(req.method))return reply(res,405,'Method not allowed',{allow:'GET, POST'});
      if(!req.url?.startsWith('/')||req.url.startsWith('//'))return reply(res,400,'Invalid request target');
      const url=new URL(req.url,'http://gateway.internal');
      if(url.origin!=='http://gateway.internal'||!url.pathname.startsWith('/api/'))return reply(res,404,'API route not found');
      if(req.headers['content-length'] && Number(req.headers['content-length'])>MAX_BODY)return reply(res,413,'Request too large');
      // Per-process fixed window, not a distributed quota or WAF.
      if(url.pathname!=='/api/health'){
        const now=clock();
        if(clients.size>4096){for(const [key,item] of clients)if(now-item.start>=60000)clients.delete(key);}
        const key=typeof req.headers['x-forwarded-user']==='string'&&req.headers['x-forwarded-user'].length<=256
          ? req.headers['x-forwarded-user'] : 'anonymous';
        let item=clients.get(key);
        if(!item||now-item.start>=60000){item={start:now,count:0};clients.set(key,item);}
        if(++item.count>limit)return reply(res,429,'Gateway rate limit reached',{'retry-after':String(Math.ceil((60000-(now-item.start))/1000))});
      }
      const chunks=[];let size=0;
      for await(const chunk of req){
        size+=chunk.length;
        if(size>MAX_BODY)return reply(res,413,'Request too large');
        chunks.push(chunk);
      }
      const headers=new Headers();
      for(const name of FORWARDED){
        const value=req.headers[name];
        if(typeof value==='string')headers.set(name,value);
      }
      headers.set('x-dx-core-token',coreToken);
      headers.set('x-request-id',randomUUID());
      const response=await upstreamFetch(new URL(url.pathname+url.search,coreUrl),{
        method:req.method,headers,body:req.method==='GET'?undefined:Buffer.concat(chunks),
        redirect:'manual',signal:AbortSignal.timeout(25000)
      });
      if(response.status>=300&&response.status<400)return reply(res,502,'Unexpected upstream redirect');
      if(Number(response.headers.get('content-length'))>MAX_RESPONSE)return reply(res,502,'Upstream response too large');
      const buffer=Buffer.from(await response.arrayBuffer());
      if(buffer.length>MAX_RESPONSE)return reply(res,502,'Upstream response too large');
      const outbound={'cache-control':'no-store','x-content-type-options':'nosniff'};
      for(const name of REPLY){const value=response.headers.get(name);if(value)outbound[name]=value;}
      res.writeHead(response.status,outbound).end(buffer);
    }catch(error){
      console.error('Gateway request failed:',error?.name||'unknown');
      if(!res.headersSent)reply(res,502,'Core unavailable');
      else res.end();
    }
  });
}
const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked){
  const config=gatewayConfig();
  createGateway(config).listen(Number(process.env.PORT||8082),process.env.BIND_ADDRESS||'127.0.0.1',()=>{
    console.log('DX-TRACE policy gateway listening on private network');
  });
}