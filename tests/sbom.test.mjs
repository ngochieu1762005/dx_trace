/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
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
  assert.throws(()=>validateSbom({...valid,packages:[{SPDXID:'bad',name:'react'}]}),/No versioned/);
  assert.throws(()=>validateSbom({...valid,packages:[{name:'react',versionInfo:'1.0'}]}),/Incomplete/);
  assert.deepEqual(validateSbom({...valid,packages:[...valid.packages,{SPDXID:'SPDXRef-Root',name:'dx-trace'}]}).unversioned,1);
});