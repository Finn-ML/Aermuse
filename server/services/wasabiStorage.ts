import {
  DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command,
  PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

type Result<T> = { value: T; error?: never } | { value?: never; error: Error };

const contentTypes: Record<string, string> = {
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mov': 'video/quicktime',
};

/** Keep application/database paths relative; add the tenant prefix only at the S3 boundary. */
export class WasabiStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const required = ['WASABI_ACCESS_KEY', 'WASABI_SECRET_KEY', 'WASABI_BUCKET',
      'WASABI_ENDPOINT', 'WASABI_REGION', 'WASABI_PREFIX'] as const;
    const missing = required.filter(name => !env[name]?.trim());
    if (missing.length) throw new Error(`Wasabi storage is not configured. Missing: ${missing.join(', ')}`);
    const endpoint = new URL(env.WASABI_ENDPOINT!.trim());
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
        endpoint.search || endpoint.hash || endpoint.pathname !== '/') {
      throw new Error('WASABI_ENDPOINT must be an HTTPS service origin.');
    }
    this.bucket = env.WASABI_BUCKET!.trim();
    this.prefix = env.WASABI_PREFIX!.trim().replace(/^\/+|\/+$/g, '') + '/';
    if (this.prefix === '/') throw new Error('WASABI_PREFIX must identify an application folder.');
    this.client = new S3Client({
      endpoint: endpoint.origin,
      region: env.WASABI_REGION!.trim(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.WASABI_ACCESS_KEY!.trim(),
        secretAccessKey: env.WASABI_SECRET_KEY!.trim(),
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  private key(path: string): string {
    if (!path || path.startsWith('/') || path.split('/').some(part => part === '..' || part === '.')) {
      throw new Error('Storage paths must be relative object keys without dot segments.');
    }
    return this.prefix + path;
  }

  private async result<T>(operation: () => Promise<T>): Promise<Result<T>> {
    try { return { value: await operation() }; }
    catch (error) { return { error: error instanceof Error ? error : new Error(String(error)) }; }
  }

  uploadFromBytes(path: string, buffer: Buffer): Promise<Result<void>> {
    return this.result(async () => {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket, Key: this.key(path), Body: buffer,
        ContentLength: buffer.length,
        ContentType: contentTypes[extname(path).toLowerCase()] || 'application/octet-stream',
      }));
    });
  }

  downloadAsBytes(path: string): Promise<Result<[Buffer]>> {
    return this.result(async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of this.downloadAsStream(path)) chunks.push(Buffer.from(chunk));
      return [Buffer.concat(chunks)];
    });
  }

  /** Return a stream synchronously, including asynchronous S3 errors through its error event. */
  downloadAsStream(path: string): Readable {
    const client = this.client;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: this.key(path) });
    const controller = new AbortController();
    const stream = Readable.from((async function* () {
      const response = await client.send(command, { abortSignal: controller.signal });
      if (!response.Body) throw new Error('Storage response has no body.');
      const body = response.Body as Readable;
      try { yield* body; }
      finally { body.destroy(); }
    })(), { objectMode: false });
    stream.once('close', () => controller.abort());
    return stream;
  }

  downloadToFilename(path: string, filename: string): Promise<Result<void>> {
    return this.result(() => pipeline(this.downloadAsStream(path), createWriteStream(filename)));
  }

  delete(path: string): Promise<Result<void>> {
    return this.result(async () => {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(path) }));
    });
  }

  list({ prefix = '' }: { prefix?: string } = {}): Promise<Result<{ name: string }[]>> {
    return this.result(async () => {
      const objects: { name: string }[] = [];
      let token: string | undefined;
      do {
        const page = await this.client.send(new ListObjectsV2Command({
          Bucket: this.bucket, Prefix: prefix ? this.key(prefix) : this.prefix,
          ContinuationToken: token,
        }));
        for (const object of page.Contents || []) {
          if (object.Key?.startsWith(this.prefix)) {
            objects.push({ name: object.Key.slice(this.prefix.length) });
          }
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
        if (page.IsTruncated && !token) throw new Error('Storage returned an incomplete object listing.');
      } while (token);
      return objects;
    });
  }
}
