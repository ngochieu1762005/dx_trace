/* SPDX-License-Identifier: MIT */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('index.html',import.meta.url));
const router=process.env.DX_PORTAL_ROUTER==='1';
createServer(async(req,res)=>{
 if(req.method!=='GET')return res.writeHead(405).end();
 const reply=content=>res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}).end(content);
 if(req.url===(router?'/appkit-ui/model-portal':'/'))return reply(html);
 const service=router && /^\/appkit-ui\/([a-z][a-z0-9]{0,15}-portal)$/.exec(req.url)?.[1];
 if(!service)return res.writeHead(404).end();
 try{
   // The operator attaches static UI services to the isolated portal network.
   // Only HTML from a fixed port and path is fetched; credentials stay at the gateway.
   const page=await fetch('http://'+service+':8094/',{redirect:'error',signal:AbortSignal.timeout(4000)});
   if(!page.ok||!page.headers.get('content-type')?.startsWith('text/html'))return res.writeHead(503).end();
   const chunks=[];let size=0;
   for await(const chunk of page.body){size+=chunk.length;if(size>262144)throw Error('Portal page too large');chunks.push(chunk);}
   reply(Buffer.concat(chunks));
 }catch{res.writeHead(503).end();}
}).listen(Number(process.env.PORT||8094),'0.0.0.0');
