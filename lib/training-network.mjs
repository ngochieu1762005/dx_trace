/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
const origins = [
  ['HTX Đồi Chè', 'Thái Nguyên'], ['Vườn Cao Nguyên', 'Lâm Đồng'],
  ['Trạm thủy sản Hạ Long', 'Quảng Ninh'], ['Xưởng sữa Đồng Cỏ', 'Sơn La'],
  ['HTX Đồng Sen', 'Đồng Tháp'], ['Vựa trái cây Cồn Sơn', 'Cần Thơ'],
];
const receivers = [
  ['Kho trung chuyển', 'Bắc Ninh'], ['Bếp trường học', 'Hải Phòng'],
  ['Cửa hàng thực phẩm', 'Huế'], ['Siêu thị ven sông', 'Đà Nẵng'],
  ['Bếp ăn tập thể', 'Quảng Ngãi'], ['Điểm bán miền Trung', 'Khánh Hòa'],
  ['Kho phân phối', 'Đồng Nai'], ['Cửa hàng miền Tây', 'Cần Thơ'],
];

// Prefix, product, unit, origin index, storage zone, temperature range, shelf life in days.
const products = [
  ['TRA', 'Trà xanh sao khô', 'gói', 0, 'Kho khô K1', 15, 28, 180],
  ['OLG', 'Trà ô long', 'hộp', 0, 'Kho khô K1', 15, 28, 240],
  ['DAU', 'Dâu tây Đà Lạt', 'khay', 1, 'Kho mát M1', 2, 6, 9],
  ['NAM', 'Nấm đùi gà', 'túi', 1, 'Kho mát M1', 2, 8, 12],
  ['TOM', 'Tôm sú đông lạnh', 'thùng', 2, 'Kho đông Đ1', -24, -18, 90],
  ['MUC', 'Mực ống đông lạnh', 'túi', 2, 'Kho đông Đ1', -24, -18, 120],
  ['PHM', 'Phô mai tươi', 'hộp', 3, 'Kho lạnh A', 2, 8, 21],
  ['SKD', 'Sữa tươi không đường', 'chai', 3, 'Kho lạnh A', 2, 6, 10],
  ['SEN', 'Hạt sen sấy', 'gói', 4, 'Kho khô K2', 15, 28, 120],
  ['GAO', 'Gạo thơm đóng túi', 'túi', 4, 'Kho khô K2', 15, 28, 180],
  ['XOI', 'Xoài cát', 'thùng', 5, 'Kho quả Q1', 10, 15, 18],
  ['BUO', 'Bưởi da xanh', 'quả', 5, 'Kho quả Q1', 10, 16, 35],
];
const procedures = [
  ['Tiếp nhận thủy sản đông lạnh', 'Đối chiếu mã TOM hoặc MUC trên kiện với phiếu nhận. Ghi nhiệt độ tại bàn giao, kiểm tra niêm phong và chuyển vào kho đông Đ1. Khi vượt ngưỡng trên hồ sơ lô, mở sự cố trước khi xuất.'],
  ['Xuất hàng theo hạn dùng', 'Lọc lô đang hoạt động còn tồn và còn hạn. So sánh ngày hết hạn giữa các đợt nhập cùng sản phẩm. Lập phiếu cho điểm nhận rồi kiểm tra lại tồn khả dụng.'],
  ['Bàn giao hàng dễ dập', 'Đếm khay dâu, đối chiếu mã đợt nhập và tình trạng bao gói. Ghi nhận khay hỏng khi bàn giao. Tra cứu lô để tìm các điểm nhận khác cùng đợt.'],
  ['Đối soát hàng thu về', 'Mở hồ sơ thu hồi, đối chiếu số đã giao và đã trả ở từng điểm. Ghi nhận từng lần trả, hủy phiếu chưa giao và kiểm tra số còn phải thu trước khi đóng.'],
];

