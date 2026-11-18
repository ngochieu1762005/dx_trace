/* DX-TRACE | Product walkthrough and accessible navigation. SPDX-License-Identifier: MIT. Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
(() => {
  'use strict';
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const setOpen = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
      document.body.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    document.addEventListener('click', event => { if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false); });
  }
  const steps = [
    ['01 / PHÁT HIỆN', 'Một cảnh báo có đủ bối cảnh.', 'Số đo mẫu 10,8 °C vượt ngưỡng 8 °C. Hồ sơ lô liên kết đầu dò, lịch sử nhiệt độ và sự cố; lô bị cách ly sẽ không được giao tiếp.', '10,8 °C', 'Ngưỡng bảo quản tối đa: 8 °C'],
    ['02 / XÁC ĐỊNH PHẠM VI', 'Biết chính xác hàng đang ở đâu.', 'Long Biên đã nhận 30 hộp, Tây Hồ đã nhận 20 hộp. Thanh Xuân còn một phiếu giữ 12 hộp chưa giao cần hủy. Không cộng hàng chưa giao vào số cần thu hồi.', '50 hộp', 'Đã giao tới 2 điểm nhận; 12 hộp đang giữ'],
    ['03 / ĐỐI SOÁT', 'Nhận trả từng phần. Theo dõi đến hết.', 'Long Biên đã trả 17 hộp, còn 13 hộp. Tây Hồ còn 20 hộp. Chỉ đóng sự cố khi xử lý hết hàng cần thu và phiếu đang giữ; nhật ký lưu lại từng thao tác.', '33 hộp', 'Còn phải thu sau khi đã nhận lại 17 hộp']
  ];
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    const step = steps[Number(button.dataset.step)];
    if (!step) return;
    document.querySelectorAll('[data-step]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    ['step-label','step-title','step-copy','step-value','step-fact'].forEach((id,index) => { document.getElementById(id).textContent = step[index]; });
  }));
})();
