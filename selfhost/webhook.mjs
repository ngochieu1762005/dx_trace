/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Durable, signed command notifications
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import {createHmac} from 'node:crypto';
import {claimOutbox,settleOutbox} from '../lib/reliable-outbox.mjs';
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
export async function deliverPending(db,{url,workspace,secret},send=fetch,now){
 const clock=()=>now===undefined?Date.now():now;
 let delivered=0;
 // Claim one event immediately before sending it. Leasing a whole batch would
 // let later leases expire while earlier HTTP requests were still in flight.
 while(delivered<20){
  const [row]=claimOutbox(db,{workspace,now:clock()});
  if(!row)break;
  const [ledger]=db.prepare('SELECT hash,previous,payload FROM audit_ledger WHERE workspace=? AND seq=?').bind(workspace,row.seq).all().results;
  let status=0,ok=false,error='Network delivery failed';
  try{
   if(!ledger)throw Error('Missing committed event');
   const timestamp=String(Math.floor(clock()/1000));
   // The queue owns delivery state. The committed ledger remains the source of
   // event bytes; never HMAC-sign a drifted copy from mutable queue metadata.
   const body=JSON.stringify({id:workspace+':'+row.seq,seq:row.seq,hash:ledger.hash,previous:ledger.previous,event:JSON.parse(ledger.payload)});
   const response=await send(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-dx-timestamp':timestamp,'x-dx-signature':'sha256='+signature(secret,timestamp,body),'x-dx-event-id':workspace+':'+row.seq},body,signal:AbortSignal.timeout(8000)});
   status=response.status;ok=response.ok;error='HTTP '+status;
   await response.body?.cancel();
  }catch{}
  settleOutbox(db,row,{ok,status,error,now:clock()});
  delivered++;
 }
 return delivered;
}
