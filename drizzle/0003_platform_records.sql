-- DX-TRACE | Indexed business records. SPDX-License-Identifier: MIT
-- Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
CREATE TABLE IF NOT EXISTS platform_models (
 workspace TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
 PRIMARY KEY(workspace,id)
);
CREATE TABLE IF NOT EXISTS platform_records (
 workspace TEXT NOT NULL, model TEXT NOT NULL, id TEXT NOT NULL,
 actor TEXT NOT NULL, status TEXT NOT NULL, updated TEXT NOT NULL,
 due_at TEXT, payload TEXT NOT NULL,
 PRIMARY KEY(workspace,model,id)
);
CREATE INDEX IF NOT EXISTS platform_records_status ON platform_records(workspace,model,status,updated DESC,id);
CREATE INDEX IF NOT EXISTS platform_records_actor ON platform_records(workspace,model,actor,updated DESC,id);
CREATE INDEX IF NOT EXISTS platform_records_due ON platform_records(workspace,due_at);
CREATE TABLE IF NOT EXISTS platform_commands (
 workspace TEXT NOT NULL, key TEXT NOT NULL, actor TEXT NOT NULL,
 fingerprint TEXT NOT NULL, result TEXT NOT NULL, created TEXT NOT NULL,
 PRIMARY KEY(workspace,key)
);
