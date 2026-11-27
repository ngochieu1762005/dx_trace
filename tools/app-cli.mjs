/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* SPDX-License-Identifier: MIT
 * SPDX-FileCopyrightText: 2026 DX-TRACE contributors */
import {readFile,realpath,mkdir,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {parse,stringify} from 'yaml';
import {compilePackage,resourcePaths} from '../lib/app-package.mjs';
import {workflowToBpmn} from '../lib/bpmn.mjs';

export async function loadPackage(directory) {
  const root=await realpath(directory);
  async function read(relative) {
    const file=await realpath(path.join(root,relative));
    const info=await stat(file);
    if(!file.startsWith(root+path.sep)||!info.isFile()||info.size>300000) throw Error('Invalid resource '+relative);
    return readFile(file,'utf8');
  }
  const manifest=parse(await read('app.yaml'),{maxAliasCount:0});
  const files={};
  for(const resource of resourcePaths(manifest)) files[resource]=await read(resource);
  const input={manifest,files};
  compilePackage(input);
  return input;
}
export async function scaffold(directory) {
  const name=path.basename(path.resolve(directory));
  const definition=JSON.parse(await readFile(new URL('../examples/maintenance/model.json',import.meta.url),'utf8'));
  definition.id=name;
  if(name!=='maintenance') definition.name=name;
  const {fields,permissions}=definition;
  const manifest={apiVersion:'dxtrace.io/v1',kind:'Application',metadata:{name,version:'1.0.0'},spec:{
    requiresCore:'>=0.0.7 <1.0.0',permissions:[name+':read',name+':create',name+':approve'],
    workflows:['workflows/'+name+'.bpmn'],schemas:['schemas/'+name+'.json'],
    routes:[{path:'/'+name,service:'model-portal'}],audit:{enabled:true}}};
  const files={['workflows/'+name+'.bpmn']:workflowToBpmn(definition),['schemas/'+name+'.json']:JSON.stringify({name:definition.name,fields,permissions},null,2)+'\n'};
  compilePackage({manifest,files});
  await mkdir(directory);
  for(const sub of ['schemas','workflows']) await mkdir(path.join(directory,sub));
  for(const [file,body] of Object.entries({'app.yaml':stringify(manifest),...files})) await writeFile(path.join(directory,file),body,{flag:'wx'});
  return {directory,name};
}
export async function appCommand([action,target,...extra]) {
  const usage='dxtrace app init|validate|install <directory> | list | upgrade <name> [directory] | rollback|uninstall <name>';
  if(!['init','validate','install','list','upgrade','rollback','uninstall'].includes(action) ||
      (action==='list'?target!==undefined:!target) || extra.length>(action==='upgrade'?1:0)) throw Error(usage);
  if(action==='init') return scaffold(target);
  const input=['validate','install','upgrade'].includes(action)?await loadPackage(extra[0]||target):null;
  if(action==='validate') {
    const {name,version,route,permissions}=compilePackage(input);
    return {valid:true,name,version,route,permissions};
  }
  const origin=new URL(process.env.DXTRACE_URL||'http://127.0.0.1:8080');
  if(origin.origin+ '/'!==origin.href || (origin.protocol!=='https:' && !(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)))) throw Error('DXTRACE_URL must be an HTTPS origin or loopback');
  const area=process.env.DXTRACE_AREA;
  if(area && !['training','live'].includes(area)) throw Error('Invalid DXTRACE_AREA');
  const request=async(endpoint,body)=>{
    const url=new URL('/api/packages'+endpoint,origin);
    if(area==='training') url.searchParams.set('area','training');
    const headers={accept:'application/json'};
    if(process.env.DXTRACE_COOKIE) headers.cookie=process.env.DXTRACE_COOKIE;
    if(body) headers['content-type']='application/json';
    const res=await fetch(url,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
    if(!res.headers.get('content-type')?.includes('application/json')) throw Error('Expected authenticated DX-TRACE JSON (HTTP '+res.status+')');
    const result=await res.json();
    if(!res.ok) throw Error(result.error||'HTTP '+res.status);
    return result;
  };
  if(action==='list') return request('');
  const name=input?.manifest.metadata.name||target;
  if(action==='upgrade'&&name!==target) throw Error('Upgrade name differs from package');
  const state=await request('/'+encodeURIComponent(name)+'/status');
  return request('/'+encodeURIComponent(name)+'/'+action,{revision:state.revision,...(input?{package:input}:{})});
}
