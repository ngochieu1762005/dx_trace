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

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/api-examples.md).
