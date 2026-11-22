/* DX-TRACE | BPMN 2.0 interchange for the declarative workflow runtime.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 *
 * Supported subset: start events, user tasks, exclusive decision gateways,
 * end events and sequence flows. Execution stays in lib/platform.mjs, where
 * permissions, optimistic locking, guards and audit history are enforced.
 * This is not a general-purpose BPMN engine.
 */
import {PlatformError, validateModel} from './platform.mjs';

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
const DX_NS = 'https://dxtrace.hieuds.com/ns/workflow/v1';
const MAX_XML = 100_000;
const MAX_NODES = 200;
const invalid = (message) => { throw new PlatformError('BPMN: ' + message, 422); };
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
})[char]);
const decodeXml = (value) => {
  if (value.replace(/&(?:amp|lt|gt|quot|apos);/g, '').includes('&')) invalid('Thực thể XML không hỗ trợ');
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) =>
    ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[entity]);
};
const validId = (id) => typeof id === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(id);
const validXmlId = (id) => typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,90}$/.test(id);
const attr = (name, value) => ' ' + name + '="' + escapeXml(value) + '"';
const tag = (name, attributes) => '    <bpmn:' + name + attributes + ' />';

/**
 * Export a validated DX-OS model into executable BPMN 2.0 XML.
 * DX extensions on each decision flow preserve role/guard/approval rules.
 * Multi-way decisions use an explicit exclusive gateway, never implicit parallel
 * branches. This exported subset can be imported without information loss.
 */
export function workflowToBpmn(definition) {
  const model = validateModel(definition);
  const wf = model.workflow;
  const flows = [];
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="' + BPMN_NS + '" xmlns:dx="' + DX_NS +
      '" id="Definitions_' + model.id + '" targetNamespace="' + DX_NS + '">',
    '  <bpmn:process id="Process_' + model.id + '"' +
      attr('name', model.name) + ' isExecutable="true">',
    tag('startEvent', ' id="Start_1"')
  ];

  for (const state of wf.states) lines.push(tag('userTask',
    attr('id', 'Task_' + state) + attr('name', state)));
  for (const state of wf.states) {
    if (wf.transitions.filter((edge) => edge.from === state).length > 1) {
      lines.push(tag('exclusiveGateway',
        attr('id', 'Gateway_' + state) + attr('dx:decision', 'manual')));
    }
  }
  for (const state of wf.terminal) {
    lines.push(tag('endEvent', attr('id', 'End_' + state) + attr('name', state)));
  }

  flows.push(tag('sequenceFlow', ' id="Flow_start" sourceRef="Start_1"' +
    attr('targetRef', 'Task_' + wf.initial)));
  for (const state of wf.states) {
    const outgoing = wf.transitions.filter((edge) => edge.from === state);
    const split = outgoing.length > 1;
    if (split) flows.push(tag('sequenceFlow',
      attr('id', 'Flow_split_' + state) + attr('sourceRef', 'Task_' + state) +
      attr('targetRef', 'Gateway_' + state)));
    for (const edge of outgoing) {
      let attrs = attr('id', 'Flow_' + edge.from + '_' + edge.to) +
        attr('sourceRef', split ? 'Gateway_' + state : 'Task_' + state) +
        attr('targetRef', 'Task_' + edge.to) +
        attr('dx:roles', edge.roles.join(','));
      if (edge.when) attrs += attr('dx:guard', JSON.stringify(edge.when));
      if (edge.reasonRequired) attrs += attr('dx:reasonRequired', 'true');
      if (edge.differentActor) attrs += attr('dx:differentActor', 'true');
      if (edge.dueHours !== undefined) attrs += attr('dx:dueHours', edge.dueHours);
      flows.push(tag('sequenceFlow', attrs));
    }
  }
  for (const state of wf.terminal) {
    flows.push(tag('sequenceFlow', attr('id', 'Flow_end_' + state) +
      attr('sourceRef', 'Task_' + state) + attr('targetRef', 'End_' + state)));
  }
  return [...lines, ...flows, '  </bpmn:process>', '</bpmn:definitions>', ''].join('\n');
}

