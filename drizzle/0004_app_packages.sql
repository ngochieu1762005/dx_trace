-- SPDX-License-Identifier: MIT
-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
CREATE TABLE IF NOT EXISTS app_packages (
 workspace TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL,
 active INTEGER NOT NULL, versions TEXT NOT NULL,
 PRIMARY KEY(workspace,name)
);
CREATE TABLE IF NOT EXISTS app_package_models (
 workspace TEXT NOT NULL, model TEXT NOT NULL, package TEXT NOT NULL, archived TEXT,
 PRIMARY KEY(workspace,model)
);

CREATE TABLE IF NOT EXISTS native_review_requests (
 workspace TEXT NOT NULL, business_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
 creator TEXT NOT NULL, reference TEXT NOT NULL, instance_id TEXT UNIQUE,
 PRIMARY KEY(workspace,business_key)
);
