/*
 * DX-TRACE | First-run configuration and secret generation
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File selfhost/setup.mjs
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {randomBytes} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const [app,id]=process.argv.slice(2);
if(![app,id].every(s=>s&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(s))||app===id)throw Error('Nhập hai tên miền hợp lệ, khác nhau.');
const secret=()=>randomBytes(32).toString('hex');
writeFileSync(new URL('.env',import.meta.url),[
 'APP_HOST='+app,'ID_HOST='+id,'DB_PASSWORD='+secret(),'ADMIN_PASSWORD='+secret(),'OIDC_CLIENT_SECRET='+secret(),'COOKIE_SECRET='+randomBytes(32).toString('base64url'),'DX_CORE_TOKEN='+secret()
].join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Đã tạo selfhost/.env, chỉ người sở hữu đọc được.');
