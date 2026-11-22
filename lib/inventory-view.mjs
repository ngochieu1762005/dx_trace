/* DX-TRACE | Inventory views and spreadsheet export.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
export function availableStock(lot, shipments) {
  return lot.quantity - shipments.filter(s => s.lot === lot.id && s.status !== 'cancelled').reduce((n, s) => n + s.quantity, 0);
}
export function expiryDays(expiry, today = new Date().toISOString().slice(0, 10)) {
  return Math.round((Date.parse(expiry + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}
export function filterLots(lots, shipments, {query = '', status = 'all', focus = 'all', today} = {}, partnerName = () => '') {
  const text = query.trim().toLocaleLowerCase('vi');
  return lots.filter(l => {
    const days = expiryDays(l.expiry, today);
    return [l.code,l.product,l.barcode,l.location,partnerName(l.supplier)].join(' ').toLocaleLowerCase('vi').includes(text)
      && (status === 'all' || l.status === status)
      && (focus === 'all' || (focus === 'expiring' && days >= 0 && days <= 7)
        || (focus === 'expired' && days < 0) || (focus === 'empty' && availableStock(l, shipments) <= 0));
  });
}
export function eligibleLots(lots, shipments, today = new Date().toISOString().slice(0, 10)) {
  return lots.filter(l => l.status === 'active' && l.expiry >= today && availableStock(l, shipments) > 0)
    .sort((a,b) => a.expiry.localeCompare(b.expiry) || a.code.localeCompare(b.code));
}
export function csvText(rows) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
