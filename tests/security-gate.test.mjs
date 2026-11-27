/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Security gate regressions. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {findSecrets,suspiciousEnvPath} from '../tools/check-secrets.mjs';

test('scanner detects credential classes without returning their actual values', () => {
  const sample = 'first line\n' + 'ghp_' + 'A'.repeat(34) +
    '\n' + 'sk-proj-' + 'B'.repeat(35) + '\n';
  const findings = findSecrets(sample);
  assert.deepEqual(findings.map(item=>item.rule),['github-pat','openai-api-key']);
  assert.deepEqual(findings.map(item=>item.line),[2,3]);
  assert.ok(!JSON.stringify(findings).includes('AAAA'));
});
test('tracked environment configuration must be examples only', () => {
  assert.equal(suspiciousEnvPath('.env'),true);
  assert.equal(suspiciousEnvPath('selfhost/.env.production'),true);
  assert.equal(suspiciousEnvPath('selfhost/.env.production.example'),false);
  assert.equal(suspiciousEnvPath('.env.example'),false);
  assert.deepEqual(findSecrets('DX_CORE_TOKEN=replace-with-32-random-chars'),[]);
});
