/*
 * DX-TRACE | Interactive supply-chain training scenarios
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File public/demo/scenarios.js
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
const scenarios = [
  ['Thu hồi từng phần', 'SUA-003 · Sữa chua', '50 hộp đã đến Cầu Giấy. Một phiếu xuất 20 hộp đang chờ giao cho Hà Đông.', '50 hộp cần thu · 20 hộp chờ giao', [
    ['Cách ly lô', 'Kho đã chặn xuất thêm hàng từ SUA-003.'],
    ['Hủy phiếu Hà Đông', '20 hộp được giữ tại kho. Cầu Giấy còn phải trả 50 hộp.'],
    ['Ghi nhận trả 17 hộp', 'Kho đã nhận 17/50 hộp. Cầu Giấy còn phải trả 33 hộp.'],
    ['Xác nhận nhận đủ 33 hộp', 'Đã thu đủ 50/50 hộp. Phiếu Hà Đông đã hủy. Hồ sơ đủ điều kiện đóng.']]],
  ['Cảnh báo kho lạnh', 'SUA-001 · Sữa thanh trùng', 'Kho lạnh có ngưỡng bảo quản từ 2 đến 8 °C. Hãy gửi số đo và xử lý cảnh báo.', 'Nhiệt độ gần nhất 5 °C · Trong ngưỡng', [
    ['Gửi số đo 11 °C', '11 °C vượt ngưỡng trên 3 °C. Lô cần được kiểm tra.'],
    ['Ghi sự cố và cách ly', 'Đã ghi sự cố cho SUA-001 và tạm chặn xuất kho.'],
    ['Kiểm tra điểm nhận', 'Cầu Giấy đã nhận 40 hộp. Phiếu 30 hộp đi Hà Đông cần tạm dừng.']]],
  ['Kiểm tra hạn dùng', 'RAU-004 · Cà chua', 'Một cửa hàng đặt 12 hộp. Kho đang giữ 90 hộp cà chua cùng lô.', 'Phiếu nháp · Yêu cầu 12 hộp', [
    ['Kiểm tra lô trước khi xuất', 'RAU-004 đã hết hạn từ hôm qua.'],
    ['Thử xác nhận xuất', 'Đã chặn phiếu vì lô hết hạn. Số lượng tại kho vẫn là 90 hộp.']]],
  ['Truy xuất tại điểm nhận', 'SUA-001 · Tem trên bao bì', 'Cửa hàng Cầu Giấy cần đối chiếu nguồn gốc của lô vừa nhận.', 'Chờ đọc tem mẫu', [
    ['Đọc tem QR mẫu', 'Đã nhận diện SUA-001 · Sữa tươi thanh trùng.'],
    ['Tra nguồn cung', 'Nhà cung cấp: Trang trại Mộc An, Mộc Châu. Lô nhập tại Kho lạnh A.'],
    ['Đối chiếu phiếu giao', 'Phiếu giao Cầu Giấy ghi nhận 40 hộp đã giao. Phiếu Hà Đông 30 hộp vẫn đang chờ.']]]
];
const el = selector => document.querySelector(selector);
const progress = scenarios.map(() => 0);
let selected = 0;
function render() {
  const [name, code, intro, initial, steps] = scenarios[selected];
  const done = progress[selected];
  el('#title').textContent = name;
  el('#code').textContent = code;
  el('#intro').textContent = intro;
  el('output').textContent = done ? steps[done-1][1] : initial;
  el('.action').disabled = done === steps.length;
  el('.action').textContent = steps[done]?.[0] || 'Đã hoàn tất';
  el('ol').replaceChildren(...steps.slice(0,done).map(([action,result]) => {
    const item = document.createElement('li');
    item.textContent = action + ' — ' + result;
    return item;
  }));
  Array.from(el('nav').children).forEach((button,i) => button.setAttribute('aria-pressed', String(i === selected)));
}
scenarios.forEach(([name],i) => {
  const button = document.createElement('button');
  button.textContent = name;
  button.onclick = () => { selected = i; render(); };
  el('nav').append(button);
});
el('.action').onclick = () => { progress[selected]++; render(); };
el('#reset').onclick = () => { progress[selected] = 0; render(); };
render();
