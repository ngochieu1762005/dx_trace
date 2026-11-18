/*
 * DX-TRACE | Shared session recovery and API responses
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File public/shared/session.mjs
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
/** Preserve the app, workspace query and hash through OIDC sign-in. */
export function signInUrl(location) {
  const destination = location.pathname + location.search + location.hash;
  return '/oauth2/start?rd=' + encodeURIComponent(destination);
}

/** Fetch API JSON without following an expired session into the IdP. */
export async function sessionRequest(url, options = {}, fetcher = fetch) {
  const response = await fetcher(url, {...options, credentials: 'same-origin', redirect: 'manual'});
  if (response.type === 'opaqueredirect' || response.status === 401 ||
      (response.status >= 300 && response.status < 400)) {
    throw Object.assign(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.'), {status: 401});
  }
  if (!(response.headers.get('content-type') || '').includes('application/json')) {
    throw Object.assign(new Error('Máy chủ trả về nội dung không hợp lệ. Hãy thử lại hoặc liên hệ quản trị viên.'), {status: response.status >= 400 ? response.status : 502});
  }
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Không thể thực hiện yêu cầu'), {status: response.status});
  return data;
}
