/*
 * DX-TRACE | Camera scanning and printable lot labels
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File app/scanner.tsx
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
'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,X,Upload} from 'lucide-react';
export default function Scanner({onResult,onClose}:{onResult:(s:string)=>boolean,onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),controls=useRef<any>(null),generation=useRef(0);const [error,setError]=useState(''),[running,setRunning]=useState(false),[cameras,setCameras]=useState<MediaDeviceInfo[]>([]),[camera,setCamera]=useState(''),[manual,setManual]=useState('');
 const accept=(text:string)=>{if(!onResult(text))setError('Đã đọc: '+text+' — không tìm thấy lô trong kho hiện tại. Bạn có thể quét lại hoặc nhập mã lô.');};
 const stop=()=>{generation.current++;controls.current?.stop();controls.current=null;const stream=video.current?.srcObject as MediaStream|null;stream?.getTracks().forEach(t=>t.stop());if(video.current)video.current.srcObject=null;setRunning(false)};
 useEffect(()=>()=>{generation.current++;controls.current?.stop();(video.current?.srcObject as MediaStream|null)?.getTracks().forEach(t=>t.stop())},[]);
 async function start(){stop();const current=generation.current;setError('');try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Thiết bị cần HTTPS và trình duyệt hỗ trợ camera.');const {BrowserMultiFormatReader}=await import('@zxing/browser');const {DecodeHintType}=await import('@zxing/library');const reader=new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER,true]]));const c=await reader.decodeFromConstraints({audio:false,video:{...(camera?{deviceId:{exact:camera}}:{facingMode:{ideal:'environment'}}),width:{ideal:1920},height:{ideal:1080}}},video.current!, (result,_error,ctl)=>{if(current!==generation.current){ctl.stop();return}if(result){ctl.stop();stop();accept(result.getText())}});if(current!==generation.current){c.stop();return}controls.current=c;setRunning(true);setCameras((await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'))}catch(e:any){stop();setError(e.name==='NotAllowedError'?'Chưa được cấp quyền camera. Cho phép camera trong trình duyệt hoặc chọn ảnh.':e.name==='NotFoundError'?'Không tìm thấy camera trên thiết bị.':e.name==='NotReadableError'?'Camera đang được ứng dụng khác sử dụng.':e.message||'Không mở được camera.')}}
 async function image(file?:File){if(!file)return;stop();setError('');if(file.size>10*1024*1024){setError('Ảnh tối đa 10 MB');return}const current=generation.current;const url=URL.createObjectURL(file);try{const {BrowserMultiFormatReader}=await import('@zxing/browser');const {DecodeHintType}=await import('@zxing/library');const r=await new BrowserMultiFormatReader(new Map([[DecodeHintType.TRY_HARDER,true]])).decodeFromImageUrl(url);if(current===generation.current)accept(r.getText())}catch{if(current===generation.current)setError('Chưa đọc được mã trong ảnh. Chọn ảnh rõ, đủ sáng và có toàn bộ mã.')}finally{URL.revokeObjectURL(url)}}
 return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Quét QR và mã vạch"><div className="modal-header"><div><h2>Quét QR / mã vạch</h2><p>Dùng camera của điện thoại hoặc máy tính đang mở web. Hình ảnh được giải mã ngay trên thiết bị.</p></div><button className="icon" aria-label="Đóng camera" onClick={()=>{stop();onClose()}}><X/></button></div><div className="pad"><div className="camera-frame"><video ref={video} muted playsInline/><span>Đưa toàn bộ mã vào khung hình</span></div>{cameras.length>1&&<select aria-label="Chọn camera" value={camera} onChange={e=>{stop();setCamera(e.target.value)}}><option value="">Camera sau / mặc định</option>{cameras.map((d,i)=><option value={d.deviceId} key={d.deviceId}>{d.label||'Camera '+(i+1)}</option>)}</select>}<div className="actions scan-actions"><button onClick={running?stop:start}><Camera size={16}/>{running?'Dừng camera':'Bật camera'}</button><label className="button secondary"><Upload size={15}/>Chọn ảnh<input hidden type="file" accept="image/*" onChange={e=>{image(e.target.files?.[0]);e.target.value=''}}/></label></div>{error&&<p role="alert" className="form-error">{error}</p>}<form className="scan-manual" onSubmit={e=>{e.preventDefault();stop();accept(manual.trim())}}><input aria-label="Nhập mã thủ công" placeholder="Hoặc nhập mã lô / mã vạch" value={manual} onChange={e=>setManual(e.target.value)} maxLength={2048}/><button disabled={!manual.trim()}>Tra cứu</button></form><p className="muted">QR lô DX-TRACE, EAN, UPC, Code 128. Mã quét không tự động mở website bên ngoài.</p></div></section></div>
}
export function QRLabel({id,code,product}:{id:string,code:string,product:string}){const [src,setSrc]=useState('');useEffect(()=>{let live=true;import('qrcode').then(q=>q.toDataURL('DXTRACE:LOT:'+id,{width:240,margin:2,errorCorrectionLevel:'M'})).then(s=>{if(live)setSrc(s)});return()=>{live=false}},[id]);return <div className="qr-label">{src&&<img src={src} width={160} height={160} alt={'QR truy xuất '+code}/>}<div><b>{code}</b><p>{product}</p><small>Quét trong DX-TRACE để xem hồ sơ lô.</small>{src&&<a className="button secondary" href={src} download={code+'-qr.png'}>Tải tem QR</a>}</div></div>}
