/* DX-TRACE | Leased delivery of transactionally committed audit events.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 */
import {randomUUID} from 'node:crypto';

const changed=result=>Number(result?.meta?.changes??result?.changes??0);
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const rows=(db,sql,...args)=>db.prepare(sql).bind(...args).all().results;
const validTime=now=>Number.isSafeInteger(now)&&now>=0;
function scope(workspace){
 if(typeof workspace!=='string'||!workspace||workspace.length>240)throw Error('Invalid outbox workspace');
}
function attemptsLimit(value){
 if(!Number.isSafeInteger(value)||value<1||value>100)throw Error('Invalid outbox attempt limit');
}

// Each acquisition has a fresh fencing token: a worker whose lease expired can
// never acknowledge or overwrite a newer worker's result. Delivery is at least
// once; receivers must deduplicate the stable workspace:sequence event ID.
export function claimOutbox(db,{workspace,now=Date.now(),limit=1,leaseMs=30000,maxAttempts=12}={}){
 scope(workspace);attemptsLimit(maxAttempts);
 if(!validTime(now)||!Number.isSafeInteger(limit)||limit<1||limit>100||
    !Number.isSafeInteger(leaseMs)||leaseMs<1000||leaseMs>3600000)throw Error('Invalid outbox lease');
 run(db,`UPDATE event_outbox SET state='dead',lease_token=NULL,lease_until=0,
   last_error=COALESCE(last_error,'Delivery lease expired after final attempt')
   WHERE workspace=? AND attempts>=? AND
   (state='pending' OR (state='leased' AND lease_until<=?))`,workspace,maxAttempts,now);
 const candidates=rows(db,`SELECT * FROM event_outbox WHERE workspace=? AND attempts<? AND
   ((state='pending' AND due_at<=?) OR (state='leased' AND lease_until<=?))
   ORDER BY seq LIMIT ?`,workspace,maxAttempts,now,now,limit);
 const claimed=[];
 for(const row of candidates){
  const token=randomUUID();
  const result=run(db,`UPDATE event_outbox SET state='leased',attempts=attempts+1,lease_token=?,lease_until=?
    WHERE workspace=? AND seq=? AND attempts=? AND
    ((state='pending' AND due_at<=?) OR (state='leased' AND lease_until<=?))`,
    token,now+leaseMs,workspace,row.seq,row.attempts,now,now);
  if(changed(result)===1)claimed.push({...row,state:'leased',attempts:row.attempts+1,lease_token:token,lease_until:now+leaseMs});
 }
 return claimed;
}

export function settleOutbox(db,row,{ok,status=0,error=null,now=Date.now(),maxAttempts=12}={}){
 scope(row?.workspace);attemptsLimit(maxAttempts);
 if(!validTime(now)||typeof ok!=='boolean'||!row?.lease_token)throw Error('Invalid outbox settlement');
 const terminal=!ok&&row.attempts>=maxAttempts;
 const state=ok?'delivered':terminal?'dead':'pending';
 const due=ok||terminal?0:now+Math.min(3600000,5000*2**Math.min(row.attempts-1,20));
 // Only a bounded operational reason is persisted, never response bodies,
 // request headers, secrets or exception stacks from the destination.
 const message=ok?null:String(error||'Delivery failed').slice(0,160);
 return changed(run(db,`UPDATE event_outbox SET state=?,due_at=?,lease_token=NULL,lease_until=0,
   last_error=?,last_status=?,delivered_at=? WHERE workspace=? AND seq=? AND state='leased' AND lease_token=? AND lease_until>?`,
   state,due,message,Number.isInteger(status)?status:0,ok?new Date(now).toISOString():null,
   row.workspace,row.seq,row.lease_token,now))===1;
}

export function retryDeadOutbox(db,{workspace,seq,expectedAttempts,now=Date.now()}={}){
 scope(workspace);
 if(!validTime(now)||!Number.isSafeInteger(seq)||seq<1||!Number.isSafeInteger(expectedAttempts)||expectedAttempts<1)
  throw Error('Invalid dead-letter retry');
 return changed(run(db,`UPDATE event_outbox SET state='pending',attempts=0,due_at=?,lease_token=NULL,
   lease_until=0,last_error=NULL,last_status=NULL WHERE workspace=? AND seq=? AND state='dead' AND attempts=?`,
   now,workspace,seq,expectedAttempts))===1;
}

export function outboxStatus(db,workspace){
 scope(workspace);
 const counts={pending:0,leased:0,delivered:0,dead:0};
 for(const row of rows(db,'SELECT state,COUNT(*) AS count FROM event_outbox WHERE workspace=? GROUP BY state',workspace))
  if(Object.hasOwn(counts,row.state))counts[row.state]=row.count;
 const dead=rows(db,`SELECT seq,topic,attempts,last_error,last_status,created FROM event_outbox
   WHERE workspace=? AND state='dead' ORDER BY seq DESC LIMIT 50`,workspace);
 return {counts,dead};
}
