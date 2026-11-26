/* DX-TRACE | Signed, independently verifiable Business Decision Proof v1.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {createHash, createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {TextDecoder} from 'node:util';
import {EVIDENCE_FILES, EVIDENCE_LIMITS, packEvidenceFiles, unpackEvidenceFiles} from './evidence-archive.mjs';

export {EVIDENCE_FILES, EVIDENCE_LIMITS};
export const encodeEvidenceArchive = packEvidenceFiles;
export const readEvidenceArchive = unpackEvidenceFiles;
const SCHEMA = 'dxtrace.business-decision-proof.v1';
const ZERO = '0'.repeat(64);
const HEX = /^[a-f0-9]{64}$/;
const DOMAIN = Buffer.from('DX-TRACE Business Decision Proof v1\n', 'utf8');
const PAYLOAD_FILES = EVIDENCE_FILES.filter(name => !['manifest.json', 'signature.sig'].includes(name));
const SOURCE_FILES = PAYLOAD_FILES.filter(name => name !== 'proof.json');
const decoder = new TextDecoder('utf-8', {fatal: true});
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const requiredString = (value, label, max = 1000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('Invalid ' + label);
  return value;
};
const hash = value => createHash('sha256').update(value).digest('hex');
export const evidenceSha256 = hash;

/** Stable JSON for this schema, not a claim of implementing a new crypto algorithm. */
export function canonicalEvidenceJSON(value) {
  const visited = new Set();
  function encode(input, depth) {
    if (depth > 100) fail('JSON nesting limit exceeded');
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return JSON.stringify(input);
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) fail('Non-finite JSON number');
      return JSON.stringify(input);
    }
    if (typeof input !== 'object' || visited.has(input)) fail('Invalid or cyclic JSON value');
    if (!Array.isArray(input) && ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail('Plain JSON objects required');
    visited.add(input);
    const result = Array.isArray(input)
      ? '[' + Array.from(input, item => encode(item, depth + 1)).join(',') + ']'
      : '{' + Object.keys(input).sort().map(key => JSON.stringify(key) + ':' + encode(input[key], depth + 1)).join(',') + '}';
    visited.delete(input);
    return result;
  }
  return encode(value, 0);
}
const jsonBytes = value => Buffer.from(canonicalEvidenceJSON(value) + '\n', 'utf8');
const equal = (a, b) => canonicalEvidenceJSON(a) === canonicalEvidenceJSON(b);
function parseCanonical(bytes, label) {
  let text, value;
  try { text = decoder.decode(bytes); value = JSON.parse(text); }
  catch { fail('Invalid UTF-8 or JSON in ' + label); }
  if (!jsonBytes(value).equals(bytes)) fail('Non-canonical JSON in ' + label);
  return value;
}

