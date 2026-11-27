# DX-TRACE SDK 
Install the SDK asset with `npm install ./dxtrace-sdk-0.2.0.tgz`. For source development use `npm install /absolute/path/to/dx_trace/sdk`. This package is not published on npm.
Use a token provider that obtains a short-lived OAuth access token. Never include the Core or gateway credential.
```js
import {DXTraceClient} from '@dxtrace/sdk';
const dx = new DXTraceClient({baseUrl: 'https://api.example.org', accessToken: () => process.env.DXTRACE_ACCESS_TOKEN});
const model = 'pkg_maintenance_maintenance';
const record = await dx.records.create(model, {equipment:'Pump',description:'Seal',priority:'Thường'}, 'demo-create-1');
await dx.workflow.transition(model, record.id, {version:record.version,target:'submitted'}, 'demo-submit-1');
```
Keep the same key and input after a timeout. Use a new key for a genuinely new operation. No automatic retry. Scope and record permissions are still enforced by Core. The SDK does not manage login or token refresh itself.
