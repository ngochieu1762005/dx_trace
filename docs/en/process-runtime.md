# Process runtime

## Execution

The native orchestration engine supports start, user task, parallel fork/join, timer and end within validated definitions. Tokens and due times persist; a timer worker advances eligible records. User tasks require active tokens, role checks and versions.

## Boundaries

No claim of full BPMN conformance, arbitrary service tasks, nested forks or HA orchestration. Verify parallel completion, restart, timer and stale-version behavior.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/PROCESS-RUNTIME.md).
