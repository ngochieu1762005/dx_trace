# DX-OS governance and evidence

## Hot / cold
The hot workspace retains recent sensor samples; indexed sensor_history retains the complete history. Export a completed month from a consistent verified SQLite backup to a new gzip JSON Lines directory:
```sh
node tools/archive-sensors.mjs export /secure/backup/warehouse.sqlite /secure/cold/oct ws-example 2026-10
node tools/archive-sensors.mjs verify /secure/cold/oct
node tools/archive-sensors.mjs query /secure/cold/oct device-id
```
Archives are workspace-specific, checksummed, and non-destructive. Keep in separately permissioned/encrypted operator storage. No live purge, automated tiering, WORM guarantee or Parquet engine is claimed. Retention and deletion require a separate reviewed policy.

## IT/OT and lineage
The existing device key and POST /api/ingest validate identity, temperature, timestamp and replay. GET /api/sensor-lineage/{device}?reading={sampleId} is restricted to managers and returns the persisted reading, source device, linked lot, storage fingerprint and any associated audit entries. No inferred incident causality is asserted. History is real when the reading comes from an actual device; synthetic data must be marked as a fixture. 

## Zero Trust / GitOps
APISIX private network and separate gateway/Core credentials, Core RBAC/workspace isolation, Flowable private database and API networks, no exposed engine or database port. `node tools/verify-stack.mjs -f selfhost/compose.yaml -f selfhost/compose.third-party.yaml` validates the rendered Compose topology without printing secrets (run with a properly configured env file). PR CI is a desired-state gate, not continuous deployment reconciliation. Use reviewed commits and preserve production volumes. No automatic deployment or production claims.

## Controlled device demonstration
Create a dedicated device in a disposable training workspace, then set the token without writing it to source. From a host where the training endpoint is deliberately exposed with TLS:

```sh
read -rsp 'Training device token: ' DX_DEVICE_TOKEN; echo
export DX_DEVICE_TOKEN
node tools/sensor-client.mjs https://app.example.org/api/ingest 12 3 --training-fixture
unset DX_DEVICE_TOKEN
```

The script sends real HTTP requests with synthetic measurements and preserves the same sample ID/body during retries. Never use a production lot or a real device token for this fixture. The operator must configure ingress for device-token authentication; do not bypass SSO for other routes. Verify in the UI and lineage API, then revoke the training device. A hardware sensor has not been certified by this test.