// Parse only the documented, non-extensible BPMN interchange subset. An XML
// general-purpose parser is intentionally not implied. Reject DTD, entity
// declarations, processing instructions and unsupported executable nodes.
function tokenize(xml) {
  if (typeof xml !== 'string' || xml.length < 100 || xml.length > MAX_XML ||
      /<!|<\?(?!xml\b)/i.test(xml)) invalid('XML không hợp lệ hoặc vượt giới hạn');
  const source = xml.replace(/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*/, '');
  if (source.includes('<?')) invalid('Không chấp nhận processing instruction');
  const tokens = [];
  let offset = 0;
  const scanner = /<([^<>]+)>/g;
  for (const match of source.matchAll(scanner)) {
    if (source.slice(offset, match.index).trim()) invalid('Nội dung XML không được hỗ trợ');
    offset = match.index + match[0].length;
    let raw = match[1].trim();
    const closing = raw.startsWith('/');
    const selfClose = raw.endsWith('/');
    if (closing) raw = raw.slice(1);
    if (selfClose) raw = raw.slice(0, -1).trimEnd();
    const head = /^([A-Za-z][\w:.-]*)/.exec(raw);
    if (!head || (!closing && !head[1].startsWith('bpmn:')) ||
        (closing && selfClose)) invalid('Phần tử XML không được hỗ trợ');
    const name = head[1];
    let remaining = raw.slice(head[0].length);
    const attributes = Object.create(null);
    if (closing && remaining.trim()) invalid('Thẻ đóng có thuộc tính');
    while (remaining.trim()) {
      const a = /^\s+([A-Za-z_][\w:.-]*)\s*=\s*"([^"<>]*)"/.exec(remaining);
      if (!a || Object.hasOwn(attributes, a[1])) invalid('Thuộc tính XML trùng hoặc sai định dạng');
      attributes[a[1]] = decodeXml(a[2]);
      remaining = remaining.slice(a[0].length);
    }
    tokens.push({name, closing, selfClose, attributes});
    if (tokens.length > MAX_NODES) invalid('Quá nhiều phần tử BPMN');
  }
  if (source.slice(offset).trim()) invalid('XML có nội dung thừa');
  return tokens;
}
function expectAttributes(attributes, allowed, required = []) {
  if (Object.keys(attributes).some((key) => !allowed.includes(key))) invalid('Thuộc tính không hỗ trợ');
  if (required.some((key) => !Object.hasOwn(attributes, key))) invalid('Thiếu thuộc tính bắt buộc');
}
function parseFlowAttributes(attrs) {
  const allowed = ['id','sourceRef','targetRef','dx:roles','dx:guard',
    'dx:reasonRequired','dx:differentActor','dx:dueHours'];
  expectAttributes(attrs, allowed, ['id','sourceRef','targetRef']);
  const edge = {};
  if (attrs['dx:roles'] !== undefined) {
    edge.roles = attrs['dx:roles'].split(',');
    if (!edge.roles.length || edge.roles.some((role) => !validId(role))) invalid('Vai trò không hợp lệ');
  }
  if (attrs['dx:guard'] !== undefined) {
    try { edge.when = JSON.parse(attrs['dx:guard']); }
    catch { invalid('Điều kiện không phải JSON hợp lệ'); }
  }
  for (const field of ['reasonRequired','differentActor']) {
    if (attrs['dx:' + field] !== undefined) {
      if (attrs['dx:' + field] !== 'true' && attrs['dx:' + field] !== 'false')
        invalid('Cờ kiểm soát không hợp lệ');
      edge[field] = attrs['dx:' + field] === 'true';
    }
  }
  if (attrs['dx:dueHours'] !== undefined) {
    if (!/^[1-9]\d{0,3}$/.test(attrs['dx:dueHours'])) invalid('SLA không hợp lệ');
    edge.dueHours = Number(attrs['dx:dueHours']);
  }
  return edge;
}

/**
 * Return {modelId, workflow} for the supported subset. Call validateModel or
 * modelPlan with the resulting workflow before persisting. Unknown constructs
 * fail closed instead of being silently ignored.
 */
