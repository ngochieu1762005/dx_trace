/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {readFileSync,statSync} from 'node:fs';
import {manifestToModel} from '../lib/appkit.mjs';
import {manifestArtifacts} from '../lib/data-catalog.mjs';
const [command,file]=process.argv.slice(2);
try {
  if (!['lint','catalog','openapi'].includes(command)||!file||process.argv.length!==4)
    throw Error('Usage: node tools/dxtrace.mjs lint|catalog|openapi <app.json>');
  if (!statSync(file).isFile()||statSync(file).size>200000) throw Error('Invalid manifest file');
  const model=manifestToModel(JSON.parse(readFileSync(file,'utf8')));
  const artifacts=manifestArtifacts(model);
  const result=command==='lint'?{valid:true,id:model.id,fields:model.fields.length}:artifacts[command];
  console.log(JSON.stringify(result,null,2));
} catch(e) { console.error(e.message); process.exitCode=1; }
