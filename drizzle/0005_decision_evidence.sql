-- SPDX-License-Identifier: MIT
-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
CREATE TABLE IF NOT EXISTS warehouse_commands (
 workspace TEXT NOT NULL, key TEXT NOT NULL, actor TEXT,
 fingerprint TEXT NOT NULL, result TEXT NOT NULL, created TEXT NOT NULL,
 PRIMARY KEY(workspace,key)
);
CREATE TABLE IF NOT EXISTS evidence_decisions (
 workspace TEXT NOT NULL, id TEXT NOT NULL, seq INTEGER NOT NULL,
 kind TEXT NOT NULL, subject_id TEXT NOT NULL, actor TEXT NOT NULL,
 occurred_at TEXT NOT NULL, policy_version TEXT NOT NULL, workflow_version TEXT NOT NULL,
 signing_status TEXT NOT NULL, public_key TEXT, checkpoint TEXT, payload TEXT NOT NULL,
 PRIMARY KEY(workspace,id), UNIQUE(workspace,seq)
);
CREATE TABLE IF NOT EXISTS native_review_actions (
 workspace TEXT NOT NULL, task_id TEXT NOT NULL, instance_id TEXT NOT NULL,
 actor TEXT NOT NULL, subject TEXT NOT NULL, actor_label TEXT NOT NULL,
 role TEXT NOT NULL, fingerprint TEXT NOT NULL, step TEXT NOT NULL,
 approved INTEGER NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 created TEXT NOT NULL, completed TEXT,
 PRIMARY KEY(workspace,task_id)
);
CREATE TABLE IF NOT EXISTS event_outbox (
 workspace TEXT NOT NULL, seq INTEGER NOT NULL,
 topic TEXT NOT NULL DEFAULT 'audit.event', payload TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 due_at INTEGER NOT NULL DEFAULT 0, lease_token TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0, last_error TEXT, last_status INTEGER,
 created TEXT NOT NULL, delivered_at TEXT,
 PRIMARY KEY(workspace,seq)
);
CREATE INDEX IF NOT EXISTS event_outbox_due ON event_outbox(workspace,state,due_at,seq);
