# DX-TRACE JavaScript SDK

[Tiếng Việt](README.md) · **English**

Install the SDK in a separate application that needs to read or update DX-TRACE records. Node.js 20 or later is supported by the SDK. To install an application package into a workspace, the workspace owner uses the AppKit CLI.

## Install and verify

Download the SDK tarball from the [v0.2.0 release](https://github.com/ngochieu1762005/dx_trace/releases/tag/v0.2.0) and run the following in your client project:

```sh
npm install /path/to/dxtrace-sdk-0.2.0.tgz
node --input-type=module -e "import {DXTraceClient} from '@dxtrace/sdk'; console.log(DXTraceClient.name)"
```

The second command prints `DXTraceClient`. The release asset supports installation without a registry lookup for the SDK.

## Read a maintenance record

Register a Keycloak client with the external API audience. The API's client policy selects the workspace, area and permitted models. The user must already belong to that workspace. Supply a short-lived access token with the records read scope and the origin of the external API.

```js
import {DXTraceClient} from '@dxtrace/sdk';

const dx = new DXTraceClient({
  baseUrl: process.env.DXTRACE_API_ORIGIN,
  accessToken: () => process.env.DXTRACE_ACCESS_TOKEN
});
const model = 'pkg_maintenance_maintenance';
const page = await dx.records.list(model, {limit: 5});
console.log(page.records.map(record => record.id));
```

## Create and submit a test record

Use a test workspace with Maintenance installed and a client with create and transition scopes. The example uses the priority value declared by the supplied Maintenance model.

```js
const record = await dx.records.create(model, {
  equipment: 'Pump', description: 'Inspect shaft seal', priority: 'Thường'
}, 'maintenance-demo-001-create');
await dx.workflow.transition(model, record.id, {
  version: record.version, target: 'submitted'
}, 'maintenance-demo-001-submit');
```

Keep the same idempotency key and payload when retrying a particular write. Use a new key for a new operation. The client application handles sign-in and token renewal. [External API scopes and endpoints](https://dxtrace.hieuds.com/docs/en/external-api-v2/)
