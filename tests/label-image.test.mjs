/*
 * DX-TRACE | QR image round-trip test
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File tests/label-image.test.mjs
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
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import QRCode from 'qrcode';
import {resolveScan} from '../lib/scan.mjs';
const require=createRequire(import.meta.url);
const {PNG}=createRequire(require.resolve('qrcode'))('pngjs');
const {BinaryBitmap,HybridBinarizer,RGBLuminanceSource,MultiFormatReader}=createRequire(require.resolve('@zxing/browser'))('@zxing/library');
test('PNG lot label can be decoded to the original lot',async()=>{
 const id='LOT-ABC12345';
 const png=PNG.sync.read(await QRCode.toBuffer('DXTRACE:LOT:'+id,{width:240,margin:2,errorCorrectionLevel:'M'}));
 const pixels=Uint8ClampedArray.from({length:png.width*png.height},(_,index)=>png.data[index*4]);
 const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,png.width,png.height)));
 const reader=new MultiFormatReader();reader.setHints(new Map());
 const decoded=reader.decodeWithState(bitmap).getText();
 assert.deepEqual(resolveScan(decoded,[{id,code:'SUA-003'}],'https://example.test'),{lot:id});
});
