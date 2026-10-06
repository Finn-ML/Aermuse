import type { Request, Response } from "express";
import { createHash } from "crypto";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";

/**
 * HTTP media serving helpers.
 *
 * Replit's reverse proxy truncates large response bodies (~4MB), and Safari
 * refuses to play <video>/<audio> from servers that advertise
 * `Accept-Ranges: bytes` but answer Range requests with a full 200 body.
 * Media responses honor single ranges (206/416), cap requested chunks and
 * answer conditional requests with 304. Ordinary GET/HEAD responses describe
 * the whole object; normalized canvases fit below the proxy limit.
 */

export const DEFAULT_MAX_CHUNK_BYTES = 4 * 1024 * 1024;

export type RangeResolution =
  | { kind: "full" }
  | { kind: "partial"; start: number; end: number }
  | { kind: "unsatisfiable" };

/**
 * Resolve a request's Range header against a body of totalSize bytes.
 *
 * - No/malformed/multi-range header: serve the entire representation (200).
 * - Valid single range: clamp to the body and to maxChunkBytes.
 * - Range entirely past the end: unsatisfiable (416).
 */
export function resolveRange(
  rangeHeader: string | undefined,
  totalSize: number,
  maxChunkBytes: number = DEFAULT_MAX_CHUNK_BYTES
): RangeResolution {
  const noRangeResult = (): RangeResolution => ({ kind: "full" });

  if (!rangeHeader) return noRangeResult();

  if (totalSize === 0) return { kind: "unsatisfiable" };

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return noRangeResult(); // malformed or multi-range: ignore per RFC 9110
  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return noRangeResult();

  let start: number;
  let end: number;

  if (startStr === "") {
    // Suffix range: last N bytes
    const suffixLength = parseInt(endStr, 10);
    if (suffixLength === 0) return { kind: "unsatisfiable" };
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    if (start >= totalSize) return { kind: "unsatisfiable" };
    end = endStr === "" ? totalSize - 1 : Math.min(parseInt(endStr, 10), totalSize - 1);
    if (end < start) return noRangeResult(); // malformed: ignore
  }

  end = Math.min(end, start + maxChunkBytes - 1);
  return { kind: "partial", start, end };
}

/**
 * Cheap stable ETag from a cache key + size. Media paths are timestamped on
 * upload, so key+size identifies the content without hashing megabytes of
 * body per request (which is what express's default etag does).
 */
export function weakEtag(key: string, size: number): string {
  const hash = createHash("sha1").update(`${key}:${size}`).digest("base64url").slice(0, 24);
  return `W/"${hash}"`;
}

export interface SendMediaOptions {
  contentType: string;
  cacheControl: string;
  /** Stable identity of the content (e.g. its storage path) for ETag generation. */
  etagKey?: string;
  /** Cap on a single response body; keeps responses under the reverse-proxy limit. */
  maxChunkBytes?: number;
  /**
   * Whether to honor Range requests. Video/audio need it; plain images are
   * always served whole (browsers never range-request <img> content).
   */
  ranged?: boolean;
}

/**
 * Send a media buffer with correct conditional and range semantics.
 * Reports whether a response body starts at byte zero; this is not a unique
 * playback identifier. HEAD and 304 responses must not increment play counts.
 */
function prepareMedia(req: Request, res: Response, size: number, options: SendMediaOptions) {
  const { contentType, cacheControl, etagKey, maxChunkBytes = DEFAULT_MAX_CHUNK_BYTES, ranged = true } = options;
  const etag = etagKey ? weakEtag(etagKey, size) : undefined;
  res.set("Content-Type", contentType).set("Cache-Control", cacheControl);
  if (etag) res.set("ETag", etag);
  if (ranged) res.set("Accept-Ranges", "bytes");
  const matches = req.headers['if-none-match'];
  if (etag && matches && matches.split(',').some(t => t.trim() === '*' || t.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''))) {
    res.status(304).end();
    return null;
  }
  // Range applies to GET only. Weak validators cannot satisfy If-Range.
  const range = ranged && req.method !== 'HEAD' && !req.headers['if-range'] ? req.headers.range : undefined;
  const resolution = resolveRange(range, size, maxChunkBytes);
  if (resolution.kind === 'unsatisfiable') {
    res.status(416).set('Content-Range', `bytes */${size}`).end();
    return null;
  }
  const partial = resolution.kind === 'partial';
  const start = partial ? resolution.start : 0;
  const end = partial ? resolution.end : size - 1;
  res.status(partial ? 206 : 200).set('Content-Length', String(end - start + 1));
  if (partial) res.set('Content-Range', `bytes ${start}-${end}/${size}`);
  if (req.method === 'HEAD' || size === 0) { res.end(); return null; }
  return { start, end };
}

