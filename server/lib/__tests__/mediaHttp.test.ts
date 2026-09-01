import { describe, it, expect, vi } from "vitest";
import { resolveRange, weakEtag, MediaCache, sendMediaBuffer, DEFAULT_MAX_CHUNK_BYTES } from "../mediaHttp";
import type { Request, Response } from "express";

const MB = 1024 * 1024;

describe("resolveRange", () => {
  it("serves small bodies whole when no Range header is present", () => {
    expect(resolveRange(undefined, 1000)).toEqual({ kind: "full" });
  });

  it("chunks large bodies even without a Range header (reverse proxy limit)", () => {
    expect(resolveRange(undefined, 10 * MB)).toEqual({
      kind: "partial",
      start: 0,
      end: DEFAULT_MAX_CHUNK_BYTES - 1,
    });
  });

  it("honors an open-ended range (Safari's first probe is bytes=0-1)", () => {
    expect(resolveRange("bytes=0-1", 10 * MB)).toEqual({ kind: "partial", start: 0, end: 1 });
    expect(resolveRange("bytes=0-", 1000)).toEqual({ kind: "partial", start: 0, end: 999 });
  });

  it("clamps ranges to the chunk cap", () => {
    const result = resolveRange(`bytes=${MB}-`, 20 * MB);
    expect(result).toEqual({
      kind: "partial",
      start: MB,
      end: MB + DEFAULT_MAX_CHUNK_BYTES - 1,
    });
  });

  it("clamps the end to the body size", () => {
    expect(resolveRange("bytes=500-99999", 1000)).toEqual({ kind: "partial", start: 500, end: 999 });
  });

  it("supports suffix ranges", () => {
    expect(resolveRange("bytes=-100", 1000)).toEqual({ kind: "partial", start: 900, end: 999 });
    expect(resolveRange("bytes=-5000", 1000)).toEqual({ kind: "partial", start: 0, end: 999 });
  });

  it("returns unsatisfiable for ranges past the end", () => {
    expect(resolveRange("bytes=1000-", 1000)).toEqual({ kind: "unsatisfiable" });
    expect(resolveRange("bytes=-0", 1000)).toEqual({ kind: "unsatisfiable" });
    expect(resolveRange("bytes=0-", 0)).toEqual({ kind: "unsatisfiable" });
  });

  it("ignores malformed or multi-range headers", () => {
    expect(resolveRange("bytes=abc", 1000)).toEqual({ kind: "full" });
    expect(resolveRange("bytes=0-100,200-300", 1000)).toEqual({ kind: "full" });
    expect(resolveRange("bytes=500-100", 1000)).toEqual({ kind: "full" });
    expect(resolveRange("items=0-10", 1000)).toEqual({ kind: "full" });
  });

  it("respects a custom chunk cap", () => {
    expect(resolveRange("bytes=0-", 1000, 100)).toEqual({ kind: "partial", start: 0, end: 99 });
  });
});

describe("weakEtag", () => {
  it("is stable for the same key and size", () => {
    expect(weakEtag("a/b/c.webm", 1234)).toBe(weakEtag("a/b/c.webm", 1234));
  });

  it("differs when key or size changes", () => {
    expect(weakEtag("a.webm", 100)).not.toBe(weakEtag("a.webm", 101));
    expect(weakEtag("a.webm", 100)).not.toBe(weakEtag("b.webm", 100));
  });

  it("is a weak validator", () => {
    expect(weakEtag("x", 1)).toMatch(/^W\/"[A-Za-z0-9_-]+"$/);
  });
});

function makeRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: Buffer | undefined;
  const res = {
    set: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return res;
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    end: vi.fn((data?: Buffer) => {
      body = data;
      return res;
    }),
  };
  return {
    res: res as unknown as Response,
    get headers() {
      return headers;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

function makeReq(headers: Record<string, string> = {}) {
  return { headers } as unknown as Request;
}

describe("sendMediaBuffer", () => {
  const buffer = Buffer.from("0123456789");
  const options = { contentType: "video/webm", cacheControl: "public, max-age=60", etagKey: "k" };

  it("serves a full 200 with Accept-Ranges for range-less requests", () => {
    const ctx = makeRes();
    const { servedFromStart } = sendMediaBuffer(makeReq(), ctx.res, buffer, options);

    expect(ctx.statusCode).toBe(200);
    expect(ctx.headers["accept-ranges"]).toBe("bytes");
    expect(ctx.headers["content-length"]).toBe("10");
    expect(ctx.body?.toString()).toBe("0123456789");
    expect(servedFromStart).toBe(true);
  });

  it("serves 206 with Content-Range for range requests", () => {
    const ctx = makeRes();
    const { servedFromStart } = sendMediaBuffer(makeReq({ range: "bytes=2-5" }), ctx.res, buffer, options);

    expect(ctx.statusCode).toBe(206);
    expect(ctx.headers["content-range"]).toBe("bytes 2-5/10");
    expect(ctx.headers["content-length"]).toBe("4");
    expect(ctx.body?.toString()).toBe("2345");
    expect(servedFromStart).toBe(false);
  });

  it("serves 416 for unsatisfiable ranges", () => {
    const ctx = makeRes();
    sendMediaBuffer(makeReq({ range: "bytes=100-" }), ctx.res, buffer, options);

    expect(ctx.statusCode).toBe(416);
    expect(ctx.headers["content-range"]).toBe("bytes */10");
    expect(ctx.body).toBeUndefined();
  });

  it("answers matching If-None-Match with 304", () => {
    const etag = weakEtag("k", buffer.length);
    const ctx = makeRes();
    sendMediaBuffer(makeReq({ "if-none-match": etag }), ctx.res, buffer, options);

    expect(ctx.statusCode).toBe(304);
    expect(ctx.body).toBeUndefined();
  });

  it("ignores If-None-Match when it does not match", () => {
    const ctx = makeRes();
    sendMediaBuffer(makeReq({ "if-none-match": 'W/"nope"' }), ctx.res, buffer, options);
    expect(ctx.statusCode).toBe(200);
    expect(ctx.body?.toString()).toBe("0123456789");
  });

  it("never chunks when ranged is disabled (images)", () => {
    const big = Buffer.alloc(5 * MB, 1);
    const ctx = makeRes();
    sendMediaBuffer(makeReq({ range: "bytes=0-1" }), ctx.res, big, { ...options, ranged: false });

    expect(ctx.statusCode).toBe(200);
    expect(ctx.headers["accept-ranges"]).toBeUndefined();
    expect(ctx.body?.length).toBe(5 * MB);
  });
});

describe("MediaCache", () => {
  const opts = { maxTotalBytes: 100, maxEntryBytes: 50, ttlMs: 10_000 };

  it("caches loads and serves subsequent hits without the loader", async () => {
    const cache = new MediaCache(opts);
    const loader = vi.fn().mockResolvedValue(Buffer.from("data"));

    await cache.get("a", loader);
    const second = await cache.get("a", loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(second.toString()).toBe("data");
  });

  it("coalesces concurrent loads of the same key", async () => {
    const cache = new MediaCache(opts);
    let resolveLoad!: (b: Buffer) => void;
    const loader = vi.fn(
      () => new Promise<Buffer>((resolve) => (resolveLoad = resolve))
    );

    const first = cache.get("a", loader);
    const second = cache.get("a", loader);
    resolveLoad(Buffer.from("x"));

    expect((await first).toString()).toBe("x");
    expect((await second).toString()).toBe("x");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache failed loads", async () => {
    const cache = new MediaCache(opts);
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(Buffer.from("ok"));

    await expect(cache.get("a", loader)).rejects.toThrow("boom");
    expect((await cache.get("a", loader)).toString()).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("skips caching entries above the per-entry cap", async () => {
    const cache = new MediaCache(opts);
    const loader = vi.fn().mockResolvedValue(Buffer.alloc(60));

    await cache.get("big", loader);
    await cache.get("big", loader);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(cache.size).toBe(0);
  });

  it("evicts least-recently-used entries beyond the total cap", async () => {
    vi.useFakeTimers();
    try {
      const cache = new MediaCache(opts);
      const load = (label: string, size: number) => cache.get(label, async () => Buffer.alloc(size));

      await load("a", 40);
      vi.advanceTimersByTime(10);
      await load("b", 40);
      vi.advanceTimersByTime(10);
      await cache.get("a", async () => Buffer.alloc(40)); // touch "a" so "b" is LRU
      vi.advanceTimersByTime(10);
      await load("c", 40); // exceeds 100 total -> evict "b"

      const loaderA = vi.fn().mockResolvedValue(Buffer.alloc(1));
      const loaderB = vi.fn().mockResolvedValue(Buffer.alloc(1));
      await cache.get("a", loaderA);
      await cache.get("b", loaderB);

      expect(loaderA).not.toHaveBeenCalled();
      expect(loaderB).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("expires entries after the TTL", async () => {
    vi.useFakeTimers();
    try {
      const cache = new MediaCache(opts);
      const loader = vi.fn().mockResolvedValue(Buffer.from("x"));

      await cache.get("a", loader);
      vi.advanceTimersByTime(11_000);
      await cache.get("a", loader);

      expect(loader).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidates entries by prefix", async () => {
    const cache = new MediaCache(opts);
    await cache.get("videos/u1/v1/original.mp4", async () => Buffer.alloc(10));
    await cache.get("videos/u1/v2/original.mp4", async () => Buffer.alloc(10));

    cache.invalidate("videos/u1/v1");

    const loader = vi.fn().mockResolvedValue(Buffer.alloc(10));
    await cache.get("videos/u1/v1/original.mp4", loader);
    expect(loader).toHaveBeenCalledTimes(1);

    const loader2 = vi.fn().mockResolvedValue(Buffer.alloc(10));
    await cache.get("videos/u1/v2/original.mp4", loader2);
    expect(loader2).not.toHaveBeenCalled();
  });
});
