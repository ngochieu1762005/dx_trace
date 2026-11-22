/* DX-TRACE | Basic tracked-source secret gate.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 *
 * The gate intentionally reports only locations and rule IDs, never values.
 * It complements (does not replace) dedicated secret-scanning services.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const RULES = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ['github-pat', /(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{30,}/g],
  ['github-fine-grained-pat', /github_pat_[A-Za-z0-9_]{40,}/g],
  ['openai-api-key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g]
];
const SKIP_EXT = /\.(?:woff2?|png|jpe?g|gif|ico|pdf|zip|gz|lock|map|webp|bin|db|sqlite)$/i;
const SKIP_PREFIX = /^(?:node_modules\/|selfhost\/generated\/|coverage\/|\.git\/)/;

export function findSecrets(source) {
  if (typeof source !== 'string') return [];
  const findings = [];
  for (const [rule, pattern] of RULES) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push({rule, line});
    }
  }
  return findings;
}
export function suspiciousEnvPath(path) {
  // A tracked .env file without the .example suffix can disclose secrets.
  return /(?:^|\/)\.env(?:\.[^/]+)?$/.test(path) &&
    !/(?:^|\/)\.env(?:\.[^/]+)?\.example$/.test(path) &&
    path !== '.env.example';
}

export function auditTrackedFiles(paths) {
  const issues = [];
  for (const path of paths) {
    if (suspiciousEnvPath(path)) {
      issues.push({path,rule:'tracked-environment-file'});
      continue;
    }
    if (SKIP_PREFIX.test(path) || SKIP_EXT.test(path)) continue;
    const info = statSync(path);
    if (!info.isFile() || info.size > 1_000_000) continue;
    const content = readFileSync(path,'utf8');
    for (const finding of findSecrets(content)) {
      issues.push({path,...finding});
    }
  }
  return issues;
}

const invoked = Boolean(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url));
if (invoked) {
  const tracked = execFileSync('git',['ls-files','-z'],{encoding:'utf8'})
    .split('\0').filter(Boolean);
  const issues = auditTrackedFiles(tracked);
  if (issues.length) {
    for (const finding of issues) {
      console.error('[secret-gate] ' + finding.path +
        (finding.line ? ':' + finding.line : '') + ' — ' + finding.rule);
    }
    process.exitCode = 1;
  } else {
    console.log('[secret-gate] OK: no known credential fingerprints in tracked text files');
  }
}
