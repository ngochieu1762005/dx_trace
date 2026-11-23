/* DX-TRACE | Read-only live OIDC and two-user verification.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function originOf(value){
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('HTTPS origin required');
  return u.origin;
}
export async function readCookie(file){
  if(!file)throw Error('Cookie file path is required');
  const path=resolve(file),info=await stat(path);
  if(!info.isFile()||(info.mode&0o077)!==0)throw Error('Cookie file must be a regular file with chmod 600 permissions');
  const cookie=(await readFile(path,'utf8')).trim();
  if(!cookie||cookie.length>16384||/[\r\n]/.test(cookie)||!cookie.includes('='))throw Error('Invalid cookie header file');
  return cookie;
}
export async function verifyOidc({appOrigin,idOrigin,ownerCookie,reviewerCookie,fetcher=fetch}){
  const app=originOf(appOrigin),id=originOf(idOrigin);
  const discovery=await fetcher(id+'/realms/warehouse/.well-known/openid-configuration',{redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(!discovery.ok)throw Error('Keycloak OIDC discovery unavailable');
  const metadata=await discovery.json();
  if(metadata.issuer!==id+'/realms/warehouse'||metadata.authorization_endpoint?.startsWith(id+'/')!==true)throw Error('Unexpected OIDC issuer');
  const anonymous=await fetcher(app+'/api/state',{redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(anonymous.status===200)throw Error('SECURITY: unauthenticated API unexpectedly accessible');
  if(![302,303,401,403].includes(anonymous.status))throw Error('Unexpected anonymous response: '+anonymous.status);
  async function state(cookie){
    const response=await fetcher(app+'/api/state',{headers:{cookie},redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(response.status!==200)throw Error('A verified login is required (HTTP '+response.status+')');
    const data=await response.json();
    if(!data.me?.email||!data.me?.role||!Array.isArray(data.members))throw Error('Unexpected authenticated state shape');
    return data;
  }
  const owner=await state(ownerCookie),reviewer=await state(reviewerCookie);
  // The independent static Quality Portal shares the same verified SSO session.
  const anonymousPortal=await fetcher(app+'/apps/quality/',{redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(anonymousPortal.status===200)throw Error('SECURITY: independent portal is publicly accessible');
  if(![302,303,401,403].includes(anonymousPortal.status))throw Error('Unexpected portal anonymous response: '+anonymousPortal.status);
  for(const cookie of [ownerCookie,reviewerCookie]){
    const portal=await fetcher(app+'/apps/quality/',{headers:{cookie},redirect:'manual',signal:AbortSignal.timeout(8000)});
    if(portal.status!==200||!(portal.headers.get('content-type')||'').includes('text/html')){
      throw Error('Quality Portal must be available through the same authenticated session');
    }
  }
  if(owner.me.role!=='owner')throw Error('First session must be workspace owner');
  if(!['manager','warehouse','viewer'].includes(reviewer.me.role))throw Error('Second session must have a non-owner role');
  if(owner.me.email.toLowerCase()===reviewer.me.email.toLowerCase())throw Error('Sessions must belong to two different people');
  if(!owner.members.some(m=>m.email?.toLowerCase()===reviewer.me.email.toLowerCase()))throw Error('Reviewer must belong to owner workspace');
  const forbidden=await fetcher(app+'/api/apps/plan',{
    method:'POST',headers:{cookie:reviewerCookie,'content-type':'application/json',origin:app,'sec-fetch-site':'same-origin'},
    body:'{}',redirect:'manual',signal:AbortSignal.timeout(8000)
  });
  if(forbidden.status!==403)throw Error('SECURITY: non-owner has unexpected AppKit plan access: '+forbidden.status);
  return {anonymous:anonymous.status,anonymousPortal:anonymousPortal.status,ownerRole:owner.me.role,reviewerRole:reviewer.me.role,sharedWorkspace:true,secondApplicationSSO:true,ownerOnlyPolicy:'denied'};
}
const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked){
  try{
    const {DX_VERIFY_APP_ORIGIN,DX_VERIFY_ID_ORIGIN,DX_VERIFY_OWNER_COOKIE_FILE,DX_VERIFY_REVIEWER_COOKIE_FILE}=process.env;
    const outcome=await verifyOidc({appOrigin:DX_VERIFY_APP_ORIGIN,idOrigin:DX_VERIFY_ID_ORIGIN,
      ownerCookie:await readCookie(DX_VERIFY_OWNER_COOKIE_FILE),
      reviewerCookie:await readCookie(DX_VERIFY_REVIEWER_COOKIE_FILE)});
    console.log('PASS OIDC issuer, anonymous deny, two sessions, shared workspace, two-app SSO, owner-only API deny');
    console.log(JSON.stringify(outcome));
  }catch(error){console.error('FAIL live SSO verification:',error?.message);process.exitCode=1;}
}