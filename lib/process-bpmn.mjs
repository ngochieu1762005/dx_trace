/* DX-TRACE | BPMN 2.0 XML export of the bounded executable process graph.
 * SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors.
 * Export is for interoperability/inspection, not arbitrary BPMN import.
 */
import {validateProcess} from './process-runtime.mjs';
const NS='http://www.omg.org/spec/BPMN/20100524/MODEL';
const DX='https://dxtrace.hieuds.com/ns/workflow/v1';
const attr=(value)=>String(value).replace(/[&<>"']/g,c=>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]);
export function processToBpmn(input,{modelId='process',name='Executable workflow'}={}){
 const process=validateProcess(input);
 if(!/^[a-z][a-z0-9_]{0,39}$/.test(modelId))throw Error('Invalid process model ID');
 const lines=[
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<bpmn:definitions xmlns:bpmn="'+NS+'" xmlns:dx="'+DX+'" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" targetNamespace="'+DX+'" id="Definitions_'+modelId+'">',
  '  <bpmn:process id="Process_'+modelId+'" name="'+attr(name)+'" isExecutable="true">'
 ];
 for(const n of process.nodes){
  if(n.type==='start'||n.type==='end'){
   lines.push('    <bpmn:'+(n.type==='start'?'startEvent':'endEvent')+' id="'+n.id+'" />');
  }else if(n.type==='userTask'){
   let attrs=' id="'+n.id+'" name="'+attr(n.id)+'" dx:roles="'+attr(n.roles.join(','))+'"';
   if(n.differentActor)attrs+=' dx:differentActor="true"';
   if(n.reasonRequired)attrs+=' dx:reasonRequired="true"';
   lines.push('    <bpmn:userTask'+attrs+' />');
  }else if(n.type==='parallelFork'||n.type==='parallelJoin'){
   lines.push('    <bpmn:parallelGateway id="'+n.id+'" gatewayDirection="'+
    (n.type==='parallelFork'?'Diverging':'Converging')+'" />');
  }else if(n.type==='timer'){
   lines.push('    <bpmn:intermediateCatchEvent id="'+n.id+'">');
   lines.push('      <bpmn:timerEventDefinition id="Timer_'+n.id+'">');
   lines.push('        <bpmn:timeDuration xsi:type="bpmn:tFormalExpression">PT'+n.afterSeconds+'S</bpmn:timeDuration>');
   lines.push('      </bpmn:timerEventDefinition>');
   lines.push('    </bpmn:intermediateCatchEvent>');
  }
 }
 for(const flow of process.flows){
  lines.push('    <bpmn:sequenceFlow id="Flow_'+flow.from+'_'+flow.to+
    '" sourceRef="'+flow.from+'" targetRef="'+flow.to+'" />');
 }
 lines.push('  </bpmn:process>','</bpmn:definitions>','');
 return lines.join('\n');
}
