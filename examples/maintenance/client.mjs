/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | External client through an authenticated SSH tunnel to core.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {readFile} from 'node:fs/promises';
const base=new URL(process.env.DX_URL||'http://127.0.0.1:8081');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('Example requires a loopback SSH tunnel; never expose the core port publicly.');
if(!process.env.DX_CORE_TOKEN||!process.env.DX_USER||!process.env.DX_EMAIL)throw Error('Set DX_CORE_TOKEN, DX_USER and DX_EMAIL for the authorized test identity.');
async function api(route,body){const r=await fetch(new URL('/api/'+route,base),{method:body?'POST':'GET',headers:{'x-dx-core-token':process.env.DX_CORE_TOKEN,'x-forwarded-user':process.env.DX_USER,'x-forwarded-email':process.env.DX_EMAIL,'content-type':'application/json','idempotency-key':crypto.randomUUID()},body:body?JSON.stringify(body):undefined});const value=await r.json();if(!r.ok)throw Error(JSON.stringify(value));return value}
const definition=JSON.parse(await readFile(new URL('./model.json',import.meta.url),'utf8'));
const plan=await api('models/plan',{definition});console.log('Plan:',plan);
if(process.argv.includes('--apply'))console.log('Applied:',await api('models/apply',{definition,baseVersion:plan.baseVersion}));
console.log('Records:',await api('models/'+definition.id+'/records'));
