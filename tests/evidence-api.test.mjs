/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Capture-time signatures, atomic persistence and tenant isolation.
 * SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, randomUUID} from 'node:crypto';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyEvidenceArchive, readEvidenceArchive} from '../lib/business-evidence.mjs';

test('Evidence API captures signed decisions atomically and keeps offline trust independent', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'dx-evidence-api-'));
  const saved = {DATA_DIR: process.env.DATA_DIR, DX_EVIDENCE_PRIVATE_KEY_FILE: process.env.DX_EVIDENCE_PRIVATE_KEY_FILE};
  process.env.DATA_DIR = directory;
  const firstKey = generateKeyPairSync('ed25519'), secondKey = generateKeyPairSync('ed25519');
  const firstPath = join(directory, 'capture-first.pem'), secondPath = join(directory, 'capture-second.pem');
  await writeFile(firstPath, firstKey.privateKey.export({type: 'pkcs8', format: 'pem'}), {mode: 0o600});
  await writeFile(secondPath, secondKey.privateKey.export({type: 'pkcs8', format: 'pem'}), {mode: 0o600});
  process.env.DX_EVIDENCE_PRIVATE_KEY_FILE = firstPath;
  try {
    const {identity} = await import('../selfhost/runtime.mjs');
    const {GET, POST} = await import('../app/api/[...path]/route.ts');
    const {q} = await import('../lib/server.ts');
    function call(route, body, who = 'evidence-owner', key = randomUUID()) {
      const request = new Request('http://localhost/api/' + route, {method: body === undefined ? 'GET' : 'POST',
        headers: {'idempotency-key': key, ...(body === undefined ? {} : {'content-type': 'application/json'})},
        body: body === undefined ? undefined : JSON.stringify(body)});
      return identity.run(who === null ? null : {userId: who, email: who + '@example.test', displayName: who}, () => (body === undefined ? GET : POST)(request));
    }
    async function json(route, body, who, status = 200, key) {
      const response = await call(route, body, who, key);
      const data = await response.json();
      assert.equal(response.status, status, JSON.stringify(data));
      return data;
    }
    async function archive(id, who = 'evidence-owner', area = '') {
      const response = await call('evidence/' + id + '/export' + area, undefined, who);
      assert.equal(response.status, 200, response.status === 200 ? '' : await response.text());
      assert.equal(response.headers.get('content-type'), 'application/gzip');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      return Buffer.from(await response.arrayBuffer());
    }
    async function createLot(who, suffix = randomUUID()) {
      const supplier = await json('partners', {name: 'Synthetic evidence supplier', kind: 'supplier'}, who);
      return json('lots', {code: 'EV-' + suffix, product: 'Synthetic milk', supplier: supplier.id, quantity: 10,
        unit: 'box', expiry: '2099-12-31', location: 'TEST', min_temp: 2, max_temp: 8}, who);
    }
    const workspaceOf = async who => (await q('SELECT workspace FROM members WHERE id=?', who).first()).workspace;
    const counts = async workspace => {
      const result = {};
      for (const table of ['audit_ledger', 'evidence_decisions', 'event_outbox', 'warehouse_commands'])
        result[table] = (await q('SELECT COUNT(*) AS total FROM ' + table + ' WHERE workspace=?', workspace).first()).total;
      return result;
    };

    await t.test('real authorized incident decisions export a verifiable exact capture-time snapshot', async () => {
      const lot = await createLot('evidence-owner', 'first');
      const incident = await json('incidents', {lot: lot.id, reason: 'Synthetic failed inspection', severity: 'high'});
      const listing = await json('evidence');
      assert.equal(listing.decisions.length, 1);
      assert.equal(listing.decisions[0].signingStatus, 'signed');
      assert.equal(listing.signing.configured, true);
      const id = listing.decisions[0].id, bytes = await archive(id);
      const report = verifyEvidenceArchive(bytes, {publicKey: firstKey.publicKey});
      assert.equal(report.valid, true, report.reason);
      const files = readEvidenceArchive(bytes), decision = JSON.parse(files['decision.json']);
      const lineage = JSON.parse(files['data-lineage.json']);
      assert.equal(decision.identity.subject, 'evidence-owner');
      assert.equal(decision.identity.role, 'owner');
      assert.equal(decision.identity.auditActor, 'evidence-owner@example.test');
      assert.equal(decision.transition.entityId, incident.id);
      assert.equal(decision.transition.before, 'absent');
      assert.equal(decision.transition.after, 'pending');
      assert.equal(lineage.sources.find(source => source.id === 'lot-before').data.status, 'active');
      assert.match(decision.workflow.provenance, /not execution by a BPMN engine/);
      assert.equal(verifyEvidenceArchive(bytes).valid, false, 'a downloaded key cannot create trust');
      await json('incidents/' + incident.id + '/approve', {});
      assert.deepEqual(await archive(id), bytes, 'subsequent state changes never rewrite or re-sign the prior evidence');
      const after = await json('evidence');
      assert.equal(after.decisions.length, 2);
      assert.equal(after.decisions[0].kind, 'incident.approve');
      const approved = verifyEvidenceArchive(await archive(after.decisions[0].id), {publicKey: firstKey.publicKey});
      assert.equal(approved.valid, true, approved.reason);
    });

    await t.test('simultaneous approvers commit one transition, audit event and signed evidence', async () => {
      await json('members', {email: 'evidence-manager@example.test', role: 'manager'});
      const lot = await createLot('evidence-owner', 'concurrent');
      const incident = await json('incidents', {lot: lot.id, reason: 'Concurrent review test', severity: 'high'});
      const workspace = await workspaceOf('evidence-owner'), before = await counts(workspace);
      const replies = await Promise.all([
        call('incidents/' + incident.id + '/approve', {}, 'evidence-owner'),
        call('incidents/' + incident.id + '/approve', {}, 'evidence-manager')
      ]);
      assert.deepEqual(replies.map(reply => reply.status).sort(), [200, 409]);
      const after = await counts(workspace);
      for (const table of Object.keys(before)) assert.equal(after[table], before[table] + 1, table);
      const state = await json('state');
      assert.equal(state.incidents.find(item => item.id === incident.id).status, 'approved');
      const listing = await json('evidence');
      const report = verifyEvidenceArchive(await archive(listing.decisions[0].id), {publicKey: firstKey.publicKey});
      assert.equal(report.valid, true, report.reason);
    });

    await t.test('durable idempotency does not permit a different actor to replay the original result', async () => {
      const lot = await createLot('evidence-owner', 'idempotent');
      const body = {lot: lot.id, reason: 'Idempotency test', severity: 'high'}, key = randomUUID();
      const first = await json('incidents', body, 'evidence-owner', 200, key);
      const workspace = await workspaceOf('evidence-owner'), before = await counts(workspace);
      assert.deepEqual(await json('incidents', body, 'evidence-owner', 200, key), first);
      await json('incidents', body, 'evidence-manager', 409, key);
      await json('incidents', {...body, reason: 'Changed request'}, 'evidence-owner', 409, key);
      assert.deepEqual(await counts(workspace), before);
    });

    await t.test('unsigned decisions remain unsigned after key configuration and cannot be retroactively exported', async () => {
      delete process.env.DX_EVIDENCE_PRIVATE_KEY_FILE;
      const lot = await createLot('unsigned-owner');
      await json('incidents', {lot: lot.id, reason: 'Unsigned capture', severity: 'high'}, 'unsigned-owner');
      const listing = await json('evidence', undefined, 'unsigned-owner');
      assert.equal(listing.signing.configured, false);
      assert.equal(listing.decisions[0].signingStatus, 'unsigned');
      await json('evidence/' + listing.decisions[0].id + '/export', undefined, 'unsigned-owner', 409);
      process.env.DX_EVIDENCE_PRIVATE_KEY_FILE = firstPath;
      await json('evidence/' + listing.decisions[0].id + '/export', undefined, 'unsigned-owner', 409);
      assert.equal((await json('evidence', undefined, 'unsigned-owner')).decisions[0].signingStatus, 'unsigned');
    });

    await t.test('key rotation preserves historical signature bytes and the original independently pinned key', async () => {
      const lot = await createLot('rotation-owner');
      const incident = await json('incidents', {lot: lot.id, reason: 'Rotation capture', severity: 'high'}, 'rotation-owner');
      const firstId = (await json('evidence', undefined, 'rotation-owner')).decisions[0].id;
      const original = await archive(firstId, 'rotation-owner');
      process.env.DX_EVIDENCE_PRIVATE_KEY_FILE = secondPath;
      await json('incidents/' + incident.id + '/approve', {}, 'rotation-owner');
      const secondId = (await json('evidence', undefined, 'rotation-owner')).decisions[0].id;
      const rotated = await archive(secondId, 'rotation-owner');
      assert.deepEqual(await archive(firstId, 'rotation-owner'), original);
      assert.equal(verifyEvidenceArchive(original, {publicKey: firstKey.publicKey}).valid, true);
      assert.equal(verifyEvidenceArchive(original, {publicKey: secondKey.publicKey}).valid, false);
      assert.equal(verifyEvidenceArchive(rotated, {publicKey: secondKey.publicKey}).valid, true);
      assert.equal(verifyEvidenceArchive(rotated, {publicKey: firstKey.publicKey}).valid, false);
      process.env.DX_EVIDENCE_PRIVATE_KEY_FILE = firstPath;
    });

    await t.test('invalid configured signing key fails the whole decision before any transaction is committed', async () => {
      const lot = await createLot('invalid-key-owner');
      const workspace = await workspaceOf('invalid-key-owner');
      const beforeCounts = await counts(workspace);
      const beforeState = await q('SELECT state,revision FROM workspaces WHERE id=?', workspace).first();
      const invalidPath = join(directory, 'invalid-key.pem');
      await writeFile(invalidPath, 'not-a-private-key');
      process.env.DX_EVIDENCE_PRIVATE_KEY_FILE = invalidPath;
      const body = {lot: lot.id, reason: 'Atomic rollback test', severity: 'high'}, key = randomUUID();
      await json('incidents', body, 'invalid-key-owner', 503, key);
      assert.deepEqual(await counts(workspace), beforeCounts);
      assert.deepEqual(await q('SELECT state,revision FROM workspaces WHERE id=?', workspace).first(), beforeState);
      process.env.DX_EVIDENCE_PRIVATE_KEY_FILE = firstPath;
      await json('incidents', body, 'invalid-key-owner', 200, key);
      const afterCounts = await counts(workspace);
      for (const table of Object.keys(beforeCounts)) assert.equal(afterCounts[table], beforeCounts[table] + 1, table);
    });

    await t.test('anonymous, warehouse-role and cross-tenant reads cannot expose evidence; training stays separate', async () => {
      await json('evidence', undefined, null, 401);
      const listing = await json('evidence'), liveId = listing.decisions[0].id;
      await json('members', {email: 'evidence-inspector@example.test', role: 'warehouse'});
      await json('evidence', undefined, 'evidence-inspector', 403);
      await json('evidence/' + liveId + '/export', undefined, 'evidence-inspector', 403);
      assert.deepEqual((await json('evidence', undefined, 'separate-owner')).decisions, []);
      await json('evidence/' + liveId + '/export', undefined, 'separate-owner', 404);
      const live = await json('state');
      await json('incidents', {lot: live.lots[0].id, reason: 'Wrong warehouse', severity: 'high'}, 'separate-owner', 404);
      assert.deepEqual((await json('evidence?area=training')).decisions, []);
      await json('evidence/' + liveId + '/export?area=training', undefined, 'evidence-owner', 404);
      const training = await json('state?area=training');
      const trainingLot = training.lots.find(lot => !training.incidents.some(incident => incident.lot === lot.id && incident.status !== 'closed'));
      assert.ok(trainingLot);
      await json('incidents?area=training', {lot: trainingLot.id, reason: 'Labeled training capture', severity: 'high'});
      const trainingList = await json('evidence?area=training');
      assert.equal(trainingList.decisions.length, 1);
      const bytes = await archive(trainingList.decisions[0].id, 'evidence-owner', '?area=training');
      const report = verifyEvidenceArchive(bytes, {publicKey: firstKey.publicKey});
      assert.equal(report.valid, true, report.reason);
      assert.equal(report.simulated, true);
      assert.match(report.workspace, /:training$/);
      assert.equal((await json('evidence')).decisions.length, listing.decisions.length);
    });

    await t.test('editing a committed ledger row makes export fail closed instead of producing a new signature', async () => {
      const listing = await json('evidence'), id = listing.decisions[0].id;
      const original = await archive(id);
      const workspace = await workspaceOf('evidence-owner');
      const row = await q('SELECT seq,payload FROM audit_ledger WHERE workspace=? ORDER BY seq LIMIT 1', workspace).first();
      await q('UPDATE audit_ledger SET payload=? WHERE workspace=? AND seq=?', '{}', workspace, row.seq).run();
      await json('evidence/' + id + '/export', undefined, 'evidence-owner', 409);
      await q('UPDATE audit_ledger SET payload=? WHERE workspace=? AND seq=?', row.payload, workspace, row.seq).run();
      assert.deepEqual(await archive(id), original);
    });
  } finally {
    for (const [key, value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
    await rm(directory, {recursive: true, force: true});
  }
});
