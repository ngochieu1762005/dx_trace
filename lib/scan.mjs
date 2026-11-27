/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
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
// UPC-A and its zero-prefixed EAN/GTIN representation identify the same product.
const barcodeKey=value=>/^\d{8}$/.test(value)?'EAN8:'+value:/^\d{12,14}$/.test(value)?value.padStart(14,'0'):null;
export function resolveScan(text,lots,origin){
 const raw=String(text??'').normalize('NFKC').trim();
 if(!raw||raw.length>2048)return {error:'Mã không hợp lệ'};
 let id=raw, isLot=false;
 if(/^DXTRACE:LOT:/i.test(raw)){id=raw.slice(12).trim();isLot=true;}
 if(/^https?:/i.test(raw)){
  try{
   const url=new URL(raw);
   if(url.origin!==origin)return {error:'QR liên kết bên ngoài. Hệ thống không tự mở liên kết này.'};
   const match=url.hash.match(/^#trace\/([^/]+)$/);
   if(!match)return {error:'QR không chứa liên kết lô hợp lệ'};
   id=decodeURIComponent(match[1]).trim();isLot=true;
  }catch{return {error:'Liên kết QR không hợp lệ'}}
 }
 const exact=lots.filter(l=>String(l.id)===id||String(l.code).trim().toUpperCase()===id.toUpperCase());
 if(exact.length===1)return {lot:exact[0].id};
 const numeric=raw.replace(/[ \t-]/g,'');
 const key=!isLot&&barcodeKey(numeric);
 const matches=key?lots.filter(l=>barcodeKey(String(l.barcode??'').trim())===key):[];
 if(matches.length===1)return {lot:matches[0].id};
 if(matches.length>1)return {query:numeric.replace(/^0+/, '')};
 if(key)return {barcode:numeric};
 return {error:'Đã đọc mã nhưng không tìm thấy lô trong kho hiện tại. Kiểm tra đúng kho và mã trên tem.'};
}
