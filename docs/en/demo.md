<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Demo walkthrough

## Prepare the release candidate

Use tag `v0.2.0` at `00990ecd272648cbb6da808ab30a83d48ec163cd`. Record the output of `git rev-parse HEAD` and select the training workspace. Use a Keycloak deployment and two authorized accounts for the approval step.

## Suggested sequence

1. Enter the training workspace and confirm the selected data area.
2. Inspect lots, expiry and available stock; look up a barcode or scan a QR.
3. Open sample recall SUA-005. Initially 50 units were delivered, 17 returned and 33 outstanding; check current values before presenting.
4. Demonstrate an independently deployed Quality Portal and approval by a different authorized account.
5. Preview and install the maintenance AppKit or operations bundle, then create and transition a record.
6. Open the [competition entry](https://dxtrace.hieuds.com/en/olp/) and verify the synthetic release sample. Expect Ed25519 and six matching hashes. Verify the modified sample and identify the mismatch in `decision.json`.
7. Run `dxtrace app list`, open `/maintenance` and show the installed version. The CLI manages the package and the JavaScript SDK accesses records through the external API.

## Explore the expanded training warehouse

Training data edition 3 starts with 64 lots, 184 shipments, 22 partners, 17 probes and 344 readings. Dates are relative to the initial seed or upgrade. Existing practice records and operator changes are retained.

| Open a case | Follow the records |
| --- | --- |
| **DAU-101 · Strawberries** | Find the last three readings above 6 °C, then inspect the quarantine and destinations. |
| **SUA-005 · Strawberry yoghurt** | Reconcile 33 units outstanding and a separate reservation of 12 units. |
| **TOM-102 · Frozen prawns** | Check the two completed returns, cancelled reservation and closed incident. The lot remains blocked. |
| **TRA-101 through TRA-104 · Green tea** | Search for the internal product barcode to find all four batches and compare expiry dates. |

From the warehouse overview, **Mở hướng dẫn diễn tập** opens the case guide. The seven-day chart counts shipment records by UTC creation date. The dispatch shortlist shows the earliest-expiring active lots with stock available.

## Evidence

Record commit, roles, actual results and failures. A local demo does not establish production SSO or throughput.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/DEMO.md).
