import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Scissors, Check, X, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const CLIP_DURATION = 8;
const MAX_CAPTURE_WIDTH = 1920;
const MAX_CAPTURE_HEIGHT = 1920;
const CAPTURE_FPS = 30;
const CAPTURE_BITRATE = 8_000_000; // 8 Mbps for high quality

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Pick the best supported MediaRecorder mimeType for video capture.
 */
function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}

/**
 * Get the file extension for a given mime type.
 */
function getExtension(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) return 'mp4';
  return 'webm';
}

/**
 * Capture a clip from a video element using Canvas + MediaRecorder.
 * Plays the video in real-time and records the canvas output.
 */
async function captureVideoClip(
  video: HTMLVideoElement,
  startTime: number,
  clipDuration: number,
  onProgress?: (pct: number) => void
): Promise<File> {
  // Calculate canvas dimensions (cap at max while maintaining aspect ratio)
  const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth, MAX_CAPTURE_HEIGHT / video.videoHeight);
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);

  // Ensure even dimensions (required for some codecs)
  const canvasWidth = width % 2 === 0 ? width : width + 1;
  const canvasHeight = height % 2 === 0 ? height : height + 1;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill with black initially
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const mimeType = getSupportedMimeType();
  const stream = canvas.captureStream(CAPTURE_FPS);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: CAPTURE_BITRATE,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const endTime = startTime + clipDuration;

  return new Promise<File>((resolve, reject) => {
    let animFrame: number | null = null;

    recorder.onstop = () => {
      video.pause();
      const blob = new Blob(chunks, { type: mimeType });
      const ext = getExtension(mimeType);
      const file = new File([blob], `clip.${ext}`, { type: mimeType });
      resolve(file);
    };

    recorder.onerror = () => {
      video.pause();
      if (animFrame) cancelAnimationFrame(animFrame);
      reject(new Error('MediaRecorder error during clip capture'));
    };

    // Seek to start, then begin recording
    video.currentTime = startTime;
    video.onseeked = () => {
      video.onseeked = null;
      recorder.start(100); // collect data every 100ms
      video.play();

      const drawFrame = () => {
        if (video.currentTime >= endTime || video.paused || video.ended) {
          video.pause();
          // Draw final frame
          ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
          recorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

        // Report progress
        const elapsed = video.currentTime - startTime;
        const pct = Math.min(100, Math.round((elapsed / clipDuration) * 100));
        onProgress?.(pct);

        animFrame = requestAnimationFrame(drawFrame);
      };

      animFrame = requestAnimationFrame(drawFrame);
    };

    // Handle seek errors
    video.onerror = () => {
      reject(new Error('Video seek failed during clip capture'));
    };
  });
}

interface VideoTrimModalProps {
  isOpen: boolean;
  videoFile: File;
  onClose: () => void;
  onTrimConfirm: (trimmedFile: File) => void;
}

