/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Product navigation. SPDX-License-Identifier: MIT */
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');

if (menu && navigation) {
  document.documentElement.classList.add('has-menu');
  menu.hidden = false;

  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('open', open);
  }

  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target) && !menu.contains(event.target)) setMenu(false);
  });
}
