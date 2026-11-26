// DX-TRACE brand and font regression tests. SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('restores locally served Google Sans and original Keycloak system fonts', () => {
  const app = read('app/globals.css');
  const landing = read('landing/assets/site.css');
  const keycloak = read('selfhost/themes/dxtrace/login/resources/css/dxtrace-v4.css');
  assert.match(app, /font-family:\s*['\"]Google Sans['\"]/);
  assert.match(landing, /font-family:Google Sans,Arial,sans-serif/);
  assert.match(keycloak, /font-family:"Segoe UI",Arial/);
  for (const css of [app,landing,keycloak,read('selfhost/themes/dxtrace/login/resources/css/dxtrace.css')]) {
    assert.doesNotMatch(css, /Be Vietnam Pro|fonts\.googleapis\.com/);
  }
});
test('DX brand appears in app, landing, favicon, and identity theme', () => {
  const app = read('app/console.tsx');
  assert.equal((app.match(/src="\/brand-mark\.svg"/g) || []).length, 3);
  const landing = read('landing/index.html');
  assert.equal((landing.match(/src="\/assets\/brand-lockup\.svg"/g) || []).length, 2);
  for (const asset of ['landing/assets/mark.svg','landing/assets/brand-lockup.svg','public/favicon.svg','public/brand-mark.svg','selfhost/themes/dxtrace/login/resources/img/dxtrace-mark.svg']) {
    const svg = read(asset);
    assert.match(svg, /<svg\b/);
    assert.match(svg, /#1967D2/);
    assert.match(svg, /DX-TRACE/);
  }
});
