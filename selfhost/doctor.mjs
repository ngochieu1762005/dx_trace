/* DX-TRACE | Read-only deployment diagnostics. SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,statfsSync} from 'node:fs';
import {freemem,totalmem} from 'node:os';
import path from 'node:path';
let failed=false;
const report=(ok,message)=>{console.log((ok?'PASS ':'FAIL ')+message);if(!ok)failed=true};
report(Number(process.versions.node.split('.')[0])>=24,'Node.js >= 24');
const cwd=path.resolve('selfhost'),file=path.join(cwd,'.env');
report(existsSync(file),'selfhost/.env exists');
const env=existsSync(file)?Object.fromEntries(readFileSync(file,'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim()]})):{};
for(const key of ['APP_HOST','ID_HOST','DB_PASSWORD','ADMIN_PASSWORD','OIDC_CLIENT_SECRET','COOKIE_SECRET','DX_CORE_TOKEN','DX_GATEWAY_APP_TOKEN'])report(!!env[key],key+' configured (value hidden)');
report(!env.DX_CORE_TOKEN||env.DX_CORE_TOKEN.length>=32,'Core token length');
report(!env.DX_GATEWAY_APP_TOKEN||env.DX_GATEWAY_APP_TOKEN.length>=32,'Gateway app token length');
report(!env.DX_GATEWAY_APP_TOKEN||env.DX_CORE_TOKEN!==env.DX_GATEWAY_APP_TOKEN,'Core and gateway app credentials differ');
const docker=spawnSync('docker',['compose','version'],{encoding:'utf8'});report(docker.status===0,'Docker Compose available');
if(docker.status===0&&existsSync(file)){const r=spawnSync('docker',['compose','-f','compose.yaml','-f','compose.ubuntu-edge.yaml','config','--quiet'],{cwd,encoding:'utf8'});report(r.status===0,'Compose configuration valid')}
const disk=statfsSync('.');console.log('INFO Memory total/free MiB:',Math.round(totalmem()/1048576),Math.round(freemem()/1048576));console.log('INFO Available disk GiB:',Number(disk.bavail*disk.bsize/1073741824).toFixed(1));
console.log('INFO This checks configuration, not SSO login or a restore drill. No secret values were printed.');
process.exitCode=failed?1:0;
