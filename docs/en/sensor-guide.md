# Sensors and monitoring

## Device credentials

An owner or manager issues a key for a device attached to a lot. The credential is displayed once. Keep it outside source control and revoke it when unused.

## Submit a reading

POST /api/ingest with Bearer authentication and JSON fields id, temperature, recorded. Timestamp must be within ten minutes of server time. Retry with the same ID and payload. Three recent out-of-range readings can create a high-severity incident if none is open. A 15-minute gap raises a missing-update alert.

See the [API reference](api-reference.md) for request examples.

## Investigate a missing reading

Check the device-to-lot assignment and compare its measurement time with the server clock. If connectivity was lost after transmission, resend the same ID, value and timestamp within the acceptance window. Record the result before taking the next reading. Retries of one sample do not represent three excursions.

Compare recent readings with this lot’s storage range. A stale-device warning indicates a gap in observations. Assessing the temperature during that gap requires additional measurement evidence.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/sensor-guide.md).
