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

## Evidence

Record commit, roles, actual results and failures. A local demo does not establish production SSO or throughput.

## Full source and translation status

This English edition is a curated guide, not a line-for-line translation. For exact implementation details, see the [canonical source](../../docs/DEMO.md).
