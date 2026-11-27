/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | HTTPS telemetry fixture sender. SPDX-License-Identifier: MIT
 * Only use a dedicated synthetic device in an isolated training workspace.
 * A sample outside the configured limit may quarantine a lot.
 */
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const [endpoint,rawTemp,rawCount='3',ack]=process.argv.slice(2);
const token=process.env.DX_DEVICE_TOKEN;
if(ack!=='--training-fixture'||!token||token.length<32)throw Error('Provide a training-only device token and explicit --training-fixture');
const url=new URL(endpoint);
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/api/ingest')throw Error('Use the HTTPS /api/ingest endpoint');
const temperature=Number(rawTemp),count=Number(rawCount);
if(!Number.isFinite(temperature)||temperature< -100||temperature>150||!Number.isInteger(count)||count<1||count>20)throw Error('Invalid temperature or sample count');
for(let i=0;i<count;i++){
 const data=JSON.stringify({id:'fixture-'+randomUUID(),temperature,recorded:new Date().toISOString(),synthetic:true});
 let ok=false;
 for(let attempt=0;attempt<3&&!ok;attempt++){
  let response;
  try{response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:data,signal:AbortSignal.timeout(10000),redirect:'error'});}
  catch{if(attempt===2)throw Error('Network failure; sample outcome uncertain');await sleep(1000*(attempt+1));continue;}
  if(response.ok){const result=await response.json();console.log(JSON.stringify({sample:i+1,id:result.id,duplicate:!!result.duplicate,synthetic:true,
   ...(result.incident?{incident:result.incident,workflowPending:!!result.workflowPending,workflow:result.workflow}:{} )}));ok=true;break;}
  if(response.status<500||attempt===2)throw Error('Telemetry endpoint returned '+response.status);
  await sleep(1000*(attempt+1));
 }
 await sleep(1000);
}
