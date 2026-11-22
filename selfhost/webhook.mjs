/* DX-TRACE | Durable, signed command notifications
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import {createHmac} from 'node:crypto';
export const signature=(secret,timestamp,body)=>createHmac('sha256',secret).update(timestamp+'.'+body).digest('hex');
// Operator-configured destination only. No browser may choose an outbound URL.
export function startWebhook(db,config=process.env){
 if(!config.WEBHOOK_URL)return ()=>{};
 const url=new URL(config.WEBHOOK_URL);
 if(url.protocol!=='https:'||url.username||url.password||!config.WEBHOOK_WORKSPACE||!config.WEBHOOK_SECRET||config.WEBHOOK_SECRET.length<32)throw Error('Webhook requires HTTPS, workspace and secret of at least 32 characters');
 let busy=false;
 const tick=async()=>{
  if(busy)return;busy=true;
  try{await deliverPending(db,{url:url.href,workspace:config.WEBHOOK_WORKSPACE,secret:config.WEBHOOK_SECRET})}
  catch(e){console.error('Webhook worker:',e.name)}finally{busy=false}
 };
 const timer=setInterval(tick,5000);timer.unref();return ()=>clearInterval(timer);
}
export async function deliverPending(db,{url,workspace,secret},send=fetch,now=Date.now()){
 const rows=db.prepare(`SELECT l.*,COALESCE(d.attempts,0) AS attempts FROM audit_ledger l LEFT JOIN webhook_delivery d ON l.workspace=d.workspace AND l.seq=d.seq WHERE l.workspace=? AND d.delivered IS NULL AND COALESCE(d.attempts,0)<12 AND COALESCE(d.next_attempt,0)<=? ORDER BY l.seq LIMIT 20`).bind(workspace,now).all().results;
 for(const row of rows){
  const timestamp=String(Math.floor(now/1000)),body=JSON.stringify({id:workspace+':'+row.seq,seq:row.seq,hash:row.hash,previous:row.previous,event:JSON.parse(row.payload)});
  let status=0,delivered=null;
  try{const r=await send(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-dx-timestamp':timestamp,'x-dx-signature':'sha256='+signature(secret,timestamp,body),'x-dx-event-id':workspace+':'+row.seq},body,signal:AbortSignal.timeout(8000)});status=r.status;if(r.ok)delivered=new Date(now).toISOString();await r.body?.cancel()}
  catch{}
  const attempts=row.attempts+1,next=now+Math.min(3600000,5000*2**attempts);
  db.prepare('INSERT INTO webhook_delivery(workspace,seq,attempts,next_attempt,delivered,last_status) VALUES(?,?,?,?,?,?) ON CONFLICT(workspace,seq) DO UPDATE SET attempts=excluded.attempts,next_attempt=excluded.next_attempt,delivered=excluded.delivered,last_status=excluded.last_status').bind(workspace,row.seq,attempts,next,delivered,status).run();
 }
 return rows.length;
}
