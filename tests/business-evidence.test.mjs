/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Trust-anchor, archive safety and business-context evidence regressions.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, generateKeyPairSync, sign} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import {mkdtemp, mkdir, copyFile, readFile, writeFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createEvidenceArchive, verifyEvidenceArchive, readEvidenceArchive, encodeEvidenceArchive,
  serializeEvidenceEvents, canonicalEvidenceJSON, EVIDENCE_LIMITS} from '../lib/business-evidence.mjs';
import {evidenceCommand, syntheticEvidenceSnapshot} from '../tools/evidence-cli.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const {privateKey, publicKey} = generateKeyPairSync('ed25519');
const trustedPem = publicKey.export({type: 'spki', format: 'pem'}).toString();
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => Buffer.from(canonicalEvidenceJSON(value) + '\n');
const capture = (snapshot = syntheticEvidenceSnapshot()) => createEvidenceArchive(snapshot, {privateKey});
const valid = archive => verifyEvidenceArchive(archive, {publicKey});
const nativeBpmn = await readFile(new URL('../selfhost/flowable/review.bpmn20.xml', import.meta.url), 'utf8');
function nativeSnapshot(outcome = 'accepted', earlyRejection = false) {
  const snapshot = syntheticEvidenceSnapshot();
  const d = snapshot.decision, instanceId = 'synthetic-native-instance';
  d.type = 'quality.project';
  d.authorization.permission = d.type;
  d.transition = {entityType: 'incident', entityId: 'RC-2026-001', before: 'pending', after: outcome === 'accepted' ? 'approved' : 'review-rejected'};
  d.review = {engine: 'Flowable', ticket: 'synthetic-ticket', reporter: 'synthetic-reporter', instance: instanceId, outcome};
  const reviewPolicy = {id: 'dxtrace.native-review', version: 2, creatorMayApprove: false,
    roles: {quality: ['owner', 'manager'], inventory: ['owner', 'manager', 'warehouse'], approval: ['owner', 'manager']}};
  snapshot.policy = {id: 'synthetic-native-policy', version: '1.0.0', action: d.type, allowedRoles: ['owner', 'manager', 'warehouse'],
    workflowId: 'dxtrace_native_review_v1', transitions: [{from: 'pending', to: d.transition.after}], review: reviewPolicy,
    conditions: {instanceId, outcome}};
  snapshot.workflow = {id: 'dxtrace_native_review_v1', version: '1', bpmn: nativeBpmn, instanceId, engine: 'Flowable OSS', provenance: 'synthetic captured engine fixture'};
  const steps = earlyRejection ? ['quality', 'inventory'] : ['quality', 'inventory', 'approval'];
  const intents = steps.map(step => ({taskId: 'task-' + step, step, subject: 'reviewer-' + step,
    actor: hash(d.workspace + '\nreviewer-' + step), actorLabel: step + '@example.invalid', role: 'manager',
    approved: outcome === 'accepted' || (earlyRejection ? step !== 'quality' : step !== 'approval'), reason: 'Synthetic review ' + step,
    status: 'completed', recordedAt: '2026-01-01T00:00:01.000Z', completedAt: '2026-01-01T00:00:02.000Z'}));
  const creator = hash(d.workspace + '\n' + d.review.reporter);
  const history = {engine: 'Flowable OSS', instanceId, businessKey: hash(JSON.stringify(['quality-recall', d.workspace, d.transition.entityId])), creator,
    definition: {id: 'native:1:synthetic', key: snapshot.workflow.id, version: 1, deploymentId: 'synthetic-deployment'}, bpmn: nativeBpmn,
    history: {id: instanceId, startTime: '2026-01-01T00:00:00.000Z', endTime: d.occurredAt, endActivityId: outcome},
    tasks: intents.map(intent => ({id: intent.taskId, step: intent.step, assignee: intent.actor, startTime: intent.recordedAt, endTime: intent.completedAt})),
    variables: [{name: 'creator', value: creator, taskId: null}, ...intents.flatMap(intent => [
      {name: intent.step + 'Approved', value: intent.approved, taskId: null},
      {name: intent.step + 'Reviewer', value: intent.actor, taskId: null},
      {name: intent.step + 'Reason', value: intent.reason, taskId: null}
    ])], decisions: intents, policy: reviewPolicy};
  snapshot.lineage.sources.push({id: 'flowable-history', kind: 'workflow-engine-history', origin: 'synthetic://flowable', data: history},
    {id: 'reviewer-decisions', kind: 'authorized-review-intents', origin: 'synthetic://review-intents', data: intents});
  snapshot.events[1].payload = JSON.stringify({action: d.type, actor: d.identity.auditActor, entity: d.eventEntity, created: d.occurredAt});
  snapshot.events[1].hash = hash(snapshot.events[1].previous + '\n2\n' + snapshot.events[1].payload);
  return snapshot;
}