/** Only the four immutable chain columns are serialized, regardless of SQL row order. */
export function serializeEvidenceEvents(events) {
  if (!Array.isArray(events) || events.length > EVIDENCE_LIMITS.events) fail('Invalid event count');
  return Buffer.from(events.map(({seq, previous, hash, payload}) => canonicalEvidenceJSON({seq, previous, hash, payload}) + '\n').join(''), 'utf8');
}
function parseEvents(bytes) {
  let text;
  try { text = decoder.decode(bytes); } catch { fail('Invalid event UTF-8'); }
  if (!text || !text.endsWith('\n')) fail('An event chain with a final newline is required');
  const lines = text.slice(0, -1).split('\n');
  if (lines.length > EVIDENCE_LIMITS.events) fail('Event count exceeds limit');
  return lines.map(line => {
    let row;
    try { row = JSON.parse(line); } catch { fail('Invalid event JSON'); }
    if (!object(row) || Object.keys(row).sort().join(',') !== 'hash,payload,previous,seq' || canonicalEvidenceJSON(row) !== line)
      fail('Invalid canonical event row');
    return row;
  });
}
function eventChain(events) {
  if (!Array.isArray(events) || !events.length || events.length > EVIDENCE_LIMITS.events) fail('Empty or excessive event chain');
  let previous = ZERO, lastSequence = 0;
  for (const row of events) {
    if (!Number.isSafeInteger(row.seq) || row.seq <= lastSequence || typeof row.payload !== 'string' ||
        !HEX.test(row.hash) || row.previous !== previous || hash(previous + '\n' + row.seq + '\n' + row.payload) !== row.hash)
      fail('Event hash chain mismatch at sequence ' + row.seq);
    previous = row.hash;
    lastSequence = row.seq;
  }
  return {algorithm: 'SHA-256',encoding: 'previous+LF+seq+LF+payload',initialHash: ZERO,
    entries: events.length, firstSequence: events[0].seq, lastSequence, head: previous};
}
function publicMaterial(key) {
  let publicKey;
  try { publicKey = key?.type === 'public' ? key : createPublicKey(key); }
  catch { fail('Invalid Ed25519 public key'); }
  if (publicKey.asymmetricKeyType !== 'ed25519') fail('Ed25519 public key required');
  return {key: publicKey, pem: publicKey.export({type: 'spki', format: 'pem'}).toString(),
    fingerprint: hash(publicKey.export({type: 'spki', format: 'der'}))};
}
function privateMaterial(key) {
  let result;
  try { result = key?.type === 'private' ? key : createPrivateKey(key); }
  catch { fail('Invalid Ed25519 signing key'); }
  if (result.asymmetricKeyType !== 'ed25519') fail('Ed25519 signing key required');
  return result;
}
function sourceBindings(lineage) {
  if (!object(lineage) || !Array.isArray(lineage.sources) || !lineage.sources.length || lineage.sources.length > 10000)
    fail('Data lineage sources are required');
  const seen = new Set();
  return lineage.sources.map(source => {
    if (!object(source)) fail('Invalid lineage source');
    requiredString(source.id, 'lineage source id', 300);
    requiredString(source.kind, 'lineage source kind', 100);
    requiredString(source.origin, 'lineage source origin', 2000);
    if (seen.has(source.id)) fail('Duplicate lineage source id');
    seen.add(source.id);
    const digest = Object.hasOwn(source, 'data') ? hash(jsonBytes(source.data)) : source.sha256;
    if (!HEX.test(digest) || (source.sha256 !== undefined && source.sha256 !== digest)) fail('Lineage source digest mismatch');
    return {id: source.id, sha256: digest};
  });
}
function workflowBinding(workflow) {
  if (!object(workflow)) fail('Workflow snapshot required');
  requiredString(workflow.id, 'workflow id', 300);
  requiredString(workflow.version, 'workflow version', 300);
  requiredString(workflow.bpmn, 'workflow BPMN', EVIDENCE_LIMITS.fileBytes);
  const bytes = Buffer.from(workflow.bpmn, 'utf8');
  // No XML expansion or execution. Bind a literal, unambiguous process ID in BPMN.
  if (/<!DOCTYPE|<!ENTITY/i.test(workflow.bpmn)) fail('BPMN external entities are forbidden');
  const processes = [...workflow.bpmn.matchAll(/<(?:[A-Za-z_][\w.-]*:)?process\s[^>]*\bid\s*=\s*(["'])([^"']+)\1[^>]*>/g)];
  if (processes.length !== 1 || processes[0][2] !== workflow.id || !workflow.bpmn.includes('http://www.omg.org/spec/BPMN/20100524/MODEL'))
    fail('Workflow process id does not match BPMN');
  return {id: workflow.id, version: workflow.version, sha256: hash(bytes),
    ...(workflow.instanceId === undefined ? {} : {instanceId: workflow.instanceId}),
    ...(workflow.engine === undefined ? {} : {engine: workflow.engine}),
    ...(workflow.provenance === undefined ? {} : {provenance: workflow.provenance})};
}
/** Check the supported native review policy against captured engine history and durable intents. */
function validateNativeReview(decision, policy, lineage, workflow) {
  if (policy.review === undefined) return;
  const reviewPolicy = policy.review;
  const expectedRoles = {quality: ['owner', 'manager'], inventory: ['owner', 'manager', 'warehouse'], approval: ['owner', 'manager']};
  if (!object(reviewPolicy) || reviewPolicy.id !== 'dxtrace.native-review' || reviewPolicy.version !== 2 ||
      reviewPolicy.creatorMayApprove !== false || !equal(reviewPolicy.roles, expectedRoles)) fail('Unsupported native review policy');
  const history = lineage.sources.find(source => source.id === 'flowable-history')?.data;
  const intents = lineage.sources.find(source => source.id === 'reviewer-decisions')?.data;
  if (!object(history) || !object(history.history) || !object(history.definition) || !Array.isArray(history.tasks) ||
      !Array.isArray(history.variables) || !Array.isArray(intents) || !equal(history.decisions, intents) || !equal(history.policy, reviewPolicy))
    fail('Native review history, policy and decision sources disagree');
  if (decision.type !== 'quality.project' || !object(decision.review) || workflow.engine !== 'Flowable OSS' || history.engine !== workflow.engine ||
      history.instanceId !== workflow.instanceId || history.history.id !== workflow.instanceId || decision.review.instance !== workflow.instanceId ||
      !Number.isFinite(Date.parse(history.history.endTime)) || history.history.endActivityId !== decision.review.outcome ||
      !['accepted', 'rejected'].includes(decision.review.outcome)) fail('Native review instance or completed outcome mismatch');
  if (history.definition.key !== workflow.id || !Number.isSafeInteger(history.definition.version) || history.definition.version < 1 ||
      String(history.definition.version) !== workflow.version) fail('Native review deployed definition version mismatch');
  requiredString(history.definition.id, 'native definition id');
  requiredString(history.definition.deploymentId, 'native deployment id');
  requiredString(decision.review.reporter, 'review reporter');
  if (history.creator !== hash(decision.workspace + '\n' + decision.review.reporter)) fail('Review creator identity does not match the reporter');
  if (history.businessKey !== hash(JSON.stringify(['quality-recall', decision.workspace, decision.transition.entityId])))
    fail('Native review business key does not match this incident and workspace');
  if (history.bpmn !== undefined && (typeof history.bpmn !== 'string' || hash(Buffer.from(history.bpmn, 'utf8')) !== workflow.sha256))
    fail('Native review history BPMN differs from the captured workflow');
  const processVariable = name => {
    const rows = history.variables.filter(variable => object(variable) && !variable.taskId && variable.name === name);
    if (rows.length !== 1) fail('Missing or ambiguous native review variable: ' + name);
    return rows[0].value;
  };
  if (processVariable('creator') !== history.creator) fail('Native review creator variable mismatch');
  if (history.tasks.length < 2 || history.tasks.length > 3 || intents.length !== history.tasks.length) fail('Native review task/intent set incomplete');
  const taskIds = new Set(), steps = new Map();
  for (const task of history.tasks) {
    if (!object(task) || !Object.hasOwn(expectedRoles, task.step) || taskIds.has(task.id) || steps.has(task.step) ||
        !Number.isFinite(Date.parse(task.endTime))) fail('Unknown, duplicate or unfinished native review task');
    requiredString(task.id, 'native task id');
    taskIds.add(task.id);
    const matches = intents.filter(intent => object(intent) && intent.taskId === task.id);
    if (matches.length !== 1) fail('Native review task lacks one durable authorized decision');
    const intent = matches[0];
    if (intent.status !== 'completed' || intent.step !== task.step || typeof intent.approved !== 'boolean' ||
        !reviewPolicy.roles[task.step].includes(intent.role) || intent.actor !== task.assignee || intent.actor === history.creator ||
        intent.actor !== hash(decision.workspace + '\n' + intent.subject)) fail('Native review actor, role or completion intent mismatch');
    requiredString(intent.subject, 'reviewer subject');
    requiredString(intent.reason, 'reviewer reason', 500);
    if (intent.reason !== intent.reason.trim() || !Number.isFinite(Date.parse(intent.recordedAt)) || !Number.isFinite(Date.parse(intent.completedAt)))
      fail('Invalid native review decision record');
    for (const [suffix, value] of [['Approved', intent.approved], ['Reviewer', intent.actor], ['Reason', intent.reason]])
      if (processVariable(task.step + suffix) !== value) fail('Native review variables do not match the authorized intent');
    steps.set(task.step, intent.approved);
  }
  const firstReviewsPassed = steps.get('quality') === true && steps.get('inventory') === true;
  const accepted = steps.size === 3 && firstReviewsPassed && steps.get('approval') === true;
  const rejected = steps.has('quality') && steps.has('inventory') &&
    ((!firstReviewsPassed && steps.size === 2) || (firstReviewsPassed && steps.size === 3 && steps.get('approval') === false));
  if (decision.review.outcome === 'accepted' ? !accepted : !rejected) fail('Native review task decisions do not justify the recorded outcome');
  if (decision.transition.before !== 'pending' || decision.transition.after !== (accepted ? 'approved' : 'review-rejected'))
    fail('Native review outcome does not justify the state transition');
  if (policy.conditions?.instanceId !== undefined && policy.conditions.instanceId !== workflow.instanceId ||
      policy.conditions?.outcome !== undefined && policy.conditions.outcome !== decision.review.outcome)
    fail('Native review policy conditions mismatch');
}
function validateContext(decision, policy, lineage, workflow, events) {
  if (!object(decision) || !object(policy)) fail('Decision and policy must be objects');
  for (const name of ['id', 'workspace', 'type', 'occurredAt', 'eventEntity']) requiredString(decision[name], 'decision ' + name);
  if (!Number.isFinite(Date.parse(decision.occurredAt))) fail('Invalid decision time');
  if (!object(decision.identity) || !object(decision.authorization) || !object(decision.transition)) fail('Missing business context');
  for (const name of ['subject', 'role', 'auditActor']) requiredString(decision.identity[name], 'identity ' + name);
  for (const name of ['entityType', 'entityId']) requiredString(decision.transition[name], 'transition ' + name);
  if (!Object.hasOwn(decision.transition, 'before') || !Object.hasOwn(decision.transition, 'after') ||
      equal(decision.transition.before, decision.transition.after)) fail('A changed before/after state is required');
  for (const name of ['id', 'version', 'action']) requiredString(policy[name], 'policy ' + name);
  if (!Array.isArray(policy.allowedRoles) || !policy.allowedRoles.length || policy.allowedRoles.some(role => typeof role !== 'string') ||
      new Set(policy.allowedRoles).size !== policy.allowedRoles.length || !policy.allowedRoles.includes(decision.identity.role))
    fail('Actor role does not satisfy the captured policy');
  if (decision.authorization.allowed !== true || decision.authorization.permission !== policy.action || decision.type !== policy.action ||
      decision.authorization.workspace !== decision.workspace || decision.authorization.subject !== decision.identity.subject)
    fail('Authorization does not match decision, identity and policy');
  if (!Number.isSafeInteger(decision.eventSequence) || decision.eventSequence < 1) fail('Invalid decision event sequence');
  const selected = events.find(row => row.seq === decision.eventSequence);
  if (!selected) fail('Decision event missing from chain');
  let event;
  try { event = JSON.parse(selected.payload); } catch { fail('Selected event payload is not JSON'); }
  if (!object(event) || event.action !== decision.type || event.actor !== decision.identity.auditActor ||
      event.entity !== decision.eventEntity || event.created !== decision.occurredAt)
    fail('Decision is not bound to the selected audit event');
  if (event.workspace !== undefined && event.workspace !== decision.workspace) fail('Audit event workspace mismatch');
  if (policy.workflowId !== undefined && policy.workflowId !== workflow.id) fail('Policy workflow mismatch');
  if (policy.transitions !== undefined) {
    if (!Array.isArray(policy.transitions) || !policy.transitions.some(item => object(item) && equal(item.from, decision.transition.before) && equal(item.to, decision.transition.after)))
      fail('State transition is not permitted by the captured policy');
  }
  if (!equal(decision.inputs, sourceBindings(lineage))) fail('Decision input lineage mismatch');
  if (lineage.workspace !== undefined && lineage.workspace !== decision.workspace) fail('Lineage workspace mismatch');
  validateNativeReview(decision, policy, lineage, workflow);
  return selected;
}
function withBinding(input, name, value) {
  if (input[name] !== undefined && !equal(input[name], value)) fail('Caller-supplied ' + name + ' binding does not match artifacts');
  return value;
}

/** Capture and sign only after authorization, and persist the exact files atomically with the decision. */
export function createEvidenceArchive(snapshot, options = {}) {
  if (!object(snapshot)) fail('Evidence snapshot required');
  const signingKey = privateMaterial(options.privateKey);
  const material = publicMaterial(signingKey);
  const keyId = options.keyId || material.fingerprint;
  requiredString(keyId, 'key id', 300);
  const {policy, lineage, events} = snapshot;
  const workflow = workflowBinding(snapshot.workflow);
  const policyBytes = jsonBytes(policy);
  const decision = {...snapshot.decision,
    authorization: {...snapshot.decision?.authorization,
      workspace: snapshot.decision?.authorization?.workspace ?? snapshot.decision?.workspace,
      subject: snapshot.decision?.authorization?.subject ?? snapshot.decision?.identity?.subject},
    policy: withBinding(snapshot.decision, 'policy', {id: policy.id, version: policy.version, sha256: hash(policyBytes)}),
    workflow: withBinding(snapshot.decision, 'workflow', workflow),
    inputs: withBinding(snapshot.decision, 'inputs', sourceBindings(lineage))};
  const chain = eventChain(events);
  const selected = validateContext(decision, policy, lineage, workflow, events);
  if (events.some(row => row.workspace !== undefined && row.workspace !== decision.workspace)) fail('Event belongs to another workspace');
  const files = {
    'decision.json': jsonBytes(decision),
    'events.jsonl': serializeEvidenceEvents(events),
    'policy.json': policyBytes,
    'workflow.bpmn': Buffer.from(snapshot.workflow.bpmn, 'utf8'),
    'data-lineage.json': jsonBytes(lineage)
  };
  const proof = {schema: SCHEMA, algorithm: 'SHA-256', workspace: decision.workspace, decisionId: decision.id,
    eventChain: chain, selectedEvent: {sequence: selected.seq, hash: selected.hash},
    artifacts: Object.fromEntries(SOURCE_FILES.map(name => [name, hash(files[name])]))};
  files['proof.json'] = jsonBytes(proof);
  const manifest = {schema: SCHEMA, decisionId: decision.id, workspace: decision.workspace,
    createdAt: options.createdAt || decision.occurredAt,
    files: Object.fromEntries(PAYLOAD_FILES.map(name => [name, {sha256: hash(files[name]), bytes: files[name].length}])),
    signature: {algorithm: 'Ed25519', keyId, keyFingerprint: material.fingerprint, publicKey: material.pem,
      scope: 'DX-TRACE Business Decision Proof v1\n + manifest.json'}};
  files['manifest.json'] = jsonBytes(manifest);
  files['signature.sig'] = sign(null, Buffer.concat([DOMAIN, files['manifest.json']]), signingKey);
  const archive = packEvidenceFiles(files);
  return {archive, files, manifest, checkpoint: hash(files['manifest.json']), publicKey: material.pem, keyId};
}

/** Offline verification never fetches a key or trusts an archive-supplied key by itself. */
export function verifyEvidenceArchive(archive, options = {}) {
  const checks = [];
  const report = {valid: false, anchored: false, schema: SCHEMA, checks,
    assurance: 'Verifies signed captured assertions and their consistency; it does not independently establish source truth, current authorization, sensor accuracy, or external workflow execution.'};
  const check = (id, label, fn) => {
    try { const value = fn(); checks.push({id, label, status: 'VALID'}); return value; }
    catch (error) { checks.push({id, label, status: 'INVALID', detail: error.message}); throw error; }
  };
  try {
    const files = check('archive', 'Archive structure', () => unpackEvidenceFiles(archive));
    const manifest = check('manifest', 'Manifest integrity', () => {
      const value = parseCanonical(files['manifest.json'], 'manifest.json');
      if (!object(value) || value.schema !== SCHEMA || !object(value.files) ||
          Object.keys(value.files).sort().join(',') !== [...PAYLOAD_FILES].sort().join(',')) fail('Invalid manifest schema or file set');
      requiredString(value.decisionId, 'manifest decision id');
      requiredString(value.workspace, 'manifest workspace');
      if (!Number.isFinite(Date.parse(value.createdAt))) fail('Invalid manifest capture time');
      for (const name of PAYLOAD_FILES) {
        const entry = value.files[name];
        if (!object(entry) || !HEX.test(entry.sha256) || entry.bytes !== files[name].length || entry.sha256 !== hash(files[name]))
          fail('Manifest mismatch: ' + name);
      }
      return value;
    });
    report.decisionId = manifest.decisionId;
    report.workspace = manifest.workspace;
    report.checkpoint = hash(files['manifest.json']);
    const material = check('signature', 'Digital signature', () => {
      if (!object(manifest.signature) || manifest.signature.algorithm !== 'Ed25519' ||
          manifest.signature.scope !== 'DX-TRACE Business Decision Proof v1\n + manifest.json') fail('Unsupported signature profile');
      requiredString(manifest.signature.keyId, 'key id', 300);
      const key = publicMaterial(manifest.signature.publicKey);
      if (key.fingerprint !== manifest.signature.keyFingerprint) fail('Signer fingerprint mismatch');
      if (files['signature.sig'].length !== 64 || !verify(null, Buffer.concat([DOMAIN, files['manifest.json']]), key.key, files['signature.sig']))
        fail('Ed25519 signature mismatch');
      return key;
    });
    report.keyId = manifest.signature.keyId;
    report.keyFingerprint = material.fingerprint;
    // Validate every supplied trust anchor. A correct checkpoint cannot hide a wrong supplied key.
    const anchored = check('trust', 'External trust anchor', () => {
      if (options.publicKey === undefined && options.checkpoint === undefined) fail('UNTRUSTED: provide an independently trusted public key or manifest SHA-256 checkpoint');
      if (options.publicKey !== undefined && publicMaterial(options.publicKey).fingerprint !== material.fingerprint) fail('Archive signer differs from trusted public key');
      if (options.checkpoint !== undefined && (!HEX.test(options.checkpoint) || options.checkpoint !== report.checkpoint)) fail('Trusted manifest checkpoint mismatch');
      return true;
    });
    report.anchored = anchored;
    const decision = parseCanonical(files['decision.json'], 'decision.json');
    const policy = check('policy', 'Policy version', () => {
      const value = parseCanonical(files['policy.json'], 'policy.json');
      if (!object(decision.policy) || !object(value) || !equal(decision.policy, {id: value.id, version: value.version, sha256: hash(files['policy.json'])}))
        fail('Decision policy version or digest mismatch');
      return value;
    });
    const workflow = check('workflow', 'Workflow version', () => {
      if (!object(decision.workflow)) fail('Workflow binding missing');
      let bpmn;
      try { bpmn = decoder.decode(files['workflow.bpmn']); } catch { fail('Invalid BPMN UTF-8'); }
      const binding = workflowBinding({...decision.workflow, bpmn});
      if (!equal(binding, decision.workflow)) fail('Decision workflow digest mismatch');
      return binding;
    });
    const lineage = check('lineage', 'Data lineage', () => {
      const value = parseCanonical(files['data-lineage.json'], 'data-lineage.json');
      if (!equal(decision.inputs, sourceBindings(value))) fail('Input digest or lineage mismatch');
      return value;
    });
    const events = check('events', 'Event hash chain', () => {
      const rows = parseEvents(files['events.jsonl']);
      const chain = eventChain(rows);
      const proof = parseCanonical(files['proof.json'], 'proof.json');
      if (!object(proof) || proof.schema !== SCHEMA || proof.algorithm !== 'SHA-256' || proof.workspace !== manifest.workspace ||
          proof.decisionId !== manifest.decisionId || !equal(proof.eventChain, chain) || !object(proof.artifacts) ||
          !equal(proof.artifacts, Object.fromEntries(SOURCE_FILES.map(name => [name, hash(files[name])])))) fail('Proof does not match artifacts or event chain');
      const selected = rows.find(row => row.seq === decision.eventSequence);
      if (!selected || !equal(proof.selectedEvent, {sequence: selected.seq, hash: selected.hash})) fail('Selected decision event mismatch');
      report.eventCount = rows.length;
      report.eventSequence = selected.seq;
      report.chainHead = chain.head;
      return rows;
    });
    check('context', 'Identity, authorization and state transition', () => {
      if (decision.id !== manifest.decisionId || decision.workspace !== manifest.workspace) fail('Manifest decision context mismatch');
      validateContext(decision, policy, lineage, workflow, events);
    });
    report.valid = true;
    report.simulated = decision.simulated === true || lineage.simulated === true;
  } catch (error) {
    report.reason = error.message;
    // Schema errors outside a named check remain explicit in the report.
    if (!checks.some(item => item.status === 'INVALID')) checks.push({id: 'schema', label: 'Evidence schema', status: 'INVALID', detail: error.message});
  }
  return report;
}
