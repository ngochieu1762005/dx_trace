/* DX-TRACE | SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {DomainError} from './domain.mjs';

// A configured scanner must explicitly attest a clean result before storage.
export async function verifyUpload(bytes, env, request=fetch) {
  if (!env.FILE_SCAN_URL) return 'pending';
  let result;
  try {
    const response = await request(env.FILE_SCAN_URL, {
      method: 'POST', headers: {
        'content-type': 'application/octet-stream',
        authorization: 'Bearer ' + (env.FILE_SCAN_TOKEN || '')
      }, body: bytes, signal: AbortSignal.timeout(15000), redirect: 'error'
    });
    if (!response.ok) throw Error('Scanner unavailable');
    result = await response.json();
  } catch {
    throw new DomainError('Dịch vụ kiểm dịch chưa sẵn sàng; tệp chưa được lưu', 503);
  }
  if (result?.clean === true) return 'clean';
  if (result?.clean === false) throw new DomainError('Tệp không đạt kiểm dịch; tệp chưa được lưu', 422);
  throw new DomainError('Kết quả kiểm dịch không hợp lệ; tệp chưa được lưu', 503);
}
