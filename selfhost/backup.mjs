/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/*
 * DX-TRACE | Verified snapshot of warehouse records and files
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File selfhost/backup.mjs
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
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync,cpSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const source=path.resolve(process.env.DATA_DIR||'selfhost/data');
const target=process.argv[2]&&path.resolve(process.argv[2]);
if(!target||existsSync(target)||target===source||target.startsWith(source+path.sep))throw Error('Chọn thư mục sao lưu mới bên ngoài vùng dữ liệu.');
if(!existsSync(path.join(source,'warehouse.sqlite')))throw Error('Không tìm thấy cơ sở dữ liệu.');
mkdirSync(target,{recursive:true,mode:0o700});
const db=new DatabaseSync(path.join(source,'warehouse.sqlite'));
db.prepare('VACUUM INTO ?').run(path.join(target,'warehouse.sqlite'));
db.close();
// Objects are written before metadata and content-addressed. Copy after SQLite snapshot.
if(existsSync(path.join(source,'objects')))cpSync(path.join(source,'objects'),path.join(target,'objects'),{recursive:true});
const verify=new DatabaseSync(path.join(target,'warehouse.sqlite'),{readOnly:true});
if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('SQLite integrity_check failed');
for(const row of verify.prepare('SELECT id,state FROM workspaces').all()){
 for(const item of JSON.parse(row.state).files||[]){
 if(!existsSync(path.join(target,'objects',row.id,item.hash)))throw Error('Thiếu nội dung tệp '+item.id);
 }
}
verify.close();writeFileSync(path.join(target,'COMPLETE'),new Date().toISOString());console.log('Đã kiểm tra bản sao lưu.');
