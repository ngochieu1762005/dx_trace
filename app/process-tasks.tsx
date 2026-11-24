/* DX-TRACE | Human tasks and durable timers in the operations console.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import React from 'react';
import {executableTasks} from '../lib/task-view.mjs';
export default function ProcessTasks({definition,record,role,actor,busy,reason,onComplete}:any){
 const tasks=executableTasks(definition,record,role,actor);
 return <div className="process-tasks"><h3>Quy trình song song</h3>
  <p>{record.process.status==='completed'?'Tất cả nhánh đã hoàn tất.':'Các nhánh đang xử lý độc lập. Hệ thống chỉ chuyển tiếp khi đủ điều kiện hội tụ.'}</p>
  <div className="process-branches">{record.process.tokens.map((token:any)=>{
   const node=definition.orchestration.nodes.find((n:any)=>n.id===token.node);
   const executable=tasks.find((task:any)=>task.id===token.node);
   return <div key={token.id}><b>{token.node.replaceAll('_',' ')}</b><small>{node?.type==='timer'?'Chờ đến '+new Date(token.readyAt).toLocaleString('vi-VN'):executable?'Bạn có thể xử lý':'Chờ người có quyền xử lý'}</small>
    {executable&&<button className="secondary small" disabled={busy||executable.reasonRequired&&!reason.trim()} onClick={()=>onComplete(token.node)}>Hoàn tất bước{executable.reasonRequired?' (cần lý do)':''}</button>}
   </div>;
  })}</div>
  {Object.keys(record.process.joins).length>0&&<p>Đã có nhánh hoàn tất; đang chờ các nhánh còn lại.</p>}
  <details><summary>Lịch sử quy trình</summary>{record.process.history.map((item:any,index:number)=><p key={index}>{new Date(item.created).toLocaleString('vi-VN')} · {item.actor||'Bộ xử lý thời gian'} · {item.task||item.action}{item.reason?' · '+item.reason:''}</p>)}</details>
 </div>;
}
