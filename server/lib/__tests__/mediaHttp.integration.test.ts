import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { Readable } from 'node:stream';
import { MediaDiskCache } from '../mediaDiskCache';
import { sendMediaFile } from '../mediaHttp';
let server:Server;let url:string;let loads=0;
const requests = new Set<Promise<unknown>>();
const size=52*1024*1024;
const cache=new MediaDiskCache({maxBytes:80*1024*1024,maxEntryBytes:60*1024*1024,ttlMs:10000});
beforeAll(async()=>{
 const app=express();app.get('/canvas',async(req,res,next)=>{
  try{const request = cache.withFile('canvas',()=>{loads++;return Readable.from((function*(){for(let i=0;i<52;i++)yield Buffer.alloc(1024*1024,i);})());},f=>sendMediaFile(req,res,f,{contentType:'video/mp4',cacheControl:'public, max-age=60',etagKey:'canvas'})); requests.add(request); try { await request; } finally { requests.delete(request); }}catch(e){next(e);}
 });
 server=createServer(app);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${(server.address() as any).port}/canvas`;
});
afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));await Promise.allSettled(Array.from(requests));await cache.dispose();});
describe('real HTTP range delivery',()=>{
 it('supports Safari probes and successive chunks with one storage read',async()=>{
  let r=await fetch(url,{headers:{Range:'bytes=0-1'}});expect(r.status).toBe(206);expect(r.headers.get('content-range')).toBe(`bytes 0-1/${size}`);expect((await r.arrayBuffer()).byteLength).toBe(2);
  r=await fetch(url,{headers:{Range:'bytes=4194304-'}});expect(r.status).toBe(206);const body=new Uint8Array(await r.arrayBuffer());expect(body.length).toBe(4*1024*1024);expect(body[0]).toBe(4);expect(loads).toBe(1);
 });
 it('returns the complete body for ordinary GET and accurate HEAD metadata',async()=>{
  const h=await fetch(url,{method:'HEAD',headers:{Range:'bytes=0-1'}});expect(h.status).toBe(200);expect(h.headers.get('content-length')).toBe(String(size));expect((await h.arrayBuffer()).byteLength).toBe(0);
  const r=await fetch(url);expect(r.status).toBe(200);expect((await r.arrayBuffer()).byteLength).toBe(size);expect(loads).toBe(1);
 });
 it('honors conditional requests, suffix ranges and unsatisfiable ranges',async()=>{
  const h=await fetch(url,{method:'HEAD'});const etag=h.headers.get('etag')!;
  let r=await fetch(url,{headers:{'If-None-Match':etag,Range:'bytes=0-1'}});expect(r.status).toBe(304);
  r=await fetch(url,{headers:{Range:'bytes=-2'}});expect(r.status).toBe(206);expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([51,51]);
  r=await fetch(url,{headers:{Range:`bytes=${size}-`}});expect(r.status).toBe(416);
 });
 it('does not honor weak If-Range as a strong validator',async()=>{
  const h=await fetch(url,{method:'HEAD'});const r=await fetch(url,{headers:{Range:'bytes=0-1','If-Range':h.headers.get('etag')!}});expect(r.status).toBe(200);expect((await r.arrayBuffer()).byteLength).toBe(size);
 });
});
