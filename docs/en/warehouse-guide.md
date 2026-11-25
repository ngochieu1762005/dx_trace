# Warehouse and traceability

## Receive and identify stock

Create a supplier and destination, then a lot with a unique code, product, quantity, unit, expiry, location and valid temperature range. Barcode lookup supplies product context; it does not establish lot identity or replace manual verification.

## Ship and trace

Reserve available stock against a valid destination. Deliver only reserved shipments for an active, unexpired lot. Cancel undelivered reservations. Search or scan a lot QR to trace supplier, shipments, sensor readings and incidents. Use the [recall guide](recall-guide.md) for returns.

| Shipment status | Meaning |
| --- | --- |
| reserved | Stock held, not delivered |
| delivered | Delivered; eligible for return during approved recall |
| cancelled | Reservation cancelled |
| returned | Fully returned |

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/warehouse-guide.md).
