/* DX-TRACE | Container readiness and authorization smoke check. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import assert from 'node:assert/strict';
const base=process.env.SMOKE_URL||'http://127.0.0.1:8080';
let ready=false;
for(let attempt=0;attempt<30;attempt++){
 try{const r=await fetch(base+'/api/health');if(r.ok){assert.equal((await r.json()).database,true);ready=true;break}}catch{}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.ok(ready,'app/core did not become ready');
assert.equal((await fetch(base+'/api/models')).status,401,'anonymous API must be denied');
const portal=await fetch(base+'/apps/quality/');
assert.equal(portal.status,200,'independent quality portal must be available');
assert.match(portal.headers.get('content-security-policy'),/default-src 'none'/);
assert.match(await portal.text(),/Kiểm soát chất lượng/);
assert.equal((await fetch(base+'/apps/quality/.env')).status,404,'portal must not serve arbitrary files');

const headers={'x-forwarded-user':'container-smoke','x-forwarded-email':'smoke@example.invalid'};
const r=await fetch(base+'/api/models',{headers});assert.equal(r.status,200);assert.deepEqual((await r.json()).models,[]);
const denied=await fetch('http://core:8081/api/health');assert.equal(denied.status,403,'core must require its internal token');
console.log('PASS non-root startup, migrations, app/core proxy and authorization');
