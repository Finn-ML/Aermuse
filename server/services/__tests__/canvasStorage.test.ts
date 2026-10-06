import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
const sdk = vi.hoisted(() => ({ uploadFromBytes: vi.fn(), downloadAsStream: vi.fn() }));
vi.mock('@replit/object-storage', () => ({ Client: class { uploadFromBytes=sdk.uploadFromBytes; downloadAsStream=sdk.downloadAsStream; } }));
import { storeCanvasVideo } from '../canvasStorage';
import { sendStoredMedia } from '../fileStorage';
import { mediaDiskCache } from '../../lib/mediaDiskCache';
const video = { buffer: Buffer.alloc(16), format: 'webm' as const, duration: 8 };
beforeEach(() => { vi.clearAllMocks(); sdk.uploadFromBytes.mockResolvedValue({ok:true,value:null}); });
describe('canvas storage boundary', () => {
 it('publishes distinct desktop/mobile files and a complete backward-compatible manifest', async () => {
  const result=await storeCanvasVideo('user','page',{webm:video,mp4:{...video,format:'mp4'},mobile:{webm:video,mp4:{...video,format:'mp4'}},poster:Buffer.from('poster')});
  expect(sdk.uploadFromBytes).toHaveBeenCalledTimes(5);
  const paths=sdk.uploadFromBytes.mock.calls.map(c=>c[0]);expect(new Set(paths).size).toBe(5);
  expect(paths.filter(p=>p.includes('-mobile-'))).toHaveLength(2);
  expect(result).toMatchObject({version:1,duration:8});expect(result.mobile?.mp4).toContain('background-video-mobile-');expect(result.poster).toContain('poster');
 });
 it('does not publish a partial manifest if a storage write fails', async () => {
  sdk.uploadFromBytes.mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({error:{message:'unavailable'}});
  await expect(storeCanvasVideo('user','page',{webm:video,mp4:{...video,format:'mp4'},mobile:{webm:video,mp4:{...video,format:'mp4'}},poster:Buffer.from('poster')})).rejects.toThrow('unavailable');
 });
 it.each([[404,'NOT_FOUND'],[503,'SERVICE_UNAVAILABLE']])('preserves SDK stream error status %s',async(statusCode,code)=>{
  sdk.downloadAsStream.mockImplementation(()=>Readable.from((async function*(){throw {getRequestError:()=>({statusCode,message:'storage failure'})};})()));
  await expect(sendStoredMedia({} as any,{} as any,`bad-${statusCode}`,{contentType:'video/webm',cacheControl:'public'})).rejects.toMatchObject({code});
  expect(mediaDiskCache.size).toBe(0);
 });
});
