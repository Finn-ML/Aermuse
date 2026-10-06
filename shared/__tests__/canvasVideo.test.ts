import { describe, expect, it } from 'vitest';
import { parseCanvasVideo, selectCanvasSources } from '../canvasVideo';
describe('canvas manifests',()=>{
 it('preserves legacy sources on mobile',()=>{const v=parseCanvasVideo('{"webm":"old.webm","poster":"poster.jpg"}')!;expect(selectCanvasSources(v,true).webm).toBe('old.webm');});
 it('selects only mobile renditions when available',()=>{const v={webm:'desktop.webm',mp4:'desktop.mp4',mobile:{webm:'small.webm',mp4:'small.mp4'}};expect(selectCanvasSources(v,true)).toEqual(v.mobile);expect(selectCanvasSources(v,false)).toBe(v);});
 it('rejects malformed manifests and ignores invalid source values',()=>{for(const value of ['null','[]','invalid'])expect(parseCanvasVideo(value)).toBeNull();expect(parseCanvasVideo('{"webm":{},"mobile":{"mp4":42}}')?.webm).toBeUndefined();});
});