export function VideoTrimModal({
  isOpen,
  videoFile,
  onClose,
  onTrimConfirm,
}: VideoTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const snippetRafRef = useRef<number | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingClip, setIsPlayingClip] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const clipEnd = Math.min(clipStart + CLIP_DURATION, duration);
  const maxStart = Math.max(0, duration - CLIP_DURATION);

  // Create/cleanup Object URL for video file
  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      setDuration(video.duration);
      setIsLoaded(true);
    };
    const onTime = () => setCurrentTime(video.currentTime);
    const onEnd = () => { setIsPlaying(false); setIsPlayingClip(false); };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('ended', onEnd);
    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('ended', onEnd);
    };
  }, [videoUrl]);

  // Stop clip playback when it reaches the end of the clip window
  useEffect(() => {
    if (!isPlayingClip || !videoRef.current) return;
    const check = () => {
      if (videoRef.current && videoRef.current.currentTime >= clipEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
        setIsPlayingClip(false);
        return;
      }
      snippetRafRef.current = requestAnimationFrame(check);
    };
    snippetRafRef.current = requestAnimationFrame(check);
    return () => { if (snippetRafRef.current) cancelAnimationFrame(snippetRafRef.current); };
  }, [isPlayingClip, clipEnd]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      setIsPlayingClip(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const playClip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clipStart;
    video.play();
    setIsPlaying(true);
    setIsPlayingClip(true);
  }, [clipStart]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    video.currentTime = frac * duration;
  }, [duration]);

  const handleConfirm = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Stop any current playback
    video.pause();
    setIsPlaying(false);
    setIsPlayingClip(false);
    setCaptureError(null);

    // Start capturing
    setIsCapturing(true);
    setCaptureProgress(0);

    try {
      const actualClipDuration = Math.min(CLIP_DURATION, duration - clipStart);
      const trimmedFile = await captureVideoClip(
        video,
        clipStart,
        actualClipDuration,
        (pct) => setCaptureProgress(pct)
      );
      setCaptureProgress(100);
      onTrimConfirm(trimmedFile);
    } catch (err) {
      console.error('[VideoTrimModal] Capture failed:', err);
      setCaptureError('Failed to prepare clip. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [clipStart, duration, onTrimConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(102,0,51,0.1)]">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-[#660033]" />
            <h3 className="text-base font-bold text-[#660033]">Select 8s Clip</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isCapturing}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.06)] transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative bg-black" style={{ height: '300px' }}>
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-contain"
              muted
              playsInline
              preload="metadata"
            />
          )}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white/60">Loading video...</p>
            </div>
          )}
          {/* Capturing overlay */}
          {isCapturing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <Loader2 size={32} className="text-[#F7E6CA] animate-spin mb-3" />
              <p className="text-sm font-semibold text-[#F7E6CA]">Preparing clip... {captureProgress}%</p>
              <div className="w-48 h-1.5 rounded-full bg-white/20 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#F7E6CA] transition-[width] duration-200"
                  style={{ width: `${captureProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-5 space-y-4 bg-[rgba(102,0,51,0.02)]">
          {/* Capture error */}
          {captureError && (
            <p className="text-xs text-red-600 font-medium">{captureError}</p>
          )}

          {/* Playback controls + progress */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!isLoaded || isCapturing}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#660033] text-[#F7E6CA] hover:bg-[#8B0045] transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <div className="flex-1 relative">
              <div
                className="h-2 rounded-full bg-[rgba(102,0,51,0.1)] cursor-pointer relative overflow-hidden"
                onClick={isCapturing ? undefined : handleProgressClick}
              >
                {/* Clip window highlight */}
                {duration > 0 && (
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${(clipStart / duration) * 100}%`,
                      width: `${((clipEnd - clipStart) / duration) * 100}%`,
                      background: 'rgba(102, 0, 51, 0.15)',
                    }}
                  />
                )}
                {/* Playback progress */}
                {duration > 0 && (
                  <div
                    className="absolute h-full rounded-full bg-[#660033] transition-[width] duration-100"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                )}
              </div>
            </div>

            <span className="text-[11px] font-mono text-[rgba(102,0,51,0.5)] min-w-[70px] text-right flex-shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Clip window slider */}
          {isLoaded && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
                  Clip Window
                </label>
                <Slider
                  value={[clipStart]}
                  min={0}
                  max={maxStart}
                  step={0.1}
                  onValueChange={(v) => setClipStart(v[0])}
                  disabled={isCapturing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#660033]">
                    {formatTime(clipStart)} - {formatTime(clipEnd)}
                  </span>
                  <button
                    onClick={playClip}
                    disabled={!isLoaded || isCapturing}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isPlayingClip
                        ? 'bg-[#660033] text-[#F7E6CA]'
                        : 'bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)]'
                    }`}
                  >
                    {isPlayingClip ? <Pause size={12} /> : <Play size={12} />}
                    Preview Clip
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    disabled={isCapturing}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.06)] transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isCapturing}
                    className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg font-semibold text-xs hover:bg-[#8B0045] transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isCapturing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Use This Clip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