export function addTrainingNetwork(state, now) {
  const anchor = Date.parse(now);
  const ago = hours => new Date(anchor - hours * 3600000).toISOString();
  const addPartner = (id, kind, name, address) => {
    if (state.partners.some(p => p.id === id)) return;
    state.partners.push({id, kind, name: name + ' (mẫu)', address, contact: 'Điều phối ' + address + ' · mô phỏng', created: ago(40 * 24)});
  };
  origins.forEach(([name, city], i) => addPartner('NET-SUP-' + i, 'supplier', name, city));
  receivers.forEach(([name, city], i) => addPartner('NET-DST-' + i, 'destination', name + ' ' + city, city));

  products.forEach(([prefix, product, unit, origin, location, min, max, life], p) => {
    // One internal EAN-13 per product so scanning offers the four matching lots.
    const digits = '02000000' + String(p + 1).padStart(4, '0');
    const sum = [...digits].reduce((n, digit, index) => n + Number(digit) * (index % 2 ? 3 : 1), 0);
    const barcode = digits + (10 - sum % 10) % 10;
    for (let wave = 0; wave < 4; wave++) {
      const code = prefix + '-' + (101 + wave);
      const id = 'NET-LOT-' + code;
      if (state.lots.some(l => l.id === id || l.code === code)) continue;
      const age = 1 + wave * 6 + p % 5;
      const received = age * 24;
      const pending = code === 'DAU-101', closed = code === 'TOM-102';
      const lot = {id, code, barcode, product, unit, quantity: 140 + p * 13 + wave * 24,
        supplier: 'NET-SUP-' + origin, location, min_temp: min, max_temp: max,
        status: pending ? 'quarantine' : closed ? 'recall' : 'active',
        expiry: ago((age - life) * 24).slice(0, 10), created: ago(received),
        notes: 'Đợt nhập ' + (wave + 1) + ' từ ' + origins[origin][1] + '. Kiểm đếm theo ' + unit + ' tại ' + location + '.'};
      state.lots.push(lot);
      const log = (step, actor, detail, hours) => state.events.push({
        id: id + '-LOG-' + step, actor: actor + ' (mẫu)', entity: id, action: 'demo.history', detail, created: ago(hours),
      });
      log('receive', 'Tổ tiếp nhận', 'Nhập ' + lot.quantity + ' ' + unit + ' ' + code + ' tại ' + location, received);
      for (let leg = 0; leg < 3; leg++) {
        const destination = (p + wave * 2 + leg) % receivers.length;
        const quantity = 8 + (p * 3 + wave + leg * 5) % 29;
        const status = closed ? (leg === 2 ? 'cancelled' : 'returned')
          : leg < 2 ? 'delivered' : age < 7 && !pending ? 'reserved' : 'cancelled';
        const created = ago(received - 2 - leg);
        const updatedHours = closed ? received - 18 - leg : received - 8 - leg;
        const updated = status === 'reserved' ? created : ago(updatedHours);
        const target = receivers[destination].join(' ');
        if (status === 'returned' || status === 'delivered') {
          log('deliver-' + leg, 'Tổ giao nhận', target + ' đã nhận ' + quantity + ' ' + unit + ' từ ' + code, received - 8 - leg);
        }
        if (status === 'returned') log('return-' + leg, 'Tổ đối soát', target + ' trả đủ ' + quantity + ' ' + unit + ' của ' + code, updatedHours);
        state.shipments.push({id: id + '-SH-' + leg, lot: id, destination: 'NET-DST-' + destination,
          quantity, status, created, updated, ...(status === 'returned' ? {returnedQuantity: quantity} : {})});
      }
      if (wave === 0 || closed) {
        const device = 'NET-PROBE-' + code;
        state.devices.push({id: device, lot: id, name: 'Đầu dò ' + code + ' · ' + location, active: !closed, created: ago(received)});
        for (let i = 0; i < 24; i++) {
          const recorded = ago(received - i * 0.5);
          const excursion = pending && i >= 21 || closed && i >= 16 && i <= 20;
          const temperature = excursion ? max + 1 + (i % 3) * 0.5 : min + (max - min) * (0.3 + ((i * 3 + p) % 6) * 0.08);
          state.readings.push({id: device + '-' + i, device, lot: id, temperature: Number(temperature.toFixed(1)), recorded, received: recorded, synthetic: true});
        }
      }
      if (pending || closed) {
        const reason = pending ? 'Ba lần đo liên tiếp vượt ngưỡng 6 °C khi bàn giao khay dâu. Chờ quản lý thẩm định.'
          : 'Mất lạnh tại trạm bàn giao. Hai điểm đã trả đủ hàng, phiếu chưa giao đã hủy và quản lý đã đối soát.';
        state.incidents.push({id: 'NET-INC-' + code, lot: id, reason, severity: 'high',
          status: pending ? 'pending' : 'closed', created: ago(received - 12), updated: ago(received - (closed ? 22 : 12)), synthetic: true});
        log('hold', 'Tổ chất lượng', 'Cách ly ' + code + ' sau cảnh báo nhiệt độ', received - 12);
        if (closed) {
          log('recall', 'Quản lý kho', 'Duyệt thu hồi ' + code, received - 14);
          log('close', 'Quản lý kho', 'Đã đối soát đủ hàng thu về cho ' + code, received - 22);
        }
      }
    }
  });
  procedures.forEach(([title, content], i) => {
    const id = 'NET-SOP-' + i;
    if (!state.documents.some(doc => doc.id === id)) state.documents.push({id, title: 'SOP mẫu · ' + title, content, created: ago(25 * 24)});
  });
  state.readings.sort((a,b) => b.recorded.localeCompare(a.recorded));
  state.events.sort((a,b) => b.created.localeCompare(a.created));
}
