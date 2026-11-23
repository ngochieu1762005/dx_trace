/* DX-TRACE | Authenticated HTTPS full-stack smoke/load benchmark.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors.
 * No writes, cookies, bearer tokens, or raw responses included in report.
 */
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {readCookie,originOf} from '../selfhost/verify-oidc.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const percentile=(sorted,p)=>sorted.length?Math.round(sorted[Math.ceil(sorted.length*p)-1]*10)/10:null;
export async function benchmarkLevel({url,cookie,clients,requests,fetcher=fetch,clock=()=>performance.now()}){
 if(!Number.isSafeInteger(clients)||clients<1||clients>20||
    !Number.isSafeInteger(requests)||requests<clients||requests>100)throw Error('Unsafe concurrency/count');
 const events=[];
 let next=0;
 const started=clock();
 async function worker(){
  for(;;){
   const i=next++;if(i>=requests)return;
   const begin=clock();
   try{
    const response=await fetcher(url,{method:'GET',headers:{cookie},redirect:'manual',
      signal:AbortSignal.timeout(10000)});
    const bytes=await response.arrayBuffer();
    events.push({status:response.status,ms:clock()-begin,bytes:bytes.byteLength});
   }catch(error){
    events.push({status:0,ms:clock()-begin,bytes:0,error:error.name||'network'});
   }
  }
 }
 await Promise.all(Array.from({length:clients},()=>worker()));
 const duration=clock()-started;
 const timings=events.filter(e=>e.status===200).map(e=>e.ms).sort((a,b)=>a-b);
 const statuses=Object.fromEntries([...new Set(events.map(e=>e.status))].sort((a,b)=>a-b).map(
  status=>[String(status),events.filter(e=>e.status===status).length]));
 return {clients,requests,durationMs:Math.round(duration),requestsPerSecond:duration>0?
  Math.round(events.length/duration*100000)/100:0,successes:timings.length,
  failures:events.length-timings.length,p50Ms:percentile(timings,0.5),
  p95Ms:percentile(timings,0.95),maxMs:timings.length?Math.round(timings.at(-1)):null,
  totalResponseBytes:events.reduce((n,e)=>n+e.bytes,0),httpStatuses:statuses};
}
export async function benchmarkLive({appOrigin,cookie,requests=12,fetcher=fetch,clock}){
 const origin=originOf(appOrigin);
 if(!cookie||cookie.length>16384)throw Error('Authenticated cookie required');
 const url=origin+'/api/state';
 const levels=[];
 for(const clients of [1,5,10]){
  levels.push(await benchmarkLevel({url,cookie,clients,requests,fetcher,clock}));
  if(levels.at(-1).failures)break;
 }
 return {schema:'dxtrace.benchmark.v1',date:new Date().toISOString(),
  target:origin,route:'/api/state',authentication:'verified-session-cookie',
  transport:'HTTPS',scope:'full public HTTPS request path, excludes browser render',
  commit:process.env.DX_BENCH_COMMIT||'unrecorded',levels,
  passed:levels.length===3&&levels.every(l=>l.failures===0)};
}
const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked){
 try{
  const cookie=await readCookie(process.env.DX_BENCH_COOKIE_FILE);
  const count=Number(process.env.DX_BENCH_REQUESTS_PER_LEVEL||12);
  const result=await benchmarkLive({appOrigin:process.env.DX_BENCH_APP_ORIGIN,cookie,requests:count});
  if(process.env.DX_BENCH_REPORT_FILE){
   await writeFile(process.env.DX_BENCH_REPORT_FILE,JSON.stringify(result,null,2)+'\n',{mode:0o600,flag:'wx'});
  }
  console.log(JSON.stringify(result,null,2));
  if(!result.passed)process.exitCode=1;
 }catch(error){console.error('FAIL authenticated live benchmark:',error.message);process.exitCode=1;}
}
