/* DX-TRACE | Offline audit verification CLI.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {readFile} from 'node:fs/promises';
import {verifyAuditBundle} from '../lib/audit-proof.mjs';
try{
 const [bundlePath,checkpointPath,...extra]=process.argv.slice(2);
 if(!bundlePath||extra.length)throw Error('Usage: node tools/verify-audit.mjs bundle.json [previous-checkpoint.json]');
 const bundle=JSON.parse(await readFile(bundlePath,'utf8'));
 const checkpoint=checkpointPath?JSON.parse(await readFile(checkpointPath,'utf8')):undefined;
 const result=await verifyAuditBundle(bundle,checkpoint);
 console.log(JSON.stringify(result));
 if(!result.valid)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=1;}
