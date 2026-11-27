/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 DX-TRACE contributors
export type Data = Record<string, string | number | boolean | null>;
export interface WriteResult { id: string; version: number }
export interface DXRecord<T extends Data = Data> extends WriteResult { model: string; status: string; data: T }
export interface Page<T extends Data = Data> { records: DXRecord<T>[]; page: { limit: number; offset: number; total: number; hasMore: boolean } }
export class DXTraceError extends Error { status: number; requestId: string | null }
export class DXTraceClient {
 constructor(config: { baseUrl: string; accessToken: string | (() => string | Promise<string>); fetcher?: typeof fetch });
 apps: { list(): Promise<{applications: unknown[]}> };
 models: { schema(model: string): Promise<{model: string; version: number; definition: unknown; openapi: unknown}> };
 records: {
  list<T extends Data = Data>(model: string, query?: {limit?: number; offset?: number; q?: string; status?: string}): Promise<Page<T>>;
  get<T extends Data = Data>(model: string, id: string): Promise<DXRecord<T>>;
  create(model: string, data: Data, idempotencyKey: string): Promise<WriteResult>;
 };
 tasks: { list(model:string,id:string):Promise<{tasks:{id:string;reasonRequired:boolean;process:boolean}[]}> };
 evidence: { list(model:string,id:string):Promise<{decisions:{id:string;occurred_at:string;signing_status:string;checkpoint:string|null}[]}> };
 workflow: { transition(model: string, id: string, input: {version: number; target: string; reason?: string}, idempotencyKey: string): Promise<WriteResult> };
}