export function sendMediaBuffer(req: Request, res: Response, buffer: Buffer, options: SendMediaOptions): { servedFromStart: boolean } {
  const range = prepareMedia(req, res, buffer.length, options);
  if (!range) return { servedFromStart: false };
  res.end(buffer.subarray(range.start, range.end + 1));
  return { servedFromStart: range.start === 0 };
}

/** Stream from a pinned disk-cache entry; never allocate the full object in RAM. */
export async function sendMediaFile(req: Request, res: Response, file: { path: string; size: number }, options: SendMediaOptions): Promise<{ servedFromStart: boolean }> {
  const range = prepareMedia(req, res, file.size, options);
  if (!range) return { servedFromStart: false };
  try {
    await pipeline(createReadStream(file.path, range), res);
  } catch (error) {
    // A disconnected client is normal; release its cache lease without a second response.
    if (!res.destroyed) throw error;
    return { servedFromStart: false };
  }
  return { servedFromStart: range.start === 0 };
}

// ============================================
// In-memory media cache
// ============================================

interface CacheEntry {
  buffer: Buffer;
  lastAccess: number;
  storedAt: number;
}

export interface MediaCacheOptions {
  maxTotalBytes: number;
  maxEntryBytes: number;
  ttlMs: number;
}

/**
 * LRU byte cache over object storage with in-flight request coalescing.
 *
 * Media playback with 4MB response chunks means the same object is requested
 * many times per view; without this cache every chunk re-downloads the whole
 * file from object storage. Coalescing also stops a scroll burst (or a
 * browser's parallel range probes) from downloading the same object
 * concurrently N times.
 */
export class MediaCache {
  private entries = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<Buffer>>();
  private totalBytes = 0;

  constructor(private options: MediaCacheOptions) {}

  async get(key: string, loader: () => Promise<Buffer>): Promise<Buffer> {
    const existing = this.entries.get(key);
    if (existing) {
      if (Date.now() - existing.storedAt <= this.options.ttlMs) {
        existing.lastAccess = Date.now();
        return existing.buffer;
      }
      this.delete(key);
    }

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = loader().then(
      (buffer) => {
        this.inflight.delete(key);
        this.store(key, buffer);
        return buffer;
      },
      (error) => {
        this.inflight.delete(key);
        throw error;
      }
    );
    this.inflight.set(key, promise);
    return promise;
  }

  /** Drop a key (e.g. after the underlying object is replaced or deleted). */
  invalidate(keyPrefix: string): void {
    for (const key of Array.from(this.entries.keys())) {
      if (key.startsWith(keyPrefix)) this.delete(key);
    }
  }

  get size(): number {
    return this.totalBytes;
  }

  private store(key: string, buffer: Buffer): void {
    if (buffer.length > this.options.maxEntryBytes) return;
    if (this.entries.has(key)) this.delete(key);

    this.entries.set(key, { buffer, lastAccess: Date.now(), storedAt: Date.now() });
    this.totalBytes += buffer.length;
    this.evict();
  }

  private delete(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.totalBytes -= entry.buffer.length;
    this.entries.delete(key);
  }

  private evict(): void {
    if (this.totalBytes <= this.options.maxTotalBytes) return;

    const byAge = Array.from(this.entries.entries()).sort(
      (a, b) => a[1].lastAccess - b[1].lastAccess
    );
    for (const [key] of byAge) {
      if (this.totalBytes <= this.options.maxTotalBytes) break;
      this.delete(key);
    }
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Shared cache for public media (backgrounds, covers, thumbnails, previews). */
export const mediaCache = new MediaCache({
  maxTotalBytes: envInt("MEDIA_CACHE_MAX_MB", 160) * 1024 * 1024,
  maxEntryBytes: envInt("MEDIA_CACHE_MAX_ENTRY_MB", 48) * 1024 * 1024,
  ttlMs: envInt("MEDIA_CACHE_TTL_SECONDS", 900) * 1000,
});
