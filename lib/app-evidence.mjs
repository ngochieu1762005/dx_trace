/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 DX-TRACE contributors
import {applyPlatform} from './platform.mjs';
import {workflowToBpmn} from './bpmn.mjs';
import {createHash} from 'node:crypto';

export function appDecisionSnapshot({context, model, before, after, body, seq, now, simulated}) {
  const {workspace,role,id:subject}=context;
  const actor=context.email||context.name;
  const edge=model.definition.workflow.transitions.find(t=>t.from===before.status && t.to===after.status);
  const type='platform.transition';
  const inputs={model:{id:model.id,version:model.version,definition:model.definition},before,after,command:body};
  return {
    subjectId:after.id,
    decision:{id:'decision-'+seq,type,workspace,occurredAt:now,eventSequence:seq,eventEntity:after.id,simulated,
      identity:{subject,role,auditActor:actor},authorization:{allowed:true,permission:type,workspace,subject},
      transition:{entityType:model.id,entityId:after.id,before:before.status,after:after.status}},
    policy:{id:model.id+'.transition',version:String(model.version),action:type,allowedRoles:edge.roles,transitions:[edge]},
    workflow:{id:'Process_'+model.id,version:String(model.version),engine:'DX-TRACE AppKit',bpmn:workflowToBpmn(model.definition)},
    lineage:{workspace,sources:Object.entries(inputs).map(([id,data])=>({id,kind:'appkit-'+id,origin:workspace+'/'+model.id+'/'+after.id,data}))}
  };
}

// Re-run the same versioned role, ownership, guard, reason, revision and history rules offline.
export function verifyAppDecision(decision,policy,lineage,workflow,event,canonical) {
  if(decision.type!=='platform.transition')return;
  const {model,before,after,command}=Object.fromEntries(lineage.sources.map(s=>[s.id,s.data]));
  const digest=data=>createHash('sha256').update(data).digest('hex');
  const edge=model.definition.workflow.transitions.find(t=>t.from===before.status&&t.to===command.target);
  if(!edge || model.id!==model.definition.id || before.id!==after.id || before.model!==model.id ||
     command.model!==model.id || command.id!==after.id || decision.transition.entityType!==model.id ||
     decision.transition.entityId!==after.id || decision.eventEntity!==after.id || event.model!==model.id ||
     decision.transition.before!==before.status || decision.transition.after!==after.status ||
     event.inputHash!==digest(canonical(lineage.sources)) || policy.version!==String(model.version) ||
     workflow.version!==policy.version || workflow.sha256!==digest(workflowToBpmn(model.definition)) ||
     canonical(policy.transitions)!==canonical([edge]) || canonical(policy.allowedRoles)!==canonical(edge.roles))
    throw Error('AppKit model, transition or ledger binding mismatch');
  const state={models:[model],records:[structuredClone(before)]};
  applyPlatform(state,decision.type,command,{role:decision.identity.role,actor:decision.identity.auditActor,now:decision.occurredAt});
  if(canonical(state.records[0])!==canonical(after))throw Error('AppKit decision replay mismatch');
}
