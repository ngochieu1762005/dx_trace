/* DX-TRACE | Durable BPMN timer polling with DB-backed optimistic locking.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. */
export async function scanDueTimers({select,apply,now=new Date().toISOString(),limit=25,logger=console}){
 if(typeof select!=='function'||typeof apply!=='function')throw Error('scanDueTimers requires storage adapters');
 const rows=await select(now,limit),stats={due:rows.length,advanced:0,failed:0,skipped:0};
 for(const row of rows){
  try{
   const record=JSON.parse(row.payload);
   if(record.process?.status!=='running'||!record.process.tokens?.some(t=>t.readyAt&&t.readyAt<=now)){
    stats.skipped++;continue;
   }
   const key='process-timer:'+row.model+':'+row.id+':'+record.version;
   if(key.length>100)throw Error('Timer idempotency key exceeds storage limit');
   await apply(row.workspace,{model:row.model,id:row.id,version:record.version},key);
   stats.advanced++;
  }catch(error){
   stats.failed++;
   logger.error('Process timer job failed',{model:row.model,code:error.status||'error'});
  }
 }
 return stats;
}
export function startTimerWorker({select,apply,logger=console,intervalMs=10000}){
 if(!Number.isSafeInteger(intervalMs)||intervalMs<1000)throw Error('Invalid timer polling interval');
 let busy=false;
 const run=async()=>{
  if(busy)return;
  busy=true;
  try{await scanDueTimers({select,apply,logger});}
  catch(error){logger.error('Process timer scan failed',{code:error?.name||'error'});}
  finally{busy=false;}
 };
 const handle=setInterval(run,intervalMs);
 handle.unref?.();
 return {run,stop:()=>clearInterval(handle)};
}
