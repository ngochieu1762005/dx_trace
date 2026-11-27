<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# API examples

## Run from the authenticated app

```javascript
const r = await fetch('/api/models/maintenance/records?area=training&limit=20');
console.log(r.status, await r.json());
```

## Create a training record

```javascript
const key = crypto.randomUUID();
const body = {data:{equipment:'Freezer A',description:'Check gasket',priority:'Thường'}};
const r = await fetch('/api/models/maintenance/records?area=training',{
  method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)
});
console.log(r.status,await r.json());
```

Install the maintenance model first. Preserve the same key and body for retries. The priority value must match the installed model; it is intentionally not translated.

## Verify the example against stored data

After creation, retain the returned ID and read the records in the same training area. Compare equipment and state before requesting a transition. If a transition response is lost, read back that ID before issuing a new command. For approval checks, use a second session with an authorised account in the same workspace.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/api-examples.md).
