/* DX-TRACE | SPDX SBOM schema contract tests.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSbom} from '../tools/validate-sbom.mjs';
const valid={spdxVersion:'SPDX-2.3',documentNamespace:'https://spdx.org/spdxdocs/dx-trace-example',name:'DX-TRACE',packages:[{SPDXID:'SPDXRef-Package-react',name:'react',versionInfo:'19.2.6'}]};
test('SPDX inventory verifies names and versions',()=>{
  assert.equal(validateSbom(valid).packageCount,1);
  assert.throws(()=>validateSbom({...valid,packages:[]}),/No inventoried/);
  assert.throws(()=>validateSbom({...valid,spdxVersion:'SPDX-9'}),/SPDX/);
  assert.throws(()=>validateSbom({...valid,packages:[{SPDXID:'bad',name:'react'}]}),/Incomplete/);
});