// Re-sign altered bytes with the test key to exercise checks beyond manifest hashing.
function signedMutation(result, mutate) {
  const files = readEvidenceArchive(result.archive);
  mutate(files);
  const proof = JSON.parse(files['proof.json']);
  proof.artifacts = Object.fromEntries(Object.keys(proof.artifacts).map(name => [name, hash(files[name])]));
  files['proof.json'] = json(proof);
  const manifest = JSON.parse(files['manifest.json']);
  manifest.files = Object.fromEntries(Object.keys(manifest.files).map(name => [name, {sha256: hash(files[name]), bytes: files[name].length}]));
  files['manifest.json'] = json(manifest);
  files['signature.sig'] = sign(null, Buffer.concat([Buffer.from('DX-TRACE Business Decision Proof v1\n'), files['manifest.json']]), privateKey);
  return encodeEvidenceArchive(files);
}
function tarMutation(archive, mutate) {
  const tar = gunzipSync(archive);
  mutate(tar);
  return gzipSync(tar);
}
function headerChecksum(tar, offset = 0) {
  tar.fill(32, offset + 148, offset + 156);
  const checksum = tar.subarray(offset, offset + 512).reduce((sum, byte) => sum + byte, 0);
  tar.write(checksum.toString(8).padStart(6, '0') + '\0 ', offset + 148, 8, 'ascii');
}

test('evidence verifies independently against a pinned Ed25519 key or exact manifest checkpoint', () => {
  const result = capture();
  assert.equal(result.checkpoint, hash(result.files['manifest.json']));
  assert.equal(result.publicKey, trustedPem);
  assert.deepEqual(Object.keys(readEvidenceArchive(result.archive)).sort(),
    ['manifest.json', 'decision.json', 'events.jsonl', 'policy.json', 'workflow.bpmn', 'data-lineage.json', 'proof.json', 'signature.sig'].sort());
  for (const anchor of [{publicKey}, {publicKey: trustedPem}, {checkpoint: result.checkpoint}, {publicKey, checkpoint: result.checkpoint}]) {
    const report = verifyEvidenceArchive(result.archive, anchor);
    assert.equal(report.valid, true, report.reason);
    assert.equal(report.anchored, true);
    assert.equal(report.decisionId, 'RC-2026-001');
    assert.equal(report.eventCount, 2);
    assert.equal(report.simulated, true);
    assert.ok(report.checks.every(check => check.status === 'VALID'));
  }
  assert.deepEqual(result.archive, capture().archive, 'same bytes and key produce a deterministic archive');
});

test('a valid signature, embedded key, or recomputed chain is never its own trust anchor', () => {
  const result = capture();
  const untrusted = verifyEvidenceArchive(result.archive);
  assert.equal(untrusted.valid, false);
  assert.match(untrusted.reason, /UNTRUSTED/);
  const attacker = generateKeyPairSync('ed25519');
  const rewrite = syntheticEvidenceSnapshot();
  rewrite.lineage.sources[0].data.result = 'attacker-rewritten-result';
  const rewritten = createEvidenceArchive(rewrite, {privateKey: attacker.privateKey});
  assert.equal(verifyEvidenceArchive(rewritten.archive).valid, false);
  assert.equal(valid(rewritten.archive).valid, false);
  assert.equal(verifyEvidenceArchive(rewritten.archive, {checkpoint: result.checkpoint}).valid, false);
  assert.equal(verifyEvidenceArchive(result.archive, {publicKey: attacker.publicKey, checkpoint: result.checkpoint}).valid, false);
  assert.equal(verifyEvidenceArchive(result.archive, {publicKey, checkpoint: '0'.repeat(64)}).valid, false);
  assert.equal(verifyEvidenceArchive(result.archive, {checkpoint: result.checkpoint.toUpperCase()}).valid, false);
});

test('every artifact and the detached signature are covered, including removal or truncation', () => {
  const result = capture();
  for (const name of Object.keys(result.files)) {
    const files = readEvidenceArchive(result.archive);
    files[name][0] ^= 1;
    assert.equal(valid(encodeEvidenceArchive(files)).valid, false, name);
  }
  for (const size of [0, 2, Math.floor(result.archive.length / 2), result.archive.length - 8])
    assert.equal(valid(result.archive.subarray(0, size)).valid, false);
  const incomplete = {...result.files};
  delete incomplete['proof.json'];
  assert.throws(() => encodeEvidenceArchive(incomplete), /file set/);
});

