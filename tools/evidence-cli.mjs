/* DX-TRACE | Offline Evidence Engine command line interface.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {generateKeyPairSync, createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {EVIDENCE_LIMITS, createEvidenceArchive, verifyEvidenceArchive, readEvidenceArchive,
  encodeEvidenceArchive, canonicalEvidenceJSON} from '../lib/business-evidence.mjs';

const usage = `dxtrace evidence export --id <decision-id> [--out <file.tar.gz>]
dxtrace evidence verify <file.tar.gz> --public-key <trusted-public.pem> [--checkpoint <manifest-sha256>]
dxtrace evidence verify <file.tar.gz> --checkpoint <manifest-sha256>
dxtrace evidence keygen --out <new-directory>
dxtrace evidence demo --out <new-directory>`;
const fail = message => { throw new Error(message); };
function options(args, allowed) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!allowed.includes(flag) || Object.hasOwn(result, flag) || !args[i + 1] || args[i + 1].startsWith('--')) fail(usage);
    result[flag] = args[i + 1];
  }
  return result;
}
async function boundedRead(file, limit) {
  const info = await stat(file);
  if (!info.isFile() || info.size > limit) fail('Input file is not regular or exceeds the size limit');
  const data = await readFile(file);
  if (data.length > limit) fail('Input file exceeds the size limit');
  return data;
}
const publicPem = key => key.export({type: 'spki', format: 'pem'}).toString();
const digest = value => createHash('sha256').update(value).digest('hex');

async function generateKeys(directory) {
  // An exclusive new directory prevents overwriting operator trust material.
  await mkdir(directory, {mode: 0o700});
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  const privatePath = path.join(directory, 'evidence-private.pem');
  const publicPath = path.join(directory, 'evidence-public.pem');
  await writeFile(privatePath, privateKey.export({type: 'pkcs8', format: 'pem'}), {mode: 0o600, flag: 'wx'});
  await writeFile(publicPath, publicPem(publicKey), {mode: 0o644, flag: 'wx'});
  return {privateKeyFile: privatePath, publicKeyFile: publicPath,
    keyFingerprint: digest(publicKey.export({type: 'spki', format: 'der'})),
    instruction: 'Keep the private key on the signing host. Distribute and pin the public key through an independently trusted channel.'};
}

export function syntheticEvidenceSnapshot() {
  const occurredAt = '2026-01-01T00:00:02.000Z';
  let previous = '0'.repeat(64);
  const events = [
    {action: 'quality.failure', actor: 'demo-inspector@example.invalid', entity: 'RC-2026-001', created: '2026-01-01T00:00:01.000Z'},
    {action: 'incident.approve', actor: 'demo-reviewer@example.invalid', entity: 'RC-2026-001', created: occurredAt}
  ].map((event, index) => {
    const seq = index + 1, payload = JSON.stringify(event);
    const hash = digest(previous + '\n' + seq + '\n' + payload);
    const row = {seq, previous, hash, payload};
    previous = hash;
    return row;
  });
  return {
    decision: {id: 'RC-2026-001', workspace: 'synthetic-demo', type: 'incident.approve', occurredAt,
      simulated: true, identity: {subject: 'synthetic-reviewer', role: 'manager', auditActor: 'demo-reviewer@example.invalid', authentication: 'synthetic-fixture'},
      authorization: {allowed: true, permission: 'incident.approve'},
      transition: {entityType: 'lot', entityId: 'DEMO-LOT-001', before: 'quarantined', after: 'recall'},
      eventEntity: 'RC-2026-001', eventSequence: 2},
    events,
    policy: {id: 'synthetic-recall-policy', version: 'demo-1', action: 'incident.approve', allowedRoles: ['owner', 'manager'],
      workflowId: 'synthetic_recall', transitions: [{from: 'quarantined', to: 'recall'}]},
    workflow: {id: 'synthetic_recall', version: 'demo-1', instanceId: 'synthetic-instance', engine: 'synthetic-fixture', provenance: 'simulation',
      bpmn: '<?xml version="1.0" encoding="UTF-8"?>\n<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="urn:dxtrace:synthetic"><process id="synthetic_recall" isExecutable="false"><startEvent id="start"/><userTask id="approve"/><endEvent id="recall"/><sequenceFlow id="a" sourceRef="start" targetRef="approve"/><sequenceFlow id="b" sourceRef="approve" targetRef="recall"/></process></definitions>\n'},
    lineage: {workspace: 'synthetic-demo', simulated: true, sources: [
      {id: 'demo-inspection', kind: 'quality-inspection', origin: 'synthetic://quality-portal', data: {lot: 'DEMO-LOT-001', result: 'failed'}},
      {id: 'demo-temperature', kind: 'temperature-reading', origin: 'synthetic://cold-chain', data: {temperature: 12.4, threshold: 8, unit: 'C'}}
    ]}
  };
}

async function demo(directory) {
  await mkdir(directory, {mode: 0o700});
  const {privateKey, publicKey} = generateKeyPairSync('ed25519');
  const result = createEvidenceArchive(syntheticEvidenceSnapshot(), {privateKey});
  const archiveFile = path.join(directory, 'recall-evidence.tar.gz');
  const tamperedFile = path.join(directory, 'recall-evidence-tampered.tar.gz');
  const publicKeyFile = path.join(directory, 'evidence-public.pem');
  const files = readEvidenceArchive(result.archive);
  const lineage = JSON.parse(files['data-lineage.json']);
  lineage.sources[0].data.result = 'passed';
  files['data-lineage.json'] = Buffer.from(canonicalEvidenceJSON(lineage) + '\n');
  await writeFile(archiveFile, result.archive, {flag: 'wx', mode: 0o600});
  await writeFile(tamperedFile, encodeEvidenceArchive(files), {flag: 'wx', mode: 0o600});
  await writeFile(publicKeyFile, publicPem(publicKey), {flag: 'wx', mode: 0o644});
  await writeFile(path.join(directory, 'manifest-checkpoint.txt'), result.checkpoint + '\n', {flag: 'wx', mode: 0o644});
  return {simulated: true, notice: 'Synthetic data and ephemeral signing key; this is a cryptographic demonstration, not a production system test.',
    archiveFile, tamperedFile, publicKeyFile, checkpoint: result.checkpoint,
    verification: verifyEvidenceArchive(result.archive, {publicKey})};
}

async function exportDecision(id, target) {
  if (!id || id.length > 300 || /[\x00-\x1f\x7f]/.test(id)) fail('Invalid decision id');
  const origin = new URL(process.env.DXTRACE_URL || 'http://127.0.0.1:8080');
  if (origin.username || origin.password || origin.origin + '/' !== origin.href ||
      (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))))
    fail('DXTRACE_URL must be an HTTPS origin or loopback HTTP origin');
  const area = process.env.DXTRACE_AREA;
  if (area && !['training', 'live'].includes(area)) fail('Invalid DXTRACE_AREA');
  const url = new URL('/api/evidence/' + encodeURIComponent(id) + '/export', origin);
  if (area === 'training') url.searchParams.set('area', 'training');
  const headers = {accept: 'application/gzip'};
  if (process.env.DXTRACE_COOKIE) headers.cookie = process.env.DXTRACE_COOKIE;
  const response = await fetch(url, {headers, redirect: 'manual', signal: AbortSignal.timeout(30000)});
  if (!response.ok) fail('Evidence export failed (HTTP ' + response.status + '); check authentication, workspace, decision id and capture-time signing configuration');
  if (!/^application\/(gzip|x-gzip|octet-stream)(;|$)/i.test(response.headers.get('content-type') || '')) fail('Expected an authenticated evidence archive response');
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > EVIDENCE_LIMITS.archiveBytes) fail('Evidence response exceeds archive size limit');
  const reader = response.body?.getReader();
  if (!reader) fail('Empty evidence response');
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > EVIDENCE_LIMITS.archiveBytes) fail('Evidence response exceeds archive size limit');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const archive = Buffer.concat(chunks);
  const files = readEvidenceArchive(archive);
  const manifest = JSON.parse(files['manifest.json'].toString('utf8'));
  if (manifest.decisionId !== id) fail('Exported decision id does not match request');
  const output = target || id.replace(/[^A-Za-z0-9._-]/g, '_') + '-evidence.tar.gz';
  await writeFile(output, archive, {flag: 'wx', mode: 0o600});
  return {file: output, decisionId: id, bytes: archive.length, checkpoint: digest(files['manifest.json']),
    verified: false, instruction: 'Verify offline with an independently trusted public key or previously retained manifest checkpoint. The downloaded checkpoint alone is not a trust anchor.'};
}

export async function evidenceCommand([action, ...args]) {
  if (action === 'verify') {
    const [file, ...flags] = args;
    if (!file || file.startsWith('--')) fail(usage);
    const opts = options(flags, ['--public-key', '--checkpoint']);
    const archive = await boundedRead(file, EVIDENCE_LIMITS.archiveBytes);
    const publicKey = opts['--public-key'] ? await boundedRead(opts['--public-key'], 16384) : undefined;
    return verifyEvidenceArchive(archive, {publicKey, checkpoint: opts['--checkpoint']});
  }
  if (action === 'export') {
    const opts = options(args, ['--id', '--out']);
    if (!opts['--id']) fail(usage);
    return exportDecision(opts['--id'], opts['--out']);
  }
  if (['keygen', 'demo'].includes(action)) {
    const opts = options(args, ['--out']);
    if (!opts['--out']) fail(usage);
    return action === 'keygen' ? generateKeys(opts['--out']) : demo(opts['--out']);
  }
  fail(usage);
}

// Direct entry is also dependency-free: node tools/evidence-cli.mjs verify ...
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await evidenceCommand(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
    if (result.valid === false) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
