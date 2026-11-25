# Quality Portal

## Install and operate

Deploy quality-portal alongside App, Gateway and Core. The portal uses the shared authenticated origin and does not mount the warehouse database. Install its declarative model as owner before creating inspection records.

## Verify

Create a record, submit for review, reject self-approval when configured, review using a different authorized account, then escalate a rejected inspection with the matching lot. Confirm the lot is blocked and the linked incident is visible in the warehouse app.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/QUALITY-PORTAL.md).
