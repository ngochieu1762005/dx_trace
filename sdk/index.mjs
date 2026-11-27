/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors */
export class DXTraceError extends Error {
 constructor(status,requestId,message){super(message);this.name='DXTraceError';this.status=status;this.requestId=requestId;}
}
const segment=(s)=>encodeURIComponent(s);
export class DXTraceClient {
 constructor({baseUrl,accessToken,fetcher=fetch}){
  const url=new URL(baseUrl);
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Expected HTTPS API origin (HTTP loopback for tests only)');
  this.base=url.origin;this.token=accessToken;this.fetcher=fetcher;
  const modelPath=m=>'/v2/models/'+segment(m);
  this.apps={list:()=>this.request('/v2/apps')};
  this.models={schema:m=>this.request(modelPath(m)+'/schema')};
  this.records={
   list:(m,query={})=>{const p=new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]));return this.request(modelPath(m)+'/records'+(p.size?'?'+p:''));},
   get:(m,id)=>this.request(modelPath(m)+'/records/'+segment(id)),
   create:(m,data,key)=>this.request(modelPath(m)+'/records',{data},key)
  };
  const recordPath=(m,id)=>modelPath(m)+'/records/'+segment(id);
  this.tasks={list:(m,id)=>this.request(recordPath(m,id)+'/tasks')};
  this.evidence={list:(m,id)=>this.request(recordPath(m,id)+'/evidence')};
  this.workflow={transition:(m,id,input,key)=>this.request(modelPath(m)+'/records/'+segment(id)+'/transition',input,key)};
 }
 async request(path,body,key){
  const token=typeof this.token==='function'?await this.token():this.token;
  if(typeof token!=='string'||!token)throw new Error('Access token required');
  const headers={authorization:'Bearer '+token,accept:'application/json'};
  if(body!==undefined){
   if(typeof key!=='string'||!/^[A-Za-z0-9._:-]{1,100}$/.test(key))throw new Error('Stable Idempotency-Key required');
   headers['content-type']='application/json';headers['idempotency-key']=key;
  }
  const res=await this.fetcher(this.base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new DXTraceError(res.status,res.headers.get('x-request-id'),'DX-TRACE HTTP '+res.status);
  return res.json();
 }
}
