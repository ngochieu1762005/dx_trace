/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Reproducible local HTTP benchmark on disposable data. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {DatabaseSync} from 'node:sqlite';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir,cpus,totalmem,availableParallelism} from 'node:os';
import {createHash,randomBytes} from 'node:crypto';
import {initial} from '../lib/domain.mjs';
import {applyPlatform} from '../lib/platform.mjs';
const option=(key,fallback)=>{const i=process.argv.indexOf('--'+key);return i<0?fallback:process.argv[i+1]};
const topology=option('topology','local');
if(!['local','isolated'].includes(topology))throw Error('Invalid topology');
const size=Number(option('records','10000')),seconds=Number(option('seconds','5')),levels=option('levels','1,5,10').split(',').map(Number),output=option('out','/tmp/dxtrace-benchmark.json');
if(!Number.isInteger(size)||size<1||size>100000||!Number.isFinite(seconds)||seconds<1||seconds>120||levels.some(x=>!Number.isInteger(x)||x<1||x>200))throw Error('Invalid benchmark parameters');
const dir=mkdtempSync(tmpdir()+'/dx-load-'),url='http://127.0.0.1:38712',headers={'x-forwarded-user':'load-test','x-forwarded-email':'load@example.invalid','content-type':'application/json'};
const children=[];
const empty=initial(),model=JSON.parse(readFileSync(new URL('../examples/maintenance/model.json',import.meta.url)));
const workspace='ws-load',state={};applyPlatform(state,'platform.apply',{definition:model,baseVersion:0},{role:'owner',actor:'load@example.invalid',now:new Date().toISOString()});
const samples=[],failures={};let calls=0;
async function request(path,body,client=0){const start=performance.now();let response,code='network';try{const r=await fetch(url+'/api/'+path,{method:body?'POST':'GET',headers:{...headers,'x-forwarded-user':'load-test-'+client,'x-forwarded-email':'load-'+client+'@example.invalid','idempotency-key':crypto.randomUUID()},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});code=String(r.status);response=await r.json();if(!r.ok)throw Error('HTTP '+code);return response}catch{failures[code]=(failures[code]||0)+1;return null}finally{calls++;samples.push({operation:body?(path.endsWith('transition')?'transition':'create'):'list',ms:performance.now()-start})}}
function metrics(items){const sorted=items.map(x=>x.ms).sort((a,b)=>a-b);const p=q=>sorted.length?Number(sorted[Math.min(sorted.length-1,Math.ceil(q*sorted.length)-1)].toFixed(2)):null;return {requests:sorted.length,p50_ms:p(.5),p95_ms:p(.95),p99_ms:p(.99)}}
try{
 const db=new DatabaseSync(dir+'/warehouse.sqlite');
 for(const name of ['0000_watery_mad_thinker.sql','0001_sensor_history.sql','0002_audit_ledger.sql','0003_platform_records.sql'])db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 db.prepare('INSERT INTO workspaces(id,owner,state,created) VALUES(?,?,?,?)').run(workspace,'oidc:load-test',JSON.stringify(empty),'now');
 const addMember=db.prepare('INSERT INTO members VALUES(?,?,?,?,?)');
 for(let i=0;i<Math.max(...levels);i++)addMember.run('oidc:load-test-'+i,workspace,'load-'+i+'@example.invalid','Synthetic user '+i,'manager');
 db.prepare('INSERT INTO platform_models VALUES(?,?,?)').run(workspace,model.id,JSON.stringify(state.models[0]));
 const insert=db.prepare('INSERT INTO platform_records VALUES(?,?,?,?,?,?,?,?)');db.exec('BEGIN');
 for(let i=0;i<size;i++){const r={id:'seed-'+i,model:model.id,modelVersion:1,version:1,data:{equipment:'Freezer '+i,description:'Synthetic load fixture',priority:'Thường'},createdBy:'load@example.invalid',created:'2026-01-01T00:00:00Z',updated:'2026-01-01T00:00:00Z',status:'draft',history:[]};insert.run(workspace,model.id,r.id,r.createdBy,r.status,r.updated,null,JSON.stringify(r))}
 db.exec('COMMIT');db.close();
 const coreCredential=randomBytes(32).toString('hex'),gatewayCredential=randomBytes(32).toString('hex');
 const safeEnv={...process.env,DATA_DIR:dir,PUBLIC_ORIGIN:url,BIND_ADDRESS:'127.0.0.1',DX_CORE_URL:'',DX_LOCAL_DEMO:'',WEBHOOK_URL:'',FILE_SCAN_URL:'',DX_PROCESS_TIMER_ENABLED:'false'};
 const start=async(file,env,health,token)=>{
  const child=spawn(process.execPath,[file],{env:{...safeEnv,...env},stdio:['ignore','ignore','pipe']});children.push(child);
  let errors='';child.stderr.on('data',c=>{errors=(errors+c).slice(-4000)});
  for(let i=0;i<150;i++){
   if(child.exitCode!==null)throw Error(file+' failed: '+errors);
   try{if((await fetch(health,{headers:token?{'x-dx-core-token':token}:{},signal:AbortSignal.timeout(1000)})).ok)return}catch{}
   await new Promise(r=>setTimeout(r,50));
  }throw Error(file+' not ready: '+errors);
 };
 if(topology==='isolated'){
  await start('selfhost/core-server.mjs',{PORT:'38713',DX_CORE_TOKEN:coreCredential},'http://127.0.0.1:38713/api/health',coreCredential);
  await start('selfhost/api-gateway.mjs',{PORT:'38714',DX_CORE_TOKEN:coreCredential,DX_GATEWAY_APP_TOKEN:gatewayCredential,DX_GATEWAY_CORE_URL:'http://127.0.0.1:38713',DX_GATEWAY_REQUESTS_PER_MINUTE:'10000'},'http://127.0.0.1:38714/api/health',gatewayCredential);
 }
 await start('selfhost/server.mjs',{PORT:'38712',...(topology==='isolated'?{DX_CORE_URL:'http://127.0.0.1:38714',DX_CORE_TOKEN:gatewayCredential}:{})},url+'/api/health');
 const results=[];
 for(const concurrency of levels){
  // Warm the read path; writes and rows accumulate across levels, reported below.
  for(let i=0;i<20;i++)await request('models/maintenance/records?limit=50');
  samples.length=0;calls=0;for(const k of Object.keys(failures))delete failures[k];
  const started=performance.now(),end=started+seconds*1000;
  await Promise.all(Array.from({length:concurrency},async(_,client)=>{while(performance.now()<end){const r=await request('models/maintenance/records',{data:{equipment:'Bench',description:'Disposable record',priority:'Thường'}},client);if(r)await request('models/maintenance/transition',{id:r.id,version:r.version,target:'submitted'},client);await request('models/maintenance/records?limit=50',undefined,client)}}));
  const elapsed=(performance.now()-started)/1000,errorCount=Object.values(failures).reduce((a,b)=>a+b,0);
  results.push({concurrency,elapsed_seconds:Number(elapsed.toFixed(3)),requests:calls,requests_per_second:Number((calls/elapsed).toFixed(2)),errors:errorCount,error_codes:{...failures},...metrics(samples),operations:Object.fromEntries(['create','transition','list'].map(k=>[k,metrics(samples.filter(x=>x.operation===k))]))});
 }
 const sourceFiles=['lib/workspace-queue.mjs','lib/server.ts','lib/platform-store.ts','lib/platform.mjs','selfhost/runtime.mjs','selfhost/core-server.mjs','selfhost/api-gateway.mjs','selfhost/server.mjs','app/api/[...path]/route.ts','tools/benchmark-platform.mjs'];
 const sourceHashes=Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
 const limits=Object.fromEntries(['cpu.max','memory.max'].map(name=>{try{return [name,readFileSync('/sys/fs/cgroup/'+name,'utf8').trim()]}catch{return [name,'unavailable']}}));
 const report={generated_at:new Date().toISOString(),node:process.version,platform:process.platform,cpu_model:cpus()[0]?.model,available_parallelism:availableParallelism(),host_memory_gib:Number((totalmem()/2**30).toFixed(2)),cgroup_limits:limits,base_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source_sha256:sourceHashes,initial_records:size,seconds_per_level:seconds,topology,scope:(topology==='isolated'?'App + private policy gateway + Core + SQLite, separate Node processes, HTTP loopback; gateway limiter 10000 requests/minute per synthetic identity.':'Single local Node server + SQLite, HTTP loopback.')+' Distinct synthetic manager identities per client; excludes TLS, OAuth2 Proxy, Keycloak and network. Client shares machine with server. Rows accumulate across levels. Short characterization, not production capacity.',results};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,results},null,2));
 if(process.argv.includes('--assert-no-errors')&&results.some(r=>r.errors!==0||r.requests===0))process.exitCode=1;
}finally{for(const child of children.reverse()){if(child.exitCode===null&&child.signalCode===null){const done=once(child,'exit');child.kill();await done}}rmSync(dir,{recursive:true,force:true})}
