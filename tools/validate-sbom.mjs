/* DX-TRACE | SPDX SBOM verification.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function validateSbom(input){
  if(!input||typeof input!=='object'||!/^SPDX-2\.[23]$/.test(input.spdxVersion||''))throw Error('Expected SPDX 2.2/2.3 JSON');
  if(typeof input.documentNamespace!=='string'||!input.documentNamespace.startsWith('http'))throw Error('Missing SPDX document namespace');
  if(!Array.isArray(input.packages)||input.packages.length===0)throw Error('No inventoried packages');
  const invalid=input.packages.filter(p=>!p.SPDXID||!p.name||!p.versionInfo||typeof p.name!=='string');
  if(invalid.length)throw Error('Incomplete package identifiers, names or versions');
  return {packageCount:input.packages.length,format:input.spdxVersion,document:input.name};
}
const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked){
  try{
    const filepath=process.argv[2];
    if(!filepath)throw Error('Usage: node tools/validate-sbom.mjs FILE.spdx.json');
    const result=validateSbom(JSON.parse(readFileSync(filepath,'utf8')));
    console.log('PASS SPDX inventory',JSON.stringify(result));
  }catch(error){console.error('FAIL SBOM:',error.message);process.exitCode=1;}
}