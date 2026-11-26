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

## Distinguish two lots of one product

Create two practice lots for the same product with different lot codes and expiry dates. Scan the retail barcode to identify the product, then compare the lot code and expiry before dispatch. Scan the lot QR when tracing one receipt. Read the package label and enter the product manually if the external catalogue has no matching name.

Receive 50 units and reserve 12. With no other movements there should be 38 available. Cancel the undelivered reservation and check that 50 are available again. For a completed delivery, follow the return procedure in the recall guide.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../website/content/warehouse-guide.md).