export function bpmnToWorkflow(xml) {
  const tokens = tokenize(xml);
  const stack = [];
  const nodes = new Map(), flows = [];
  let process = null, modelId = null;
  const addNode = (type, a) => {
    expectAttributes(a,
      type === 'exclusiveGateway' ? ['id','dx:decision'] :
      type === 'userTask' || type === 'endEvent' ? ['id','name'] : ['id'],
      ['id']);
    if (!validXmlId(a.id) || nodes.has(a.id)) invalid('Mã phần tử trùng hoặc không hợp lệ');
    if (type === 'exclusiveGateway' && a['dx:decision'] !== 'manual')
      invalid('Chỉ hỗ trợ cổng lựa chọn thủ công');
    nodes.set(a.id, {type, ...a});
  };
  for (const t of tokens) {
    if (t.closing) {
      if (stack.pop() !== t.name) invalid('Thẻ XML đóng không đúng thứ tự');
      continue;
    }
    if (t.name === 'bpmn:definitions') {
      if (stack.length || process !== null || tokens[0] !== t || t.selfClose)
        invalid('Cấu trúc definitions không hợp lệ');
      expectAttributes(t.attributes, ['xmlns:bpmn','xmlns:dx','id','targetNamespace'],
        ['xmlns:bpmn','xmlns:dx']);
      if (t.attributes['xmlns:bpmn'] !== BPMN_NS || t.attributes['xmlns:dx'] !== DX_NS)
        invalid('Namespace không được hỗ trợ');
    } else if (t.name === 'bpmn:process') {
      if (stack.join('/') !== 'bpmn:definitions' || process || t.selfClose)
        invalid('Mỗi tài liệu chỉ được có một process');
      expectAttributes(t.attributes, ['id','name','isExecutable'], ['id','isExecutable']);
      if (!/^Process_[a-z][a-z0-9_]{0,39}$/.test(t.attributes.id) ||
          t.attributes.isExecutable !== 'true') invalid('Mã process không hợp lệ');
      process = t.attributes;
      modelId = process.id.slice('Process_'.length);
    } else {
      if (stack.join('/') !== 'bpmn:definitions/bpmn:process' || !t.selfClose)
        invalid('Chỉ hỗ trợ phần tử BPMN phẳng trong process');
      const type = t.name.startsWith('bpmn:') ? t.name.slice(5) : '';
      if (['startEvent','userTask','endEvent','exclusiveGateway'].includes(type)) {
        addNode(type, t.attributes);
      } else if (type === 'sequenceFlow') {
        const a = t.attributes;
        const edge = parseFlowAttributes(a);
        if (!validXmlId(a.id) || !validXmlId(a.sourceRef) || !validXmlId(a.targetRef) ||
            nodes.has(a.id)) invalid('Mã sequence flow không hợp lệ');
        nodes.set(a.id, {type});
        flows.push({...edge, source: a.sourceRef, target: a.targetRef});
      } else invalid('Không hỗ trợ phần tử BPMN: ' + type);
    }
    if (!t.selfClose) stack.push(t.name);
  }
  if (stack.length || !process || nodes.size > MAX_NODES) invalid('Thiếu thẻ đóng hoặc process');
  const entries = [...nodes.entries()].filter(([,node]) => node.type !== 'sequenceFlow');
  const starts = entries.filter(([,node]) => node.type === 'startEvent');
  const tasks = entries.filter(([,node]) => node.type === 'userTask');
  const ends = entries.filter(([,node]) => node.type === 'endEvent');
  const gateways = entries.filter(([,node]) => node.type === 'exclusiveGateway');
  if (starts.length !== 1 || starts[0][0] !== 'Start_1' ||
      tasks.length < 1 || tasks.length > 20 || !ends.length)
    invalid('Cần một startEvent, 1–20 userTask và ít nhất một endEvent');

  const states = tasks.map(([id,node]) => {
    if (!/^Task_[a-z][a-z0-9_]{0,39}$/.test(id) ||
        (node.name !== undefined && node.name !== id.slice(5)))
      invalid('Mã task phải khớp với trạng thái');
    return id.slice(5);
  });
  const terminals = ends.map(([id,node]) => {
    if (!/^End_[a-z][a-z0-9_]{0,39}$/.test(id) ||
        !states.includes(id.slice(4)) || (node.name && node.name !== id.slice(4)))
      invalid('End event không khớp với task');
    return id.slice(4);
  });
  if (new Set(terminals).size !== terminals.length) invalid('End event trùng');
  for (const flow of flows) {
    if (!nodes.has(flow.source) || !nodes.has(flow.target))
      invalid('Sequence flow tham chiếu phần tử không tồn tại');
  }
  const outgoing = (id) => flows.filter((flow) => flow.source === id);
  const incoming = (id) => flows.filter((flow) => flow.target === id);
  const startOut = outgoing('Start_1');
  if (startOut.length !== 1 || !startOut[0].target.startsWith('Task_') ||
      incoming('Start_1').length) invalid('Start event phải nối tới một userTask');
  const initial = startOut[0].target.slice(5);
  const transitions = [];
  for (const state of states) {
    const id = 'Task_' + state;
    const outs = outgoing(id), end = terminals.includes(state);
    if (end) {
      if (outs.length !== 1 || outs[0].target !== 'End_' + state)
        invalid('Terminal state phải nối tới end event');
      continue;
    }
    if (outs.length !== 1) invalid('Task phải có một nhánh tiếp theo hoặc gateway');
    let edges = outs, fromGateway = false;
    if (outs[0].target.startsWith('Gateway_')) {
      const gateway = outs[0].target;
      if (gateway !== 'Gateway_' + state || incoming(gateway).length !== 1)
        invalid('Gateway không thuộc task tương ứng');
      edges = outgoing(gateway);
      fromGateway = true;
      if (edges.length < 2) invalid('Exclusive gateway cần ít nhất hai nhánh');
    }
    for (const edge of edges) {
      if (!edge.target.startsWith('Task_') ||
          !Object.hasOwn(edge, 'roles') || edge.target === id)
        invalid('Nhánh BPMN thiếu vai trò hoặc đích không hợp lệ');
      transitions.push({from: state, to: edge.target.slice(5),
        roles: edge.roles, ...(edge.when ? {when: edge.when} : {}),
        ...(edge.reasonRequired !== undefined ? {reasonRequired: edge.reasonRequired} : {}),
        ...(edge.differentActor !== undefined ? {differentActor: edge.differentActor} : {}),
        ...(edge.dueHours !== undefined ? {dueHours: edge.dueHours} : {})});
    }
    if (!fromGateway && outs[0].target.startsWith('Gateway_'))
      invalid('Gateway không hợp lệ');
  }
  for (const [id] of gateways) {
    if (!states.includes(id.slice(8)) || incoming(id).length !== 1)
      invalid('Gateway mồ côi');
  }
  for (const [id] of ends) {
    if (incoming(id).length !== 1 || outgoing(id).length)
      invalid('End event phải có một incoming flow');
  }
  for (const state of states) {
    const id = 'Task_' + state;
    if (!incoming(id).length || (state !== initial && incoming(id).some(
      (f) => f.source === 'Start_1'))) invalid('Task không nối hợp lệ');
  }
  if (transitions.length > 50) invalid('Quá nhiều bước chuyển');
  const reached = new Set([initial]), queue = [initial];
  while (queue.length) {
    const state = queue.shift();
    for (const t of transitions.filter((item) => item.from === state)) {
      if (!reached.has(t.to)) { reached.add(t.to); queue.push(t.to); }
    }
  }
  if (reached.size !== states.length) invalid('Có trạng thái không thể đi tới');
  const canFinish = new Set(terminals), reverse = [...terminals];
  while (reverse.length) {
    const to = reverse.shift();
    for (const t of transitions.filter((item) => item.to === to)) {
      if (!canFinish.has(t.from)) { canFinish.add(t.from); reverse.push(t.from); }
    }
  }
  if (canFinish.size !== states.length) invalid('Có trạng thái không thể kết thúc');
  return {modelId, workflow: {states, initial, terminal: terminals, transitions}};
}
