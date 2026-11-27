/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
import {ArrowUpRight, CalendarDays} from 'lucide-react';
import {availableStock, eligibleLots} from '@/lib/inventory-view.mjs';

type Lot = {id: string; code: string; product: string; quantity: number; unit: string; expiry: string; status: string};
type Shipment = {lot: string; created: string; quantity: number; status: string};
const dayMs = 86400000;
const calendar = new Intl.DateTimeFormat('vi-VN', {day: '2-digit', month: '2-digit', timeZone: 'UTC'});

export default function DispatchOverview({lots, shipments, asOf}: {lots: Lot[]; shipments: Shipment[]; asOf: string}) {
  const today = asOf.slice(0, 10);
  const midnight = Date.parse(today + 'T00:00:00Z');
  const days = Array.from({length: 7}, (_, i) => {
    const date = new Date(midnight - (6 - i) * dayMs);
    const key = date.toISOString().slice(0, 10);
    return {key, label: calendar.format(date), count: 0};
  });
  for (const shipment of shipments) {
    const day = days.find(d => d.key === shipment.created.slice(0, 10));
    if (day) day.count++;
  }
  const total = days.reduce((n, day) => n + day.count, 0);
  const peak = Math.max(1, ...days.map(d => d.count));
  const nextLots: Lot[] = eligibleLots(lots, shipments, today).slice(0, 3);

  return <div className="dispatch-overview">
    <section className="dispatch-chart" aria-labelledby="dispatch-title">
      <header><div><h2 id="dispatch-title">Nhịp giao nhận</h2><p>Phiếu xuất được lập trong 7 ngày (UTC)</p></div>
        <a href="#shipments" aria-label="Xem tất cả phiếu giao nhận"><ArrowUpRight size={19}/></a></header>
      <div className="dispatch-plot"><div className="dispatch-total"><strong>{total}</strong><span>phiếu xuất</span></div>
        <ol aria-label="Số phiếu theo ngày">{days.map(({key, label, count}) =>
          <li key={key}><b>{count}</b><span className="bar-track" aria-hidden="true"><i style={{height: (count / peak * 100) + '%'}}/></span><time dateTime={key}>{label}</time></li>
        )}</ol></div>
    </section>
    <section className="dispatch-next" aria-labelledby="next-lots-title">
      <header><div><h2 id="next-lots-title">Ưu tiên xuất kho</h2><p>Lô khả dụng theo hạn dùng gần nhất</p></div><CalendarDays size={21} aria-hidden="true"/></header>
      {nextLots.length ? <ul>{nextLots.map(lot => <li key={lot.id}><a href={'#trace/' + encodeURIComponent(lot.id)}>
        <div><b>{lot.product}</b><small>{lot.code} · còn {availableStock(lot, shipments)} {lot.unit}</small></div>
        <time dateTime={lot.expiry}>{calendar.format(new Date(lot.expiry + 'T00:00:00Z'))}</time><ArrowUpRight size={15}/></a></li>)}</ul>
        : <p className="dispatch-empty">Chưa có lô còn hạn và còn hàng để xuất.</p>}
    </section>
  </div>;
}
