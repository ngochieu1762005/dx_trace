# Isolated stack load characterization

Run on a development or CI machine, never on live warehouse data:

```sh
node tools/benchmark-platform.mjs --topology isolated --records 10000 --seconds 15 --levels 1,25,50,100,200 --out /tmp/dxtrace-isolated.json
```

The runner starts three separate local Node processes: presentation app, authenticated internal policy gateway and headless Core backed by temporary SQLite. It generates ephemeral service credentials, uses different synthetic manager identities for each client, and disables outbound webhook and timer workers. It binds only to loopback, uses fixed local ports 38712–38714, and removes the temporary database on exit. Do not run multiple copies concurrently.

The workload creates a maintenance record, transitions it, and reads a page. Reports include throughput, errors, p50/p95/p99, per-operation latency, source hashes, commit and environment metadata. The CI smoke run requires no errors at 1 and 10 clients; the 25–200 client characterization records errors without enforcing a capacity threshold. It is short and cumulative, not a sustained-load SLA. No TLS, Keycloak/OAuth2 Proxy, remote networking or PostgreSQL Core is measured. Report results for the actual commit and environment only; do not compare against unrelated hardware or workloads.
