/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Independent Quality Control Portal static service
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 *
 * This process serves static assets ONLY. It has no DB access, OAuth credentials,
 * write tokens or dependency on the warehouse UI bundle.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const port = Number(process.env.PORT || 8090);
const bind = process.env.BIND_ADDRESS || '127.0.0.1';
const assets = new Map([
  ['/apps/quality/', ['index.html', 'text/html; charset=utf-8']],
  ['/apps/quality/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/apps/quality/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/apps/quality/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/apps/quality/manifest.json', ['manifest.json', 'application/json; charset=utf-8']]
]);
const security = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
};

createServer(async (request, response) => {
  const send = (code, body = '') => {
    response.writeHead(code, {...security, 'content-type': 'text/plain; charset=utf-8'});
    response.end(body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method Not Allowed');
  let resource;
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.search) return send(404);
    resource = assets.get(url.pathname);
    if (!resource) return send(404);
    const contents = await readFile(new URL('./' + resource[0], import.meta.url));
    response.writeHead(200, {...security, 'content-type': resource[1]});
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch (error) {
    console.error('Quality portal asset error:', error?.message);
    return send(500, 'Internal server error');
  }
}).listen(port, bind, () => {
  console.log('DX-TRACE Quality Portal static service listening (private network only)');
});
