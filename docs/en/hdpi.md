# HDPI in DX-TRACE

Two stores have received chilled stock when a temperature excursion is discovered. The warehouse can follow one lot across all four H–P–D–I dimensions.

| Dimension | Where it appears |
| --- | --- |
| **H · Human** | Warehouse staff record deliveries, a reviewer assesses quality and a manager authorises quarantine and recall. |
| **P · Process** | A failed inspection can lead to an incident. Staff cancel outstanding reservations and collect delivered goods before closing it. |
| **D · Data** | The lot links supplier, expiry, readings, shipments, destinations and returns. Several lots can share one product barcode. |
| **I · Intelligence** | Temperature rules flag suspect stock. Delivery and return figures identify destinations with outstanding quantities. A manager owns the recall decision. |

## Reconcile the practice lot SUA-005

1. Select the practice warehouse and look up SUA-005 in traceability. Record its destinations and shipment references. Use the current figures if someone has already edited the sample workspace.
2. Open the recall and check its approval status. In the initial fixture, Long Biên received 30 units and returned 17. Tây Hồ received 20 and returned none. The two destinations still hold **13 + 20 = 33 units**.
3. Thanh Xuân has a separate reservation for 12 units. Cancel that undelivered shipment. Including it in the 33 would overstate the quantity outside the warehouse.
4. Compare each return with the shipment history, actor and timestamp. Keep the incident open while returns are outstanding. Check the lot status after closure before attempting another dispatch.

## Check the people involved

Use two accounts in the same SSO workspace to test the author and reviewer steps. The local demo provides a single owner identity for exploring quantities. To test inspection from the beginning, choose an active practice lot so that the failed inspection and the manager’s quarantine decision are visible as separate events.

[Receive and dispatch](warehouse-guide.md) · [Temperature rules](sensor-guide.md) · [Close a recall](recall-guide.md) · [Acceptance](evaluation.md)
