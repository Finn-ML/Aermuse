import type { Request, Response } from "express";
import { createHash } from "crypto";

/**
 * HTTP media serving helpers.
 *
 * Replit's reverse proxy truncates large response bodies (~4MB), and Safari
 * refuses to play <video>/<audio> from servers that advertise
 * `Accept-Ranges: bytes` but answer Range requests with a full 200 body.
 * Every media route therefore goes through sendMediaBuffer, which implements
 * real single-range semantics (206/416), caps each response body below the
 * proxy limit, and answers conditional requests with 304.
 */

export const DEFAULT_MAX_CHUNK_BYTES = 4 * 1024 * 1024;

export type RangeResolution =
  | { kind: "full" }
  | { kind: "partial"; start: number; end: number }
  | { kind: "unsatisfiable" };

/**
 * Resolve a request's Range header against a body of totalSize bytes.
 *
 * - No/malformed/multi-range header: serve from byte 0 (chunked to
 *   maxChunkBytes when the body is larger than one chunk).
 * - Valid single range: clamp to the body and to maxChunkBytes.
 * - Range entirely past the end: unsatisfiable (416).
 */
export function resolveRange(
  rangeHeader: string | undefined,
  totalSize: number,
  maxChunkBytes: number = DEFAULT_MAX_CHUNK_BYTES
): RangeResolution {
  const noRangeResult = (): RangeResolution =>
    totalSize <= maxChunkBytes
      ? { kind: "full" }
      : { kind: "partial", start: 0, end: maxChunkBytes - 1 };

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
 * Returns the byte offset served from (0 for full responses) so callers can
 * count plays/views only once per playback rather than once per chunk.
 */
export function sendMediaBuffer(
  req: Request,
  res: Response,
  buffer: Buffer,
  options: SendMediaOptions
): { servedFromStart: boolean } {
  const {
    contentType,
    cacheControl,
    etagKey,
    maxChunkBytes = DEFAULT_MAX_CHUNK_BYTES,
    ranged = true,
  } = options;

  const etag = etagKey ? weakEtag(etagKey, buffer.length) : undefined;

  res.set("Content-Type", contentType);
  res.set("Cache-Control", cacheControl);
  if (etag) res.set("ETag", etag);

  const rangeHeader = ranged ? (req.headers.range as string | undefined) : undefined;

  // Conditional GET: reply 304 for non-range revalidations.
  if (etag && !rangeHeader) {
    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch && ifNoneMatch.split(",").some((t) => t.trim() === etag)) {
      res.status(304).end();
      return { servedFromStart: true };
    }
  }

  if (!ranged) {
    res.set("Content-Length", buffer.length.toString());
    res.status(200).end(buffer);
    return { servedFromStart: true };
  }

  res.set("Accept-Ranges", "bytes");

  const resolution = resolveRange(rangeHeader, buffer.length, maxChunkBytes);

  if (resolution.kind === "unsatisfiable") {
    res.status(416).set("Content-Range", `bytes */${buffer.length}`).end();
    return { servedFromStart: false };
  }

  if (resolution.kind === "full") {
    res.set("Content-Length", buffer.length.toString());
    res.status(200).end(buffer);
    return { servedFromStart: true };
  }

  const { start, end } = resolution;
  res.status(206);
  res.set("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
  res.set("Content-Length", (end - start + 1).toString());
  res.end(buffer.subarray(start, end + 1));
  return { servedFromStart: start === 0 };
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
