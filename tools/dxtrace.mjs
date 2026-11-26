#!/usr/bin/env node
/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {readFileSync,statSync} from 'node:fs';
const [command,file]=process.argv.slice(2);
try {
  if(command==='evidence'){
    // Offline verification imports only Node built-ins; it needs neither a live Core nor npm packages.
    const {evidenceCommand}=await import('./evidence-cli.mjs');
    const result=await evidenceCommand(process.argv.slice(3));
    console.log(JSON.stringify(result,null,2));
    if(result.valid===false)process.exitCode=1;
  } else if(command==='app'){
    const {appCommand}=await import('./app-cli.mjs');
    console.log(JSON.stringify(await appCommand(process.argv.slice(3)),null,2));
  } else {
  if (!['lint','catalog','openapi','bundle-lint','bundle-plan'].includes(command)||!file||process.argv.length!==4)
    throw Error('Usage: node tools/dxtrace.mjs lint|catalog|openapi|bundle-lint|bundle-plan <file.json>');
  if (!statSync(file).isFile()||statSync(file).size>500000) throw Error('Invalid manifest file');
  const input=JSON.parse(readFileSync(file,'utf8'));
  if(command.startsWith('bundle-')){
    const {bundleDefinitions,planBundle}=await import('../lib/application-bundle.mjs');
    const definitions=bundleDefinitions(input);
    console.log(JSON.stringify(command==='bundle-lint'?{valid:true,models:definitions.map(d=>d.id)}:planBundle({models:[],records:[]},input),null,2));
  }else{
  const {manifestToModel}=await import('../lib/appkit.mjs');
  const {manifestArtifacts}=await import('../lib/data-catalog.mjs');
  const model=manifestToModel(input);
  const artifacts=manifestArtifacts(model);
  const result=command==='lint'?{valid:true,id:model.id,fields:model.fields.length}:artifacts[command];
  console.log(JSON.stringify(result,null,2));
  }
  }
} catch(e) { console.error(e.message); process.exitCode=1; }
