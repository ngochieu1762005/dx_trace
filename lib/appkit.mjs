/* DX-TRACE | Declarative application manifest format (no remote code execution)
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import {validateModel, PlatformError} from './platform.mjs';

export const APP_API_VERSION = 'dxtrace.io/v1';
const invalid = (message) => { throw new PlatformError('Application manifest: ' + message, 422); };
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
const limitedKeys = (obj, allow) =>
  object(obj) && Object.keys(obj).every((key) => allow.includes(key));
const nonempty = (v, max) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const version = (v) =>
  typeof v === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(v);

/**
 * A DX-TRACE application is a declarative record model plus an owned identity
 * and an explicit version. It cannot execute scripts, load remote UI code, or
 * bypass the model's existing tenant, role and workflow checks.
 */
export function manifestToModel(input) {
  if (!object(input) || JSON.stringify(input).length > 200_000 ||
      !limitedKeys(input, ['apiVersion','kind','metadata','spec']))
    invalid('Manifest phải là JSON object với các trường được hỗ trợ');
  if (input.apiVersion !== APP_API_VERSION || input.kind !== 'DeclarativeApplication')
    invalid('apiVersion hoặc kind không được hỗ trợ');
  if (!limitedKeys(input.metadata, ['id','name','version','description','uiPath']) ||
      !limitedKeys(input.spec, ['model']))
    invalid('Metadata hoặc spec có trường không được hỗ trợ');
  const m = input.metadata;
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(m.id) ||
      !nonempty(m.name, 200) || !version(m.version) ||
      (m.description !== undefined && (typeof m.description !== 'string' ||
       m.description.length > 500)))
    invalid('ID, tên, phiên bản hoặc mô tả không hợp lệ');
  if (m.uiPath !== undefined && m.uiPath !== '/apps/' + m.id + '/')
    invalid('uiPath phải là đường dẫn ứng dụng nội bộ đúng mã ứng dụng');
  const model = validateModel(input.spec.model);
  if (model.id !== m.id || model.name !== m.name)
    invalid('Định danh của manifest phải trùng mô hình');
  if (model.application && !limitedKeys(model.application, ['version','description','uiPath']))
    invalid('Thông tin ứng dụng trong mô hình không hợp lệ');
  return {
    ...model,
    application: {version:m.version, description:m.description||'', ...(m.uiPath ? {uiPath:m.uiPath} : {})}
  };
}

export function modelToManifest(model) {
  const definition = validateModel(model);
  const app = definition.application;
  if (app !== undefined && (!limitedKeys(app, ['version','description']) ||
      !version(app.version) || (app.description !== undefined &&
      (typeof app.description !== 'string' || app.description.length > 500))))
    invalid('Thông tin ứng dụng lưu trong mô hình không hợp lệ');
  if (app?.uiPath !== undefined && app.uiPath !== '/apps/' + definition.id + '/')
    invalid('Đường dẫn giao diện không hợp lệ');
  const metadata = {
    id:definition.id,
    name:definition.name,
    version:definition.application?.version || '0.0.0'
  };
  if (definition.application?.description) metadata.description =
    definition.application.description;
  if (definition.application?.uiPath) metadata.uiPath =
    definition.application.uiPath;
  const {application, ...cleanModel} = definition;
  return {
    apiVersion:APP_API_VERSION,
    kind:'DeclarativeApplication',
    metadata,
    spec:{model:cleanModel}
  };
}

export function listedApplication(model) {
  return {
    id:model.id,
    name:model.definition.name,
    appVersion:model.definition.application?.version || null,
    modelVersion:model.version,
    type:'declarative',
    entrypoint:model.definition.application?.uiPath || '/#platform'
  };
}
