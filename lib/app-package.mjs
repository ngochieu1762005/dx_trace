/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {APP_API_VERSION} from './appkit.mjs';
import {bpmnToWorkflow} from './bpmn.mjs';
import {validateModel, PlatformError} from './platform.mjs';
import project from '../package.json' with {type:'json'};

const invalid = message => { throw new PlatformError(message, 422); };
const identifier = /^[a-z][a-z0-9]{0,15}$/;
const versionPattern = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const keys = (obj, allowed) => obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).every(k => allowed.includes(k));
export function compareVersions(a,b) {
  if (![a,b].every(v => typeof v === 'string' && versionPattern.test(v))) invalid('Expected a numeric major.minor.patch version');
  const right = b.split('.').map(Number);
  return a.split('.').map((v,i) => Number(v)-right[i]).find(Boolean) || 0;
}
export function resourcePaths(manifest) {
  const s = manifest?.spec;
  if (!keys(s,['requiresCore','schemas','workflows','permissions','routes','audit'])) invalid('Invalid package spec');
  for (const [group,ext] of [['schemas','json'],['workflows','bpmn']]) {
    const values = s[group];
    if (!Array.isArray(values) || values.length > 8 || (group==='schemas' && !values.length) ||
        new Set(values).size !== values.length || values.some(p => typeof p !== 'string' ||
        !new RegExp('^'+group+'/[a-z][a-z0-9]{0,15}\\.'+ext+'$').test(p))) invalid('Invalid '+group+' resource list');
  }
  return [...s.schemas,...s.workflows];
}
export function compilePackage(input) {
  const {manifest,files} = input || {};
  const paths = resourcePaths(manifest);
  if (!keys(input,['manifest','files']) || !keys(files,paths) || paths.some(p=>typeof files[p]!=='string') ||
      JSON.stringify(input).length>300000) invalid('Package resources missing or too large');
  if (!keys(manifest,['apiVersion','kind','metadata','spec']) || manifest.apiVersion!==APP_API_VERSION ||
      manifest.kind!=='Application' || !keys(manifest.metadata,['name','version'])) invalid('Expected dxtrace.io/v1 Application');
  const {name,version} = manifest.metadata, s = manifest.spec;
  if (typeof name!=='string' || !identifier.test(name) ||
      ['api','apps','oauth2','docs','demo','try','login','training','approvals','assets','fonts','shared','quality'].includes(name)) invalid('Reserved or invalid application name');
  compareVersions(version,version);
  const range = /^>=(\S+) <(\S+)$/.exec(s.requiresCore ?? '>=0.0.7 <1.0.0');
  if (!range || compareVersions(project.version,range[1])<0 || compareVersions(project.version,range[2])>=0) invalid('Incompatible Core '+project.version);
  if (!keys(s.audit,['enabled']) || s.audit.enabled!==true) invalid('Audit must be enabled');
  if (!Array.isArray(s.routes) || s.routes.length!==1 || !keys(s.routes[0],['path','service']) ||
      s.routes[0].path!=='/'+name || !['model-portal',name+'-portal'].includes(s.routes[0].service)) invalid('Invalid portal route or service');
  if (!Array.isArray(s.permissions) || new Set(s.permissions).size!==s.permissions.length) invalid('Invalid permissions');
  const permissions = new Set(s.permissions);
  const resources = s.schemas.map(p=>p.slice(8,-5));
  if (s.permissions.some(p=>typeof p!=='string'||!resources.some(r=>['read','create','approve'].some(a=>p===r+':'+a)))) invalid('Unknown resource permission');
  const workflows = new Map(s.workflows.map(path=>{
    const resource = path.slice(10,-5), parsed = bpmnToWorkflow(files[path]);
    if (!resources.includes(resource) || parsed.modelId!==resource || !permissions.has(resource+':approve')) invalid('Workflow must belong to a declared approval resource');
    return [resource,parsed.workflow];
  }));
  const models = s.schemas.map((path,i)=>{
    const resource=resources[i];
    let schema;
    try {schema=JSON.parse(files[path]);} catch {invalid('Invalid JSON in '+path);}
    if (!keys(schema,['name','fields','permissions']) || !keys(schema.permissions,['read','create','scope','scopeByRole'])) invalid('Expected DX-TRACE record schema in '+path);
    const canCreate=permissions.has(resource+':create');
    if (!permissions.has(resource+':read') && !canCreate && !permissions.has(resource+':approve')) invalid('Missing permission for '+resource);
    if (permissions.has(resource+':approve')!==workflows.has(resource)) invalid('Approval resource requires BPMN');
    return validateModel({id:'pkg_'+name+'_'+resource,name:schema.name,fields:schema.fields,
      permissions:{...schema.permissions,create:canCreate?schema.permissions.create:[]},
      workflow:workflows.get(resource) ?? {states:['active'],initial:'active',terminal:['active'],transitions:[]},
      application:{version}});
  });
  return {name,version,route:s.routes[0],permissions:[...permissions],models};
}
