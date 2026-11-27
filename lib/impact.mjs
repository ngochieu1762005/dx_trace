/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/*
 * DX-TRACE | Lot-level recall reconciliation
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File lib/impact.mjs
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
/** Derive a single-lot reconciliation. Units of different lots must never be added. */
export function recallImpact(state,lotId){
 const lot=state.lots.find(row=>row.id===lotId);
 if(!lot)return null;
 const partners=new Map(state.partners.map(row=>[row.id,row.name]));
 const groups=new Map();
 const total={sent:0,received:0,outstanding:0,reserved:0};
 for(const shipment of state.shipments){
  if(shipment.lot!==lot.id||shipment.status==='cancelled')continue;
  if(!groups.has(shipment.destination))groups.set(shipment.destination,{
   id:shipment.destination,name:partners.get(shipment.destination)||shipment.destination,
   sent:0,received:0,outstanding:0,reserved:0,receipts:[]
  });
  const group=groups.get(shipment.destination);
  const reserved=shipment.status==='reserved'?shipment.quantity:0;
  const sent=reserved?0:shipment.quantity;
  const received=shipment.returnedQuantity??(shipment.status==='returned'?sent:0);
  const measures={sent,received,outstanding:sent-received,reserved};
  group.receipts.push({id:shipment.id,...measures});
  for(const key of Object.keys(measures)){group[key]+=measures[key];total[key]+=measures[key]}
 }
 const destinations=[...groups.values()].sort((a,b)=>b.outstanding-a.outstanding||b.reserved-a.reserved||a.name.localeCompare(b.name,'vi'));
 return {lot:lot.id,code:lot.code,product:lot.product,unit:lot.unit,total,destinations,
  fullyReconciled:total.outstanding===0&&total.reserved===0};
}
