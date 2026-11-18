/* DX-TRACE marketing site: accessible mobile navigation. MIT License. */
(() => {
  'use strict';
  // Resolve the app address from the current deployment; never bake in the
  // maintainer's domain. Operators can override it via window.DXTRACE_APP_URL.
  const hostname = location.hostname;
  const defaultAppHost = hostname.startsWith('landing.')
    ? hostname.replace(/^landing\./, 'app.')
    : 'app.' + hostname;
  const appUrl = typeof window.DXTRACE_APP_URL === 'string'
    && /^https:\/\/[^/]+\/$/.test(window.DXTRACE_APP_URL)
    ? window.DXTRACE_APP_URL
    : 'https://' + defaultAppHost + '/';
  document.querySelectorAll('[data-dxtrace-login]').forEach(link => {
    link.setAttribute('href', appUrl);
  });
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    document.body.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
  document.addEventListener('click', event => { if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false); });
})();