test('offline verifier checks policy, workflow and lineage bindings after cryptographic checks pass', () => {
  const result = capture();
  for (const [name, mutate] of [
    ['policy version', files => {const d = JSON.parse(files['decision.json']); d.policy.version = 'different'; files['decision.json'] = json(d);}],
    ['workflow version digest', files => {const d = JSON.parse(files['decision.json']); d.workflow.sha256 = '0'.repeat(64); files['decision.json'] = json(d);}],
    ['workflow process id', files => {const d = JSON.parse(files['decision.json']); d.workflow.id = 'other'; files['decision.json'] = json(d);}],
    ['lineage reference', files => {const d = JSON.parse(files['decision.json']); d.inputs[0].sha256 = '0'.repeat(64); files['decision.json'] = json(d);}],
    ['source content', files => {const d = JSON.parse(files['data-lineage.json']); d.sources[0].data.result = 'changed'; files['data-lineage.json'] = json(d);}]
  ]) {
    const report = valid(signedMutation(result, mutate));
    assert.equal(report.valid, false, name);
    assert.ok(report.checks.some(check => check.id === 'signature' && check.status === 'VALID'), name);
  }
});

test('identity, tenant, authorization, transition and selected event must agree', () => {
  const result = capture();
  for (const change of [
    d => d.identity.role = 'viewer',
    d => d.identity.auditActor = 'different-actor',
    d => d.identity.subject = 'different-subject',
    d => d.authorization.allowed = false,
    d => d.authorization.permission = 'different-action',
    d => d.authorization.workspace = 'another-tenant',
    d => d.workspace = 'another-tenant',
    d => d.transition.after = 'available',
    d => d.eventEntity = 'another-incident',
    d => d.occurredAt = '2026-01-01T00:00:03.000Z'
  ]) {
    const report = valid(signedMutation(result, files => {
      const decision = JSON.parse(files['decision.json']); change(decision); files['decision.json'] = json(decision);
    }));
    assert.equal(report.valid, false, String(change));
  }
});

test('event proof rejects reordered, incomplete and recomputed inconsistent history', () => {
  const result = capture();
  const original = syntheticEvidenceSnapshot().events;
  for (const alter of [
    rows => rows.reverse(),
    rows => rows.shift(),
    rows => rows.pop(),
    rows => rows[1].payload = '{}',
    rows => rows[1].seq = rows[0].seq,
    rows => rows[0].previous = 'f'.repeat(64)
  ]) {
    const report = valid(signedMutation(result, files => {
      const rows = structuredClone(original); alter(rows); files['events.jsonl'] = serializeEvidenceEvents(rows);
    }));
    assert.equal(report.valid, false, String(alter));
  }
  const rowsWithSqlColumns = original.map(row => ({created: 'ignored-SQL-column', workspace: 'synthetic-demo', ...row}));
  assert.deepEqual(serializeEvidenceEvents(rowsWithSqlColumns), result.files['events.jsonl']);
});

test('capture rejects unauthorized or mismatched context before producing a signature', () => {
  for (const mutate of [
    snapshot => snapshot.decision.identity.role = 'viewer',
    snapshot => snapshot.policy.action = 'different-action',
    snapshot => snapshot.workflow.bpmn = snapshot.workflow.bpmn.replace('id="synthetic_recall"', 'id="other"'),
    snapshot => snapshot.lineage.sources.push(snapshot.lineage.sources[0]),
    snapshot => snapshot.lineage.sources[0].sha256 = '0'.repeat(64),
    snapshot => snapshot.decision.transition.after = snapshot.decision.transition.before,
    snapshot => snapshot.events[0].workspace = 'other-tenant',
    snapshot => snapshot.decision.policy = {id: 'forged'}
  ]) {
    const snapshot = syntheticEvidenceSnapshot(); mutate(snapshot);
    assert.throws(() => capture(snapshot), undefined, String(mutate));
  }
});

test('native Flowable proof checks actual history and role-authorized decisions for all terminal paths', () => {
  for (const snapshot of [nativeSnapshot(), nativeSnapshot('rejected'), nativeSnapshot('rejected', true)]) {
    const result = capture(snapshot), report = valid(result.archive);
    assert.equal(report.valid, true, report.reason);
  }
});

