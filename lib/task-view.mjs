/* DX-TRACE | Read-only task projection; all writes are authorized by Core.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {conditionMatches} from './platform.mjs';
export function executableTasks(definition,record,role,actor){
 if(record.process){
  if(record.process.status!=='running')return [];
  return (definition.orchestration?.nodes||[]).filter(node=>node.type==='userTask'&&record.process.tokens.some(token=>token.node===node.id)&&node.roles.includes(role)&&(!node.differentActor||record.createdBy!==actor)).map(node=>({id:node.id,reasonRequired:!!node.reasonRequired,process:true}));
 }
 return definition.workflow.transitions.filter(edge=>edge.from===record.status&&edge.roles.includes(role)&&(!edge.differentActor||record.createdBy!==actor)&&(!edge.when||conditionMatches(edge.when,record.data))).map(edge=>({id:edge.to,reasonRequired:!!edge.reasonRequired,process:false}));
}
