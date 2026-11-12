/*
 * DX-TRACE | Training dashboard for the sample recall
 *
 * @Project DX-TRACE
 * @Maintainer Nguyễn Ngọc Hiếu and DX-TRACE contributors
 * @File app/training-overview.tsx
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
import React from 'react';
import {recallImpact} from '../lib/impact.mjs';

export default function TrainingOverview({state,open}:{state:any;open:(page:string,id:string)=>void}){
  const lot=state.lots.find((row:any)=>row.id==='DX-LOT-SUA-005');
  if(!lot)return null;
  const report=recallImpact(state,lot.id);
  if(!report)return null;
  const {sent,received,outstanding,reserved}=report.total;
  const readings=state.readings.filter((row:any)=>row.lot===lot.id).slice(0,8).reverse();
  const bottom=Math.min(0,...readings.map((r:any)=>r.temperature));
  const top=Math.max(lot.max_temp+2,...readings.map((r:any)=>r.temperature));
  const y=(v:number)=>65-60*(v-bottom)/(top-bottom);
  const x=(index:number)=>8+284*index/Math.max(1,readings.length-1);
  return <section className="training-focus">
    <div className="focus-heading"><div><small>DIỄN TẬP THU HỒI · {lot.code}</small><h2>{lot.product} đang ở đâu?</h2></div><button onClick={()=>open('trace',lot.id)}>Truy xuất lô →</button></div>
    <div className="focus-grid"><div><h3>Nhiệt độ bảo quản</h3><strong>{readings.at(-1)?.temperature??'—'} °C</strong><p>Số đo gần nhất · giới hạn {lot.max_temp} °C</p>
    <svg viewBox="0 0 300 76" role="img" aria-label={'Nhiệt độ từ cũ đến mới: '+readings.map((r:any)=>r.temperature).join(', ')+' độ C'}>
    <line x1="0" x2="300" y1={y(lot.max_temp)} y2={y(lot.max_temp)} stroke="#b74a27" strokeDasharray="5 4"/>
    <polyline points={readings.map((r:any,i:number)=>x(i)+','+y(r.temperature)).join(' ')} fill="none" stroke="#25678a" strokeWidth="3"/>
    {readings.map((r:any,i:number)=><circle key={r.id} cx={x(i)} cy={y(r.temperature)} r="3.6" fill={r.temperature>lot.max_temp?'#bd4023':'#25678a'}><title>{r.temperature} °C · {r.recorded}</title></circle>)}</svg></div>
    <div><h3>Tiến độ nhận trả</h3><strong>{received} / {sent} hộp</strong><progress value={received} max={sent||1}/><p>Còn <b>{outstanding} hộp</b> cần thu về. Kho đang giữ <b>{reserved} hộp</b> trên phiếu chưa giao.</p></div>
    <div><h3>Phân theo điểm nhận</h3>{report.destinations.map(d=><p className="focus-row" key={d.id}><b>{d.name.replace('Điểm nhận ','')}</b><span>{d.outstanding?'Còn thu '+d.outstanding:d.reserved?'Chờ giao '+d.reserved:'Đã đối soát'}</span></p>)}</div></div>
  </section>;
}
