import { afterEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { readFile, access } from 'node:fs/promises';
import { MediaDiskCache } from '../mediaDiskCache';
const caches: MediaDiskCache[] = [];
const make = (maxBytes = 100, maxEntryBytes = 60, ttlMs = 10000) => {
  const cache = new MediaDiskCache({ maxBytes, maxEntryBytes, ttlMs }); caches.push(cache); return cache;
};
const use = async (f: {path: string}) => (await readFile(f.path)).toString();
afterEach(async () => { vi.restoreAllMocks(); for (const c of caches.splice(0)) await c.dispose(); });
describe('MediaDiskCache', () => {
  it('coalesces concurrent requests and reuses large files beyond the old RAM cap', async () => {
    const cache = make(80*1024*1024, 60*1024*1024);
    const loader = vi.fn(() => Readable.from((function*(){ for(let i=0;i<52;i++) yield Buffer.alloc(1024*1024, i); })()));
    const inspect = async (f: {size:number}) => f.size;
    expect(await Promise.all([cache.withFile('big',loader,inspect),cache.withFile('big',loader,inspect)])).toEqual([52*1024*1024,52*1024*1024]);
    await cache.withFile('big',loader,inspect);
    expect(loader).toHaveBeenCalledTimes(1);
  });
  it('evicts old files and keeps actual disk usage within budget', async () => {
    const cache = make(); let old='';
    await cache.withFile('a',()=>Readable.from(Buffer.alloc(60)),async f=>{old=f.path;});
    await cache.withFile('b',()=>Readable.from(Buffer.alloc(50)),use);
    await expect(access(old)).rejects.toThrow(); expect(cache.size).toBe(50);
  });
  it('pins files during active responses rather than evicting beneath a reader', async () => {
    const cache = make(); let release!:()=>void; let started!:()=>void;
    const ready = new Promise<void>(r=>started=r);
    const first = cache.withFile('a',()=>Readable.from(Buffer.alloc(60)),async f=>{started();await new Promise<void>(r=>release=r);await access(f.path);});
    await ready;
    await expect(cache.withFile('b',()=>Readable.from(Buffer.alloc(60)),use)).rejects.toThrow('busy');
    release();await first;
    await cache.withFile('b',()=>Readable.from(Buffer.alloc(60)),use);
  });
  it('removes partial downloads and permits a retry after failures', async () => {
    const cache=make();
    await expect(cache.withFile('bad',()=>Readable.from((async function*(){yield Buffer.alloc(20);throw new Error('interrupted');})()),use)).rejects.toThrow('interrupted');
    expect(cache.size).toBe(0);
    expect(await cache.withFile('bad',()=>Readable.from('ok'),use)).toBe('ok');
  });
  it('rejects oversize streams before admitting them to the cache', async () => {
    const cache=make();await expect(cache.withFile('big',()=>Readable.from(Buffer.alloc(61)),use)).rejects.toThrow('exceeds');expect(cache.size).toBe(0);
  });
  it('releases the lease when a client fails so later entries can evict it', async () => {
    const cache=make();await expect(cache.withFile('a',()=>Readable.from(Buffer.alloc(60)),async()=>{throw new Error('client closed');})).rejects.toThrow();
    await cache.withFile('b',()=>Readable.from(Buffer.alloc(60)),use);expect(cache.size).toBe(60);
  });
  it('refreshes expired entries', async () => {
    let now=1000;vi.spyOn(Date,'now').mockImplementation(()=>now);
    const cache=make();const loader=vi.fn(()=>Readable.from('ok'));
    await cache.withFile('a',loader,use);now+=10001;await cache.withFile('a',loader,use);expect(loader).toHaveBeenCalledTimes(2);
  });
});
