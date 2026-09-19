import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const mocks = vi.hoisted(() => ({ send: vi.fn(), config: vi.fn() }));
vi.mock('@aws-sdk/client-s3', async importOriginal => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  return { ...actual, S3Client: class {
    constructor(config: unknown) { mocks.config(config); }
    send = mocks.send;
  } };
});
import { WasabiStorage } from '../wasabiStorage';
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

const env = {
  WASABI_ACCESS_KEY: 'test-access', WASABI_SECRET_KEY: 'test-secret',
  WASABI_BUCKET: 'ExistingBucket', WASABI_ENDPOINT: 'https://s3.eu-west-1.wasabisys.com',
  WASABI_REGION: 'eu-west-1', WASABI_PREFIX: 'ws-514/app/',
};
let storage: WasabiStorage;
beforeEach(() => { vi.clearAllMocks(); mocks.send.mockReset(); storage = new WasabiStorage(env); });
afterEach(() => vi.unstubAllEnvs());

async function bytes(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe('Wasabi storage boundary', () => {
  it('fails clearly on missing configuration without exposing secrets', () => {
    expect(() => new WasabiStorage({ ...env, WASABI_BUCKET: '' })).toThrow('Missing: WASABI_BUCKET');
    expect(() => new WasabiStorage({ ...env, WASABI_PREFIX: '/' })).toThrow('application folder');
    expect(() => new WasabiStorage({ ...env, WASABI_ENDPOINT: 'http://example.com' })).toThrow('HTTPS');
    expect(() => new WasabiStorage({ ...env, WASABI_ENDPOINT: 'https://secret@example.com' })).toThrow('HTTPS');
    expect(mocks.config).toHaveBeenCalledWith(expect.objectContaining({ forcePathStyle: true, region: 'eu-west-1' }));
  });

  it('uploads with the tenant prefix, original bucket case, and content type', async () => {
    mocks.send.mockResolvedValue({});
    const data = Buffer.from('audio');
    expect((await storage.uploadFromBytes('tracks/u/t/original.MP3', data)).error).toBeUndefined();
    const command = mocks.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual(expect.objectContaining({ Bucket: 'ExistingBucket',
      Key: 'ws-514/app/tracks/u/t/original.MP3', Body: data, ContentLength: 5, ContentType: 'audio/mpeg' }));
  });

  it('reads existing relative paths without changing stored paths', async () => {
    mocks.send.mockResolvedValue({ Body: Readable.from([Buffer.from('one'), Buffer.from('two')]) });
    expect(await storage.downloadAsBytes('contracts/u/c/original.pdf')).toEqual({ value: [Buffer.from('onetwo')] });
    expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(mocks.send.mock.calls[0][0].input.Key).toBe('ws-514/app/contracts/u/c/original.pdf');
  });

  it('paginates listings and returns relative names usable for deletion', async () => {
    mocks.send.mockResolvedValueOnce({ Contents: [{ Key: 'ws-514/app/videos/u/v/one.mp4' }],
      IsTruncated: true, NextContinuationToken: 'next' })
      .mockResolvedValueOnce({ Contents: [{ Key: 'ws-514/app/videos/u/v/two.mp4' }, { Key: 'another-app/private' }], IsTruncated: false })
      .mockResolvedValue({});
    const result = await storage.list({ prefix: 'videos/u/v/' });
    expect(result.value).toEqual([{ name: 'videos/u/v/one.mp4' }, { name: 'videos/u/v/two.mp4' }]);
    expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command);
    expect(mocks.send.mock.calls[0][0].input.Prefix).toBe('ws-514/app/videos/u/v/');
    expect(mocks.send.mock.calls[1][0].input.ContinuationToken).toBe('next');
    await storage.delete(result.value![0].name);
    expect(mocks.send.mock.calls[2][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(mocks.send.mock.calls[2][0].input.Key).toBe('ws-514/app/videos/u/v/one.mp4');
  });

  it('does not silently return partial listings', async () => {
    mocks.send.mockResolvedValue({ IsTruncated: true });
    expect((await storage.list()).error?.message).toContain('incomplete object listing');
  });

  it('preserves binary streams and aborts the request when closed', async () => {
    const data = Buffer.from([0, 255, 128, 1]);
    mocks.send.mockResolvedValue({ Body: Readable.from([data]) });
    const stream = storage.downloadAsStream('tracks/u/t/original.wav');
    expect(stream).toBeInstanceOf(Readable);
    expect(await bytes(stream)).toEqual(data);
    expect(mocks.send.mock.calls[0][1].abortSignal.aborted).toBe(true);
  });

  it('surfaces asynchronous S3 and body failures to stream consumers', async () => {
    mocks.send.mockRejectedValueOnce(new Error('No such object (404)'));
    await expect(bytes(storage.downloadAsStream('missing'))).rejects.toThrow('404');
    mocks.send.mockResolvedValueOnce({ Body: Readable.from((async function* () {
      yield Buffer.from('partial'); throw new Error('connection lost');
    })()) });
    await expect(bytes(storage.downloadAsStream('broken'))).rejects.toThrow('connection lost');
  });

  it('downloads videos to disk for the existing processing pipeline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aermuse-storage-test-'));
    try {
      mocks.send.mockResolvedValue({ Body: Readable.from([Buffer.from('video')]) });
      const filename = join(dir, 'video.mp4');
      expect((await storage.downloadToFilename('videos/u/v/original.mp4', filename)).error).toBeUndefined();
      expect(await readFile(filename, 'utf8')).toBe('video');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('returns API failures through the existing result contract', async () => {
    const denied = new Error('Access denied');
    mocks.send.mockRejectedValue(denied);
    expect((await storage.uploadFromBytes('file', Buffer.from('x'))).error).toBe(denied);
    expect((await storage.downloadAsBytes('file')).error).toBe(denied);
    expect((await storage.delete('file')).error).toBe(denied);
  });

  it('rejects unsafe paths before issuing requests', async () => {
    for (const path of ['/file', '../file', 'folder/../file', '']) {
      expect((await storage.delete(path)).error).toBeDefined();
    }
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('keeps public service paths and signed-file URLs stable', async () => {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    mocks.send.mockResolvedValue({});
    const { uploadContractFile, getSignedPdfUrl, deleteDistributionFiles } = await import('../fileStorage');
    expect(await uploadContractFile('user', 'contract', Buffer.from('pdf'), 'pdf')).toEqual({
      path: 'contracts/user/contract/original.pdf', size: 3,
    });
    expect(await getSignedPdfUrl('signed/contract/file.pdf')).toBe('/api/files/signed/signed%2Fcontract%2Ffile.pdf');
    await deleteDistributionFiles('user', 'track');
    expect(mocks.send.mock.calls.at(-1)![0].input.Prefix).toBe('ws-514/app/distribution/user/track/');
  });
});
