# Introduction

DX-TRACE is an MIT-licensed open-core platform for food supply-chain traceability, quality control and coordinated recalls. The same headless core serves a warehouse application and an independently deployed Quality Portal.

## Explore the platform

![Current architecture](../../docs/assets/architecture-current.svg)

- [Quick start](quickstart.md): run a local training workspace.
- [Architecture](architecture-map.md): understand trust boundaries and shared services.
- [Build an application](app-tutorial.md): use declarative AppKit manifests.
- [API reference](api-reference.md): integrate with the core.

## Current scope

Core storage remains SQLite; the PostgreSQL tool supports an offline verified migration rehearsal, not a running PostgreSQL Core. BPMN is a documented subset. Production SSO, malware scanning and recovery require deployment-specific acceptance. Main-branch features may be newer than published releases.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/intro.md).