test('native review context rejects coherently re-signed but unjustified workflow assertions', () => {
  const result = capture(nativeSnapshot());
  for (const mutate of [
    h => h.history.endTime = null,
    h => h.history.endActivityId = 'rejected',
    h => h.instanceId = 'other-instance',
    h => h.definition.version = 2,
    h => h.definition.key = 'other-workflow',
    h => h.businessKey = '0'.repeat(64),
    h => h.tasks[0].endTime = null,
    h => h.tasks[0].assignee = 'other-reviewer',
    h => h.decisions[0].role = 'viewer',
    h => h.decisions[0].status = 'pending',
    h => h.decisions[0].taskId = 'invented-task',
    h => h.decisions[0].subject = 'other-identity',
    h => h.decisions.pop(),
    h => h.variables.find(variable => variable.name === 'qualityApproved').value = false,
    h => h.variables.find(variable => variable.name === 'approvalReviewer').taskId = 'local-variable',
    h => h.variables.push({...h.variables[0]}),
    h => {h.decisions[0].subject = 'synthetic-reporter'; h.decisions[0].actor = h.creator; h.tasks[0].assignee = h.creator;
      h.variables.find(variable => variable.name === 'qualityReviewer').value = h.creator;},
    h => {h.decisions[2].approved = false; h.variables.find(variable => variable.name === 'approvalApproved').value = false;}
  ]) {
    const archive = signedMutation(result, files => {
      const decision = JSON.parse(files['decision.json']), lineage = JSON.parse(files['data-lineage.json']);
      const history = lineage.sources.find(source => source.id === 'flowable-history').data;
      mutate(history);
      lineage.sources.find(source => source.id === 'reviewer-decisions').data = history.decisions;
      decision.inputs = lineage.sources.map(source => ({id: source.id, sha256: hash(json(source.data))}));
      files['data-lineage.json'] = json(lineage);
      files['decision.json'] = json(decision);
    });
    const report = valid(archive);
    assert.equal(report.valid, false, String(mutate));
    assert.ok(report.checks.some(check => check.id === 'signature' && check.status === 'VALID'), String(mutate));
    assert.ok(report.checks.some(check => check.id === 'context' && check.status === 'INVALID'), String(mutate) + ': ' + report.reason);
  }
});

test('archive reader rejects traversal, links, extensions, duplicates and oversized headers without extracting', () => {
  const result = capture();
  const attacks = [
    tar => {tar.fill(0, 0, 100); tar.write('../manifest.json', 0);},
    tar => {tar.fill(0, 0, 100); tar.write('/manifest.json', 0);},
    tar => {tar[156] = 50; tar.write('/etc/passwd', 157);},
    tar => {tar[156] = 49;},
    tar => {tar[156] = 120;},
    tar => {tar.write('prefix', 345);},
    tar => {tar.write((EVIDENCE_LIMITS.fileBytes + 1).toString(8).padStart(11, '0') + '\0', 124, 12);}
  ];
  for (const attack of attacks) {
    const archive = tarMutation(result.archive, tar => {attack(tar); headerChecksum(tar);});
    assert.equal(valid(archive).valid, false, String(attack));
  }
  const duplicate = tarMutation(result.archive, tar => {
    const size = Number.parseInt(tar.subarray(124, 136).toString(), 8);
    const second = 512 + Math.ceil(size / 512) * 512;
    tar.fill(0, second, second + 100); tar.write('manifest.json', second); headerChecksum(tar, second);
  });
  assert.equal(valid(duplicate).valid, false);
  const missingTerminator = gzipSync(gunzipSync(result.archive).subarray(0, -1024));
  assert.equal(valid(missingTerminator).valid, false);
  const bomb = gzipSync(Buffer.alloc(EVIDENCE_LIMITS.expandedBytes + 512));
  assert.equal(valid(bomb).valid, false);
});

test('canonical JSON rejects ambiguous duplicate keys and incompatible signature profiles', () => {
  const result = capture();
  const files = readEvidenceArchive(result.archive);
  const text = files['manifest.json'].toString();
  files['manifest.json'] = Buffer.from(text.replace('{', '{"workspace":"ignored",'));
  assert.equal(valid(encodeEvidenceArchive(files)).valid, false);
  const fake = readEvidenceArchive(result.archive);
  const manifest = JSON.parse(fake['manifest.json']);
  manifest.signature.algorithm = 'none';
  fake['manifest.json'] = json(manifest);
  assert.equal(valid(encodeEvidenceArchive(fake)).valid, false);
  assert.throws(() => canonicalEvidenceJSON({bad: NaN}), /Non-finite/);
  assert.throws(() => canonicalEvidenceJSON({bad: undefined}), /Invalid/);
});

