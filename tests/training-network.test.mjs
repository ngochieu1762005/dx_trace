/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {initial} from '../lib/domain.mjs';
import {seedDemo, expandTraining, TRAINING_EDITION} from '../lib/demo.mjs';
import {recallImpact} from '../lib/impact.mjs';
import {resolveScan} from '../lib/scan.mjs';

const now = '2026-05-02T01:00:00.000Z';
test('training network reconciles lot, shipment, incident and sensor histories', () => {
  const state = seedDemo(initial(), now);
  assert.deepEqual([state.lots.length, state.shipments.length, state.partners.length,
    state.devices.length, state.readings.length, state.incidents.length, state.documents.length], [64,184,22,17,344,4,6]);
  for (const table of ['lots','partners','shipments','readings','incidents','events','devices','documents']) {
    const ids = state[table].map(row => row.id);
    assert.equal(new Set(ids).size, ids.length, table);
  }
  for (const lot of state.lots.filter(row => row.id.startsWith('NET-'))) {
    const shipments = state.shipments.filter(sh => sh.lot === lot.id);
    assert.equal(shipments.length, 3);
    assert.ok(state.partners.find(p => p.id === lot.supplier && p.kind === 'supplier'));
    assert.ok(shipments.every(sh => sh.created >= lot.created && sh.updated >= sh.created && sh.updated <= now));
    assert.ok(lot.min_temp < lot.max_temp);
    assert.equal(state.lots.filter(row => row.barcode === lot.barcode).length, 4);
    assert.ok(resolveScan(lot.barcode, state.lots, '').query);
  }
  for (const sample of state.readings) {
    const sensor = state.devices.find(device => device.id === sample.device);
    assert.equal(sensor.lot, sample.lot);
    assert.ok(sensor.created <= sample.recorded && sample.recorded <= now);
  }
  assert.equal(recallImpact(state, 'DX-LOT-SUA-005').total.outstanding, 33);
  const closed = recallImpact(state, 'NET-LOT-TOM-102');
  assert.ok(closed.fullyReconciled && closed.total.received > 0);
  assert.equal(state.incidents.find(i => i.lot === closed.lot).status, 'closed');
  assert.equal(state.lots.find(l => l.code === 'DAU-101').status, 'quarantine');
});

test('upgrading an edited training workspace is repeatable and skips codes in use', () => {
  const edited = seedDemo(initial(), now);
  for (const [key, rows] of Object.entries(edited)) {
    if (Array.isArray(rows)) edited[key] = rows.filter(row => !row.id.startsWith('NET-'));
  }
  edited.trainingEdition = 2;
  edited.lots[0].notes = 'Ghi chú do người vận hành sửa';
  edited.lots.push({...edited.lots[0], id: 'LOCAL-LOT', code: 'DAU-101'});
  const state = expandTraining(edited, now);
  assert.equal(state.trainingEdition, TRAINING_EDITION);
  assert.equal(state.lots[0].notes, 'Ghi chú do người vận hành sửa');
  assert.equal(state.lots.filter(lot => lot.code === 'DAU-101').length, 1);
  assert.ok(!state.shipments.some(sh => sh.lot === 'NET-LOT-DAU-101'));
  assert.ok(!state.incidents.some(i => i.lot === 'NET-LOT-DAU-101'));
  const after = structuredClone(state);
  assert.deepEqual(expandTraining(state, '2026-06-01T00:00:00Z'), after);
  const live = initial();
  expandTraining(live, now);
  assert.deepEqual(live, initial());
});
