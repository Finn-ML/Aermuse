import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import ffprobe from '@ffprobe-installer/ffprobe';
import { processCanvasVideo, CANVAS_MAX_BYTES, CANVAS_MAX_INPUT_BYTES } from '../videoProcessor';
const exec=promisify(execFile);let dir:string;
beforeAll(async()=>{dir=await mkdtemp(join(tmpdir(),'canvas-test-'));});
afterAll(async()=>{await rm(dir,{recursive:true,force:true});});
async function probe(path:string){const {stdout}=await exec(ffprobe.path,['-v','error','-show_streams','-show_format','-of','json',path]);return JSON.parse(stdout);}
describe('real canvas encoders',()=>{
 for(const format of ['mp4','mov','webm'] as const){
  it(`normalizes 4K/60fps ${format}, including WebM, to bounded silent desktop/mobile clips`,async()=>{
   const input=join(dir,`input.${format}`);
   await exec(ffmpeg.path,['-v','error','-f','lavfi','-i','color=c=purple:s=3840x2160:r=60','-f','lavfi','-i','sine=frequency=220','-t','9','-c:v',format==='webm'?'libvpx-vp9':'libx264',...(format==='webm'?['-deadline','realtime','-cpu-used','8']:['-preset','ultrafast']),'-threads','2','-c:a',format==='webm'?'libopus':'aac',input]);
   const output=await processCanvasVideo(await readFile(input),format,{generateFallback:false});
   expect(output.poster.subarray(0,2)).toEqual(Buffer.from([255,216]));
   for(const [name,video] of Object.entries({desktopWebm:output.webm,desktopMp4:output.mp4,mobileWebm:output.mobile.webm,mobileMp4:output.mobile.mp4})){
    expect(video.buffer.length).toBeLessThanOrEqual(CANVAS_MAX_BYTES);
    const path=join(dir,`${format}-${name}.${video.format}`);await writeFile(path,video.buffer);const meta=await probe(path);const stream=meta.streams.find((s:any)=>s.codec_type==='video');
    expect(Number(meta.format.duration)).toBeLessThanOrEqual(8.05);expect(stream.width).toBe(name.startsWith('mobile')?1280:1920);expect(stream.height).toBe(name.startsWith('mobile')?720:1080);
    expect(stream.r_frame_rate).toBe('30/1');expect(stream.pix_fmt).toBe('yuv420p');expect(meta.streams.some((s:any)=>s.codec_type==='audio')).toBe(false);
    expect(stream.codec_name).toBe(video.format==='webm'?'vp9':'h264');
   }
  },120000);
 }
 it('preserves portrait orientation and applies an actual nonzero trim',async()=>{
  const input=join(dir,'portrait.mp4');await exec(ffmpeg.path,['-v','error','-f','lavfi','-i','color=c=red:s=1080x1920:r=30','-t','10','-c:v','libx264','-preset','ultrafast',input]);
  const output=await processCanvasVideo(await readFile(input),'mp4',{startTime:7});expect(output.webm.duration).toBe(3);
  const path=join(dir,'portrait-mobile.mp4');await writeFile(path,output.mobile.mp4.buffer);const meta=await probe(path);expect(meta.streams[0].width).toBe(720);expect(meta.streams[0].height).toBe(1280);expect(Number(meta.format.duration)).toBeLessThanOrEqual(3.05);
 },60000);
 it('rejects oversized, corrupt inputs and invalid trim positions',async()=>{
  await expect(processCanvasVideo(Buffer.alloc(CANVAS_MAX_INPUT_BYTES+1),'webm')).rejects.toThrow('100 MiB');
  await expect(processCanvasVideo(Buffer.from('not a video'),'webm')).rejects.toThrow();
  await expect(processCanvasVideo(Buffer.from('x'),'webm',{startTime:NaN})).rejects.toThrow('start time');
 });
});
