/* DX-TRACE | Portable audit chain verification; no server or credentials required.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
const ZERO='0'.repeat(64);
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');
const validCheckpoint=c=>c&&typeof c.workspace==='string'&&Number.isSafeInteger(c.entries)&&c.entries>=0&&Number.isSafeInteger(c.seq)&&c.seq>=0&&typeof c.head==='string'&&/^[a-f0-9]{64}$/.test(c.head);
export function auditBundle(workspace,events,exportedAt=new Date().toISOString()){
 return {schema:'dxtrace.audit.v1',workspace,exportedAt,events,checkpoint:{workspace,entries:events.length,seq:events.at(-1)?.seq||0,head:events.at(-1)?.hash||ZERO}};
}
export async function verifyAuditBundle(bundle,trustedCheckpoint){
 const invalid=reason=>({valid:false,reason});
 if(!bundle||bundle.schema!=='dxtrace.audit.v1'||typeof bundle.workspace!=='string'||!Array.isArray(bundle.events)||!validCheckpoint(bundle.checkpoint))return invalid('Invalid audit bundle format');
 let previous=ZERO,seq=0;
 for(const row of bundle.events){
  if(!Number.isSafeInteger(row.seq)||row.seq<=seq||typeof row.payload!=='string')return invalid('Invalid event sequence or payload');
  if(row.previous!==previous||row.hash!==await digest(previous+'\n'+row.seq+'\n'+row.payload))return invalid('Hash chain mismatch at sequence '+row.seq);
  previous=row.hash;seq=row.seq;
 }
 const checkpoint=bundle.checkpoint;
 if(checkpoint.workspace!==bundle.workspace||checkpoint.head!==previous||checkpoint.seq!==seq||checkpoint.entries!==bundle.events.length)return invalid('Export checkpoint mismatch');
 if(trustedCheckpoint!==undefined){
  if(!validCheckpoint(trustedCheckpoint)||trustedCheckpoint.workspace!==bundle.workspace)return invalid('Trusted checkpoint belongs to a different workspace or is invalid');
  const saved=trustedCheckpoint.entries===0?{seq:0,hash:ZERO}:bundle.events[trustedCheckpoint.entries-1];
  if(!saved||saved.seq!==trustedCheckpoint.seq||saved.hash!==trustedCheckpoint.head)return invalid('Previously retained checkpoint is missing or has changed');
 }
 return {valid:true,entries:bundle.events.length,seq,head:previous,anchored:trustedCheckpoint!==undefined};
}
