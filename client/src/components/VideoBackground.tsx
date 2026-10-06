import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { selectCanvasSources, type CanvasVideoData } from '@shared/canvasVideo';

function preferMobileCanvas() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return window.matchMedia('(max-width: 767px)').matches || !!connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '');
}

export function VideoBackground({ videoData }: { videoData: CanvasVideoData }) {
  // Pick once per page mount: resizing does not waste bandwidth downloading a second rendition.
  const [mobile] = useState(() => typeof window !== 'undefined' && preferMobileCanvas());
  const reducedMotion = useReducedMotion();
  const sources = selectCanvasSources(videoData, mobile);
  // Changed artist/source resets failed/ready state and the video element.
  return <CanvasPlayback key={JSON.stringify([sources, videoData.poster, reducedMotion])}
    videoData={{ ...sources, poster: videoData.poster }} reducedMotion={!!reducedMotion} />;
}

function CanvasPlayback({ videoData, reducedMotion }: { videoData: CanvasVideoData; reducedMotion: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const sources = [
    videoData.webm && { src: videoData.webm, type: 'video/webm' },
    videoData.mp4 && { src: videoData.mp4, type: 'video/mp4' },
  ].filter(Boolean) as { src: string; type: string }[];
  const showVideo = !reducedMotion && !failed && sources.length > 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo) return;
    let disposed = false;
    let visible = true;
    let gesturePending = false;
    const cleanupGesture = () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      gesturePending = false;
    };
    const tryPlay = () => {
      if (disposed || document.hidden || !visible) return;
      video.play().catch(() => {
        if (disposed || gesturePending) return;
        gesturePending = true;
        window.addEventListener('pointerdown', onGesture, { passive: true });
        window.addEventListener('touchstart', onGesture, { passive: true });
      });
    };
    const onGesture = () => { cleanupGesture(); tryPlay(); };
    const onVisibility = () => { if (document.hidden) video.pause(); else tryPlay(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) tryPlay(); else video.pause();
    });
    observer.observe(video);
    document.addEventListener('visibilitychange', onVisibility);
    tryPlay();
    return () => {
      disposed = true; observer.disconnect(); cleanupGesture(); video.pause();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showVideo]);

  return <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
    {videoData.poster && <img src={videoData.poster} alt="" aria-hidden="true" decoding="async"
      className="absolute inset-0 w-full h-full object-cover" />}
    {showVideo && <video ref={videoRef} muted loop playsInline preload="metadata"
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
      onPlaying={() => setReady(true)} onError={event => {
        // React bubbles source errors; allow the browser to try the next codec.
        if (event.target !== event.currentTarget) return;
        setReady(false); setFailed(true);
      }}>
      {sources.map((source, index) => <source key={source.src} {...source}
        onError={() => { if (index === sources.length - 1) setFailed(true); }} />)}
    </video>}
  </div>;
}
