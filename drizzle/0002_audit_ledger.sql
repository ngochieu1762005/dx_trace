-- SPDX-License-Identifier: MIT
-- Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
CREATE TABLE IF NOT EXISTS audit_ledger (
 workspace TEXT NOT NULL, seq INTEGER NOT NULL, previous TEXT NOT NULL,
 hash TEXT NOT NULL, payload TEXT NOT NULL, created TEXT NOT NULL,
 PRIMARY KEY (workspace, seq)
);
CREATE TABLE IF NOT EXISTS webhook_delivery (
 workspace TEXT NOT NULL, seq INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0, delivered TEXT, last_status INTEGER,
 PRIMARY KEY (workspace, seq)
);