test('CLI verifies a portable copy offline without installed npm dependencies and signals failures', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dx-evidence-cli-'));
  try {
    await mkdir(path.join(directory, 'tools'));
    await mkdir(path.join(directory, 'lib'));
    for (const file of ['tools/dxtrace.mjs', 'tools/evidence-cli.mjs', 'lib/business-evidence.mjs', 'lib/evidence-archive.mjs'])
      await copyFile(path.join(root, file), path.join(directory, file));
    const result = capture();
    await writeFile(path.join(directory, 'recall.tar.gz'), result.archive);
    await writeFile(path.join(directory, 'trusted.pem'), trustedPem);
    const run = (...args) => spawnSync(process.execPath, ['tools/dxtrace.mjs', 'evidence', ...args], {
      cwd: directory, encoding: 'utf8', timeout: 5000, env: {...process.env, NODE_PATH: '', DXTRACE_URL: 'https://unreachable.invalid'}
    });
    const verified = run('verify', 'recall.tar.gz', '--public-key', 'trusted.pem');
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).valid, true);
    const checkpoint = run('verify', 'recall.tar.gz', '--checkpoint', result.checkpoint);
    assert.equal(checkpoint.status, 0, checkpoint.stderr);
    const untrusted = run('verify', 'recall.tar.gz');
    assert.equal(untrusted.status, 1);
    assert.match(JSON.parse(untrusted.stdout).reason, /UNTRUSTED/);
    const files = readEvidenceArchive(result.archive);
    files['signature.sig'][0] ^= 1;
    await writeFile(path.join(directory, 'modified.tar.gz'), encodeEvidenceArchive(files));
    assert.equal(run('verify', 'modified.tar.gz', '--public-key', 'trusted.pem').status, 1);
    assert.equal(run('verify', 'recall.tar.gz', '--unknown', 'x').status, 1);
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('demo is explicitly synthetic, tampering is detected, and keygen never replaces existing trust material', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'dx-evidence-demo-'));
  try {
    const generated = await evidenceCommand(['demo', '--out', path.join(directory, 'demo')]);
    assert.equal(generated.simulated, true);
    assert.equal(generated.verification.valid, true);
    const trusted = await readFile(generated.publicKeyFile);
    assert.equal(verifyEvidenceArchive(await readFile(generated.archiveFile), {publicKey: trusted}).valid, true);
    assert.equal(verifyEvidenceArchive(await readFile(generated.tamperedFile), {publicKey: trusted}).valid, false);
    const keys = await evidenceCommand(['keygen', '--out', path.join(directory, 'keys')]);
    assert.equal((await stat(keys.privateKeyFile)).mode & 0o777, 0o600);
    const original = await readFile(keys.privateKeyFile);
    await assert.rejects(evidenceCommand(['keygen', '--out', path.join(directory, 'keys')]), /EEXIST/);
    assert.deepEqual(await readFile(keys.privateKeyFile), original);
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('export sends authenticated workspace scope, downloads exact captured bytes and refuses overwrites', async () => {
  const result = capture();
  const requests = [];
  const server = createServer((req, res) => {
    requests.push({url: req.url, cookie: req.headers.cookie});
    res.writeHead(200, {'content-type': 'application/gzip'}); res.end(result.archive);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const directory = await mkdtemp(path.join(tmpdir(), 'dx-evidence-export-'));
  const saved = Object.fromEntries(['DXTRACE_URL', 'DXTRACE_COOKIE', 'DXTRACE_AREA'].map(key => [key, process.env[key]]));
  try {
    process.env.DXTRACE_URL = 'http://127.0.0.1:' + server.address().port;
    process.env.DXTRACE_COOKIE = 'synthetic-session=test';
    process.env.DXTRACE_AREA = 'training';
    const target = path.join(directory, 'download.tar.gz');
    const exported = await evidenceCommand(['export', '--id', 'RC-2026-001', '--out', target]);
    assert.equal(exported.verified, false);
    assert.deepEqual(await readFile(target), result.archive);
    assert.deepEqual(requests[0], {url: '/api/evidence/RC-2026-001/export?area=training', cookie: 'synthetic-session=test'});
    await assert.rejects(evidenceCommand(['export', '--id', 'RC-2026-001', '--out', target]), /EEXIST/);
    process.env.DXTRACE_URL = 'http://remote.invalid';
    await assert.rejects(evidenceCommand(['export', '--id', 'RC-2026-001', '--out', target]), /HTTPS origin/);
  } finally {
    for (const [key, value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await rm(directory, {recursive: true, force: true});
  }
});
