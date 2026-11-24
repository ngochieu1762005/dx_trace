/* DX-TRACE | Preserve the selected workspace across applications.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
export function workspaceUrl(path, search = '') {
  if(!path.startsWith('/') || path.startsWith('//')) throw new Error('Expected a local application path');
  const url = new URL(path, 'https://workspace.invalid');
  if(new URLSearchParams(search).get('area') === 'training') url.searchParams.set('area','training');
  else url.searchParams.delete('area');
  return url.pathname + url.search + url.hash;
}
