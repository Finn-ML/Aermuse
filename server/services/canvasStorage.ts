import type { CanvasVideoResult } from './videoProcessor';
import type { CanvasVideoData } from '@shared/canvasVideo';
import { uploadBackgroundVideo, uploadBackgroundVideoPoster } from './fileStorage';

/** Shared by direct and chunked uploads so both publish the same manifest. */
export async function storeCanvasVideo(userId: string, pageId: string, video: CanvasVideoResult): Promise<CanvasVideoData> {
  const url = (path: string) => `/api/landing-page/background-video/${encodeURIComponent(path)}`;
  const desktopWebm = await uploadBackgroundVideo(userId, pageId, video.webm.buffer, 'webm');
  const desktopMp4 = await uploadBackgroundVideo(userId, pageId, video.mp4.buffer, 'mp4');
  const mobileWebm = await uploadBackgroundVideo(userId, pageId, video.mobile.webm.buffer, 'webm', 'mobile');
  const mobileMp4 = await uploadBackgroundVideo(userId, pageId, video.mobile.mp4.buffer, 'mp4', 'mobile');
  const poster = await uploadBackgroundVideoPoster(userId, pageId, video.poster);
  return { version: 1, webm: url(desktopWebm.path), mp4: url(desktopMp4.path),
    mobile: { webm: url(mobileWebm.path), mp4: url(mobileMp4.path) },
    poster: url(poster.path), duration: video.webm.duration };
}
