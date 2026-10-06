import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

interface Entry { path: string; size: number; touched: number; created: number; readers: number }
export class MediaCacheCapacityError extends Error {}

/** Stream once from storage to a private, bounded temporary cache; range reads use disk. */
export class MediaDiskCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<Entry>>();
  private directory?: Promise<string>;
  private queue: Promise<unknown> = Promise.resolve();
  private bytes = 0;
  constructor(private options: { maxBytes: number; maxEntryBytes: number; ttlMs: number; downloadTimeoutMs?: number }) {
    if (options.maxEntryBytes > options.maxBytes || options.maxEntryBytes <= 0) throw new Error('Invalid media cache budget');
  }

  async withFile<T>(key: string, loader: () => Readable, use: (file: { path: string; size: number }) => Promise<T>): Promise<T> {
    let entry = this.entries.get(key);
    if (entry && Date.now() - entry.created > this.options.ttlMs && !entry.readers) {
      // Loads and removals are serialized below; active readers retain their file.
      entry = undefined;
    }
    if (!entry) {
      let pending = this.pending.get(key);
      if (!pending) {
        pending = this.queue.then(() => this.load(key, loader));
        this.pending.set(key, pending);
        // Serialize cache misses to bound temporary files and upstream downloads.
        this.queue = pending.catch(() => {});
      }
      try { entry = await pending; }
      catch (error) { if (this.pending.get(key) === pending) this.pending.delete(key); throw error; }
    }
    entry.readers++;
    entry.touched = Date.now();
    this.pending.delete(key);
    try { return await use(entry); }
    finally { entry.readers--; }
  }

  private async remove(key: string, entry: Entry) {
    // Keep accounting intact if disk cleanup fails.
    await unlink(entry.path);
    this.entries.delete(key);
    this.bytes -= entry.size;
  }

  private async load(key: string, loader: () => Readable): Promise<Entry> {
    const old = this.entries.get(key);
    if (old) {
      if (old.readers || Date.now() - old.created <= this.options.ttlMs) return old;
      await this.remove(key, old);
    }
    // Reserve the maximum allowed file size before opening a download. Readers
    // pin their entry until the response finishes, so eviction cannot break it.
    for (const [name, entry] of Array.from(this.entries.entries()).sort((a, b) => a[1].touched - b[1].touched)) {
      if (this.bytes + this.options.maxEntryBytes <= this.options.maxBytes) break;
      if (!entry.readers && !this.pending.has(name)) await this.remove(name, entry);
    }
    if (this.bytes + this.options.maxEntryBytes > this.options.maxBytes) {
      throw new MediaCacheCapacityError('Media cache busy; retry shortly');
    }
    this.directory ??= mkdtemp(join(tmpdir(), 'aermuse-media-'));
    const path = join(await this.directory, randomUUID());
    let size = 0;
    const max = this.options.maxEntryBytes;
    const limit = new Transform({ transform(chunk, _encoding, callback) {
      size += chunk.length;
      callback(size > max ? new MediaCacheCapacityError('Media file exceeds cache limit') : null, chunk);
    } });
    try {
      await pipeline(loader(), limit, createWriteStream(path, { flags: 'wx', mode: 0o600 }), {
        signal: AbortSignal.timeout(this.options.downloadTimeoutMs ?? 120_000),
      });
      const entry = { path, size, created: Date.now(), touched: Date.now(), readers: 0 };
      this.entries.set(key, entry);
      this.bytes += size;
      return entry;
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
  }

  get size() { return this.bytes; }
  async dispose() {
    await this.queue;
    if (Array.from(this.entries.values()).some(e => e.readers)) throw new Error('Media cache still in use');
    if (this.directory) await rm(await this.directory, { recursive: true, force: true });
    this.entries.clear(); this.bytes = 0; this.directory = undefined;
  }
}

// Room for legacy canvas uploads, without buffering them in application RAM.
export const mediaDiskCache = new MediaDiskCache({
  maxBytes: 512 * 1024 * 1024, maxEntryBytes: 200 * 1024 * 1024, ttlMs: 15 * 60 * 1000,
});
