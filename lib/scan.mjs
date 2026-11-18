/*
 * DX-TRACE | Lot label and barcode decoding rules
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File lib/scan.mjs
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
export function resolveScan(text,lots,origin){
 const raw=String(text).trim();if(!raw||raw.length>2048)return {error:'Mã không hợp lệ'};
 let id=raw.startsWith('DXTRACE:LOT:')?raw.slice(12):raw;
 if(/^https?:/i.test(raw)){try{const url=new URL(raw);if(url.origin!==origin)return {error:'QR liên kết bên ngoài. Hệ thống không tự mở liên kết này.'};const match=url.hash.match(/^#trace\/([^/]+)$/);if(!match)return {error:'QR không chứa liên kết lô hợp lệ'};id=decodeURIComponent(match[1])}catch{return {error:'Liên kết QR không hợp lệ'}}}
 const matches=lots.filter(l=>l.id===id||l.code===raw||l.barcode&&l.barcode===raw);
 if(matches.length===1)return {lot:matches[0].id};if(matches.length>1)return {query:raw};if(/^\d{8,14}$/.test(raw))return {barcode:raw};return {error:'Không tìm thấy lô cho mã này trong không gian hiện tại'};
}
