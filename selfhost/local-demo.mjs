/*
 * DX-TRACE | School workstation demo launcher
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File selfhost/local-demo.mjs
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
import path from 'node:path';
import { access } from 'node:fs/promises';

const port = 8080;
const origin = 'http://127.0.0.1:' + port;
await access('selfhost/generated/web/index.html');
process.env.PUBLIC_ORIGIN = origin;
process.env.PORT = String(port);
process.env.BIND_ADDRESS = '127.0.0.1';
process.env.DATA_DIR = path.resolve('selfhost/local-demo-data');
process.env.DX_LOCAL_DEMO = '1';
await import('./server.mjs');
