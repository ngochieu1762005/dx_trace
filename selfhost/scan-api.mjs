/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {createServer} from 'node:http';
import {createConnection} from 'node:net';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const MAX_UPLOAD = 5 * 1024 * 1024;
export function scanBytes(bytes, {host='clamav', port=3310, timeout=10000}={}) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_UPLOAD)
    return Promise.reject(Error('Invalid scan size'));
  return new Promise((resolve, reject) => {
    const socket = createConnection({host, port});
    let output = Buffer.alloc(0), settled = false;
    const timer = setTimeout(() => finish(Error('Scanner timeout')), timeout);
    function finish(error, result) {
      if (settled) return;
      settled = true; clearTimeout(timer); socket.destroy();
      if (error) reject(error); else resolve(result);
    }
    socket.on('error', finish);
    socket.on('close', () => finish(Error('Incomplete scanner response')));
    socket.on('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'));
      for (let i=0; i<bytes.length; i+=65536) {
        const chunk=bytes.subarray(i,i+65536), size=Buffer.alloc(4);
        size.writeUInt32BE(chunk.length); socket.write(size); socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', chunk => {
      output = Buffer.concat([output,chunk]);
      if (output.length > 4096) return finish(Error('Oversized scanner response'));
      const end = output.indexOf(0);
      if (end === -1) return;
      const message=output.subarray(0,end).toString('utf8');
      if (message === 'stream: OK') finish(null,true);
      else if (/^stream: .+ FOUND$/.test(message)) finish(null,false);
      else finish(Error('Unexpected scanner response'));
    });
  });
}
export function createScanner({token, scan=scanBytes, maxConcurrent=2}) {
  if (typeof token !== 'string' || token.length < 32) throw Error('Scanner requires a random 32+ character credential');
  let active=0;
  return createServer({requestTimeout:12000,headersTimeout:5000}, async (req,res) => {
    const reply=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','connection':'close'});res.end(JSON.stringify(body));};
    if (req.method !== 'POST' || req.url !== '/scan') return reply(404,{error:'Not found'});
    const expected=Buffer.from('Bearer '+token), actual=Buffer.from(req.headers.authorization||'');
    if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) return reply(403,{error:'Forbidden'});
    if (req.headers['content-type']!=='application/octet-stream') return reply(415,{error:'Unsupported media'});
    if (Number(req.headers['content-length'])>MAX_UPLOAD) return reply(413,{error:'Too large'});
    if (active>=maxConcurrent) return reply(503,{error:'Scanner busy'});
    active++;
    try {
      const chunks=[]; let size=0;
      for await (const chunk of req) {
        size+=chunk.length; if (size>MAX_UPLOAD) return reply(413,{error:'Too large'});
        chunks.push(chunk);
      }
      if (!size) return reply(400,{error:'Empty file'});
      const clean=await scan(Buffer.concat(chunks));
      if (typeof clean!=='boolean') throw Error('Invalid scanner result');
      return reply(200,{clean});
    } catch { return reply(503,{error:'Scanner unavailable'}); }
    finally { active--; }
  });
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  createScanner({token:process.env.FILE_SCAN_TOKEN}).listen(8094,'0.0.0.0');
}
