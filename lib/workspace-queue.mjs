/* DX-TRACE | Bounded per-workspace writer queue. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {DomainError} from './domain.mjs';
const queues=new Map();
// SQLite has one writer. Avoid exhausting optimistic retries inside the same process.
// Revision guards remain necessary for other processes and stale record versions.
export async function withWorkspace(workspace,work){
 let entry=queues.get(workspace);
 if(!entry){entry={tail:Promise.resolve(),pending:0};queues.set(workspace,entry)}
 if(entry.pending>=100)throw new DomainError('Kho đang bận, vui lòng thử lại sau',503);
 entry.pending++;
 const previous=entry.tail;let release;
 entry.tail=new Promise(resolve=>release=resolve);
 await previous;
 try{return await work()}
 finally{entry.pending--;release();if(entry.pending===0)queues.delete(workspace)}
}
