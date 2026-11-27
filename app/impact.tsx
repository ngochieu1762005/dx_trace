/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/*
 * DX-TRACE | Recall reconciliation by destination
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File app/impact.tsx
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
import React,{useMemo} from 'react';
import {recallImpact} from '../lib/impact.mjs';
export default function Impact({state,lotId}:{state:any;lotId:string}){
 const report=useMemo(()=>recallImpact(state,lotId),[state,lotId]);
 if(!report)return null;
 const {total,unit,destinations}=report;
 return <section className="impact" aria-label="Đối soát thu hồi"><h3>Phạm vi thu hồi · {report.code}</h3>
 <p>Đã nhận lại <b>{total.received} / {total.sent} {unit}</b> đã giao. Còn <b>{total.outstanding} {unit}</b> tại điểm nhận và <b>{total.reserved} {unit}</b> trên phiếu chưa giao.</p>
 {total.sent>0&&<progress aria-label="Số hàng đã nhận trả" value={total.received} max={total.sent}/>}
 {destinations.map(d=><details key={d.id}><summary><b>{d.name}</b><span>Cần thu {d.outstanding} {unit} · Chưa giao {d.reserved}</span></summary>
 <ul>{d.receipts.map((r:any)=><li key={r.id}><strong>{r.id}</strong> · Đã giao {r.sent}, đã trả {r.received}, còn thu {r.outstanding}, đang giữ {r.reserved} {unit}</li>)}</ul></details>)}
 </section>
}
