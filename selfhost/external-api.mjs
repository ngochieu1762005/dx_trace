/* DX-TRACE | Versioned external OIDC API (v1 read-only; v2 opt-in).
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 *
 * Separate from the browser gateway. No static bearer tokens, forwarded
 * identity headers from callers, unrestricted writes, or Core token exposure.
 */
import {createServer} from 'node:http';
import {createPublicKey, verify as verifySignature, randomUUID, createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const MODEL=/^[a-z][a-z0-9_]{0,39}$/;
const CLIENT=/^[A-Za-z0-9._:-]{1,128}$/;
const MAX_TOKEN=8192;
const RESPONSE_LIMIT=6*1024*1024;
const hardFail=(message)=>{throw Error('External API config: '+message)};
const validOrigin=(value)=>{
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
    u.pathname.replace(/\/$/,'')!=='/realms/warehouse')hardFail('issuer must be HTTPS Keycloak warehouse realm');
 return u.origin+u.pathname.replace(/\/$/,'');
};

export function externalConfig(env=process.env,read=readFileSync){
 const appToken=env.DX_GATEWAY_APP_TOKEN;
 if(typeof appToken!=='string'||appToken.length<32)hardFail('strong internal app token required');
 const issuer=validOrigin(env.DX_EXTERNAL_ISSUER||'');
 const audience=env.DX_EXTERNAL_AUDIENCE;
 if(!CLIENT.test(audience||''))hardFail('explicit resource audience required');
 const url=new URL(env.DX_EXTERNAL_GATEWAY_URL||'http://gateway-api:8082');
 if(url.protocol!=='http:'||!['gateway-api','localhost','127.0.0.1'].includes(url.hostname)||
    url.username||url.password||url.search||url.hash||url.pathname!=='/')hardFail('private gateway upstream only');
 const filename=env.DX_EXTERNAL_CLIENTS_FILE;
 if(!filename||!filename.startsWith('/'))hardFail('absolute client policy file required');
 let doc;
 try{doc=JSON.parse(read(filename,'utf8'))}catch{hardFail('client policy file missing or invalid JSON')}
 if(!doc||![1,2].includes(doc.version)||!Array.isArray(doc.clients)||!doc.clients.length||doc.clients.length>100)
   hardFail('client policy version 1 or 2 with 1–100 clients required');
 const clients=new Map();
 for(const entry of doc.clients){
  if(!entry||!CLIENT.test(entry.clientId)||clients.has(entry.clientId)||
     !Array.isArray(entry.models)||!entry.models.length||entry.models.length>100||
     entry.models.some(m=>!MODEL.test(m))||new Set(entry.models).size!==entry.models.length||
     !Number.isSafeInteger(entry.requestsPerMinute)||entry.requestsPerMinute<1||entry.requestsPerMinute>1000)
     hardFail('invalid or duplicate client policy');
  const scopes=new Set(entry.scopes||[]);
  if(doc.version===2 && (!Array.isArray(entry.scopes)||!entry.scopes.includes('dxtrace.records.read')||
    entry.scopes.some(s=>!['dxtrace.records.read','dxtrace.records.create','dxtrace.records.transition','dxtrace.tasks.read','dxtrace.evidence.read'].includes(s))||
    typeof entry.workspace!=='string'||!/^[A-Za-z0-9:_-]{1,128}$/.test(entry.workspace))) hardFail('v2 requires an explicit workspace and scopes');
  if(entry.area!==undefined && !['live','training'].includes(entry.area))hardFail('Expected live or training area');
  clients.set(entry.clientId,{models:new Set(entry.models),limit:entry.requestsPerMinute,
    v2:doc.version===2,workspace:entry.workspace,area:entry.area||'live',scopes});
 }
 return {appToken,issuer,audience,upstream:url,clients};
}
const json=(res,status,error,requestId,extra={})=>{
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','x-request-id':requestId,...extra});
 res.end(JSON.stringify({error,requestId}));
};
const encoded=(obj)=>Buffer.from(JSON.stringify(obj)).toString('base64url');
const decode=(part)=>{
 if(typeof part!=='string'||!part||part.length>MAX_TOKEN||!/^[A-Za-z0-9_-]+$/.test(part))throw Error('Invalid JWT');
 const bytes=Buffer.from(part,'base64url');
 if(bytes.toString('base64url')!==part)throw Error('Invalid JWT encoding');
 return JSON.parse(bytes.toString('utf8'));
};
export function createExternalApi(config,{fetcher=fetch,clock=Date.now,audit=console.log}={}){
 const quota=new Map();
 let cachedKeys=new Map(),updated=0;
 const jwksUrl=config.issuer+'/protocol/openid-connect/certs';
 const refresh=async()=>{
  const response=await fetcher(jwksUrl,{redirect:'manual',signal:AbortSignal.timeout(6000)});
  if(response.status!==200||Number(response.headers.get('content-length')||0)>65536)throw Error('OIDC JWKS unavailable');
  const raw=await response.text();
  if(raw.length>65536)throw Error('JWKS too large');
  const doc=JSON.parse(raw),next=new Map();
  for(const jwk of doc.keys||[]){
   if(jwk.kty==='RSA'&&jwk.use!=='enc'&&jwk.alg!=='HS256'&&CLIENT.test(jwk.kid||'')&&
      typeof jwk.n==='string'&&typeof jwk.e==='string'&&jwk.n.length<2048&&jwk.e.length<32){
     try{next.set(jwk.kid,createPublicKey({key:jwk,format:'jwk'}));}catch{}
   }
  }
  if(!next.size||next.size>32)throw Error('No valid Keycloak signing keys');
  cachedKeys=next;updated=clock();
 };
 const authenticate=async(header)=>{
  if(typeof header!=='string'||!header.startsWith('Bearer ')||header.length>MAX_TOKEN)throw Error('Bearer token required');
  const token=header.slice(7),parts=token.split('.');
  if(parts.length!==3||parts.some(p=>!p))throw Error('Invalid JWT');
  const h=decode(parts[0]),p=decode(parts[1]);
  if(h.alg!=='RS256'||!CLIENT.test(h.kid||'')||h.crit||h.jku||h.jwk||h.x5u||h.x5c)throw Error('Unexpected JWT header');
  if(!cachedKeys.has(h.kid)&&clock()-updated<10000)throw Error('Unknown JWT key');
  if(!cachedKeys.has(h.kid)||clock()-updated>300000)await refresh();
  const key=cachedKeys.get(h.kid);
  if(!key||!verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url')))throw Error('Invalid JWT signature');
  const now=Math.floor(clock()/1000);
  if(p.iss!==config.issuer||!Number.isSafeInteger(p.exp)||p.exp<=now||
     (p.nbf!==undefined&&(!Number.isSafeInteger(p.nbf)||p.nbf>now+30))||
     (p.iat!==undefined&&(!Number.isSafeInteger(p.iat)||p.iat>now+30))||
     !(typeof p.aud==='string'?p.aud===config.audience:Array.isArray(p.aud)&&p.aud.includes(config.audience))||
     !CLIENT.test(p.azp||'')||!CLIENT.test(p.sub||'')||
     typeof p.email!=='string'||p.email.length>254||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)||p.email_verified!==true)
    throw Error('OIDC claims not authorized');
  if(!(p.scope||'').split(/\s+/).includes('dxtrace.records.read'))throw Error('Read scope required');
  const policy=config.clients.get(p.azp);
  if(!policy)throw Error('Client not registered');
  return {clientId:p.azp,subject:p.sub,email:p.email,policy,scopes:new Set(p.scope.split(/\s+/))};
 };
 return createServer(async(req,res)=>{
  const requestId=randomUUID(),started=clock();
  let clientId='unverified',status=500,route='unknown';
  try{
   if(!['GET','POST'].includes(req.method)){status=405;return json(res,status,'Method not allowed',requestId,{allow:'GET, POST'});}
   if(!req.url?.startsWith('/')||req.url.startsWith('//')||req.url.length>1024){status=400;return json(res,status,'Invalid target',requestId);}
   const url=new URL(req.url,'http://external.internal');
   route=url.pathname;
   if(url.origin!=='http://external.internal'){status=400;return json(res,status,'Invalid target',requestId);}
   const match=/^\/v1\/models\/([a-z][a-z0-9_]{0,39})\/records$/.exec(url.pathname);
   const v2=/^\/v2\/models\/([a-z][a-z0-9_]{0,39})\/(schema|records)(?:\/(REC-[a-f0-9-]{36})(\/(?:transition|tasks|evidence))?)?$/.exec(url.pathname);
   const apps=url.pathname==='/v2/apps';
   if(!match&&!v2&&!apps&&url.pathname!=='/v1/health'){status=404;return json(res,status,'Unknown version or route',requestId);}
   if(!v2&&!apps&&req.method!=='GET'){status=405;return json(res,status,'Read-only API',requestId,{allow:'GET'});}
   if(v2&&v2[2]==='schema'&&v2[3]){status=404;return json(res,status,'Unknown route',requestId);}
   const create=!!v2&&v2[2]==='records'&&!v2[3]&&req.method==='POST';
   const transition=v2?.[4]==='/transition'&&req.method==='POST';
   if((v2||apps)&&!(create||transition||req.method==='GET'&&v2?.[4]!=='/transition')){status=405;return json(res,status,'Method not allowed',requestId);}
   const list=!!match||!!v2&&v2[2]==='records'&&!v2[3]&&req.method==='GET';
   if([...url.searchParams.keys()].some(k=>!(list?['limit','offset','q','status']:[]).includes(k))||
      [...url.searchParams.keys()].some(k=>url.searchParams.getAll(k).length!==1)){
      status=400;return json(res,status,'Invalid query parameter',requestId);
   }
   const identity=await authenticate(req.headers.authorization).catch(()=>null);
   if(!identity){status=401;return json(res,status,'Unauthorized',requestId,
    {'www-authenticate':'Bearer realm="dxtrace", error="invalid_token"'});}
   clientId=identity.clientId;
   if((v2||apps)&&!identity.policy.v2){status=404;return json(res,status,'Unknown version or route',requestId);}
   const model=match?.[1]||v2?.[1];
   if(model&&!identity.policy.models.has(model)){status=403;return json(res,status,'Model not authorized for client',requestId);}
   if(v2||apps){
    const scope=create?'dxtrace.records.create':transition?'dxtrace.records.transition':v2?.[4]==='/tasks'?'dxtrace.tasks.read':v2?.[4]==='/evidence'?'dxtrace.evidence.read':'dxtrace.records.read';
    if(!identity.scopes.has(scope)||!identity.policy.scopes.has(scope)){status=403;return json(res,status,'Scope not authorized for client',requestId);}
   }
   if(url.pathname!=='/v1/health'){
    let q=quota.get(clientId);
    if(!q||clock()-q.start>=60000){q={start:clock(),count:0};quota.set(clientId,q);}
    if(++q.count>identity.policy.limit){status=429;return json(res,status,'Client quota exceeded',requestId,
     {'retry-after':String(Math.max(1,Math.ceil((60000-(clock()-q.start))/1000)))});
    }
   }
   let corePath='/api/health';
   const upstreamHeaders={'x-dx-core-token':config.appToken,'x-forwarded-user':identity.subject,
    'x-forwarded-email':identity.email,'x-request-id':requestId};
   let body;
   if(match||v2||apps){
    const params=new URLSearchParams(url.search);
    if(identity.policy.v2)params.set('workspace',identity.policy.workspace);
    if(identity.policy.area==='training')params.set('area','training');
    if(apps)params.set('models',[...identity.policy.models].join(','));
    corePath=(match?'/api/external-v1':'/api/external-v2')+url.pathname.slice(3)+(params.size?'?'+params:'');
    if(create||transition){
     const key=req.headers['idempotency-key'];
     if(typeof key!=='string'||!/^[A-Za-z0-9._:-]{1,100}$/.test(key)){status=400;return json(res,status,'Idempotency-Key required',requestId);}
     if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')){status=415;return json(res,status,'JSON required',requestId);}
     const chunks=[];let size=0;
     for await(const chunk of req){size+=chunk.length;if(size>65536){status=413;return json(res,status,'Request too large',requestId);}chunks.push(chunk);}
     try{body=JSON.stringify(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{status=400;return json(res,status,'Invalid JSON',requestId);}
     upstreamHeaders['content-type']='application/json';
     upstreamHeaders['idempotency-key']=createHash('sha256').update(JSON.stringify([identity.clientId,identity.subject,key])).digest('hex');
    }
   }
   const upstream=await fetcher(new URL(corePath,config.upstream),{
    method:req.method,headers:upstreamHeaders,body,redirect:'manual',signal:AbortSignal.timeout(10000)
   });
   if(upstream.status>=300&&upstream.status<400){status=502;return json(res,status,'Unexpected upstream redirect',requestId);}
   if(Number(upstream.headers.get('content-length')||0)>RESPONSE_LIMIT){status=502;return json(res,status,'Response too large',requestId);}
   const bytes=Buffer.from(await upstream.arrayBuffer());
   if(bytes.length>RESPONSE_LIMIT){status=502;return json(res,status,'Response too large',requestId);}
   status=upstream.status;
   const ct=upstream.headers.get('content-type')||'application/json';
   res.writeHead(status,{'content-type':ct,'cache-control':'no-store','x-content-type-options':'nosniff',
    'x-request-id':requestId}).end(bytes);
  }catch(error){
   status=error.message==='Bearer token required'||/JWT|OIDC|scope|required|registered|signature|Keycloak|JWKS|signing/.test(error.message)?401:502;
   json(res,status,status===401?'Unauthorized':'Upstream unavailable',requestId,
    status===401?{'www-authenticate':'Bearer realm="dxtrace", error="invalid_token"'}:{});
  }finally{
   audit(JSON.stringify({event:'external_api_request',requestId,clientId,route,status,durationMs:Math.max(0,clock()-started)}));
  }
 });
}
const invoked=process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url;
if(invoked){
 const config=externalConfig();
 createExternalApi(config).listen(Number(process.env.PORT||8093),process.env.BIND_ADDRESS||'127.0.0.1',
  ()=>console.log('DX-TRACE external OIDC API ready (v1 read-only; v2 opt-in)'));
}
