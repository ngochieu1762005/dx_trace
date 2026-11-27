<!-- SPDX-FileCopyrightText: 2026 DX-TRACE contributors
SPDX-License-Identifier: MIT
DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
-->
# Model governance and data quality

Models now support optional minLength/maxLength (text only, 1–4000 characters) and requiredWhen: {"field":"priority","equals":"Khẩn cấp"}. The server validates references and exact values, and rejects incompatible changes during the existing model plan. There is no arbitrary expression execution. OpenAPI exports conditional requirements as a vendor extension because the existing contract is OpenAPI 3.0.

GET /api/catalog/{model}/profile returns aggregated completeness counts and the latest update timestamp over records the caller is authorized to read. It uses the same workspace/model/owner scope as record listing, and does not expose record values. The operations console displays these counts on demand. Optional missing values are not necessarily errors; the profile reports presence, not validity or policy compliance. No claim of full runtime lineage or multi-tenant data warehouse is made.

The API and model regression suites cover visibility, missing values, conditional requirements, invalid schemas and rejection of incompatible changes.
