# Sensors and monitoring

## Device credentials

An owner or manager issues a key for a device attached to a lot. The credential is displayed once. Keep it outside source control and revoke it when unused.

## Submit a reading

POST /api/ingest with Bearer authentication and JSON fields id, temperature, recorded. Timestamp must be within ten minutes of server time. Retry with the same ID and payload. Three recent out-of-range readings can create a high-severity incident if none is open. A 15-minute gap raises a missing-update alert.

See the [API explorer](api-reference.md) for request examples.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/sensor-guide.md).
