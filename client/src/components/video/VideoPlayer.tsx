// VideoPlayer - Player with 10-second preview logic for paywalled content
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Lock, ShoppingCart } from 'lucide-react';
import type { Video } from './VideoCard';

interface VideoPlayerProps {
  video: Video;
  hasAccess: boolean;
  accessToken?: string;
  onClose: () => void;
  onPurchaseClick: () => void;
  primaryColor?: string;
  secondaryColor?: string;
}

const PREVIEW_DURATION_SECONDS = 10;

export function VideoPlayer({
  video,
  hasAccess,
  accessToken,
  onClose,
  onPurchaseClick,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Video source - full video if has access (with token), otherwise preview
  const videoSrc = hasAccess && accessToken
    ? `/api/videos/${video.id}/stream?token=${encodeURIComponent(accessToken)}`
    : video.isPaywalled
      ? `/api/videos/${video.id}/preview`
      : `/api/videos/${video.id}/stream`;

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Check if preview time limit reached for paywalled content
    if (!hasAccess && video.isPaywalled && time >= PREVIEW_DURATION_SECONDS) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowPaywall(true);
    }
  }, [hasAccess, video.isPaywalled]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (showPaywall) {
      onPurchaseClick();
      return;
    }

    // The element is the source of truth — isPlaying state follows via
    // the play/pause events, so a rejected play() can't desync the UI
    if (video.paused || video.ended) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [showPaywall, onPurchaseClick]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    let newTime = percentage * duration;

    // Limit seeking for paywalled content
    if (!hasAccess && video.isPaywalled) {
      newTime = Math.min(newTime, PREVIEW_DURATION_SECONDS);
    }

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, hasAccess, video.isPaywalled]);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    const container = video?.parentElement?.parentElement;
    if (!video || !container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((video as any).webkitEnterFullscreen) {
        // iPhone Safari has no element fullscreen API — use the native
        // video fullscreen presentation instead
        (video as any).webkitEnterFullscreen();
        return; // native UI manages its own state
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreen]);

  // Track fullscreen from the document so Escape/system exits stay in sync
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'm') toggleMute();
      if (e.key === 'f') toggleFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, togglePlay, toggleMute, toggleFullscreen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxProgress = !hasAccess && video.isPaywalled
    ? Math.min((PREVIEW_DURATION_SECONDS / duration) * 100, 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl mx-4 rounded-2xl overflow-hidden bg-black"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Video Container */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              handleLoadedMetadata();
              setIsLoading(false);
              setVideoError(null);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onStalled={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onSeeked={() => setIsBuffering(false)}
            onClick={togglePlay}
            onError={(e) => {
              const mediaError = (e.target as HTMLVideoElement).error;
              console.error('Video load error:', mediaError?.code, mediaError?.message, 'src:', videoSrc);
              setVideoError('Video could not be loaded. The file may not be available.');
              setIsLoading(false);
            }}
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => {
              setIsLoading(false);
              setIsBuffering(false);
            }}
            preload="auto"
            playsInline
          />

          {/* Loading State */}
          {isLoading && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Buffering Indicator (mid-playback stalls) */}
          {isBuffering && !isLoading && !videoError && !showPaywall && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-center p-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${primaryColor}40` }}
              >
                <X className="w-8 h-8" style={{ color: secondaryColor }} />
              </div>
              <p className="text-white text-lg font-semibold mb-2">Video Unavailable</p>
              <p className="text-white/60 text-sm max-w-xs">{videoError}</p>
              {video.isPaywalled && (
                <button
                  onClick={onPurchaseClick}
                  className="mt-4 px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: secondaryColor, color: primaryColor }}
                >
                  Purchase to Access
                </button>
              )}
            </div>
          )}

          {/* Paywall Overlay */}
          {showPaywall && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
            >
              <div
                className="p-4 rounded-full mb-4"
                style={{ backgroundColor: `${primaryColor}40` }}
              >
                <Lock className="w-12 h-12" style={{ color: secondaryColor }} />
              </div>
              <h3
                className="text-xl md:text-2xl font-bold mb-2 text-center"
                style={{ color: secondaryColor }}
              >
                Purchase to Continue Watching
              </h3>
              <p className="text-white/70 text-sm mb-6 text-center px-4">
                You've watched the 10-second preview. Purchase to unlock the full video.
              </p>
              <button
                onClick={onPurchaseClick}
                className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-transform hover:scale-105"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                <ShoppingCart className="w-5 h-5" />
                Purchase Now
              </button>
            </motion.div>
          )}

          {/* Play/Pause Overlay */}
          {!showPaywall && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: !isPlaying || showControls ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              onClick={togglePlay}
            >
              {!isPlaying && (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              )}
            </motion.div>
          )}

          {/* Video Controls */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: showControls ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Progress Bar */}
            <div
              className="relative h-1 rounded-full mb-3 cursor-pointer group"
              style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
              onClick={handleSeek}
            >
              {/* Playable Range Indicator */}
              {!hasAccess && video.isPaywalled && (
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    width: `${maxProgress}%`,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                  }}
                />
              )}
              {/* Progress */}
              <motion.div
                className="absolute inset-y-0 rounded-full"
                style={{ backgroundColor: secondaryColor }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, maxProgress)}%` }}
                transition={{ duration: 0.1 }}
              />
              {/* Scrubber */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  left: `${Math.min(progress, maxProgress)}%`,
                  backgroundColor: secondaryColor,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>

                {/* Time */}
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                {/* Preview Badge */}
                {!hasAccess && video.isPaywalled && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: primaryColor, color: secondaryColor }}
                  >
                    Preview: {PREVIEW_DURATION_SECONDS}s
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Purchase Button - visible for paywalled content without access */}
                {!hasAccess && video.isPaywalled && (
                  <button
                    onClick={onPurchaseClick}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-sm transition-transform hover:scale-105"
                    style={{ backgroundColor: secondaryColor, color: primaryColor }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {video.priceInCents !== null
                      ? `Buy £${((video.priceInCents || 0) / 100).toFixed(2)}`
                      : 'Purchase'}
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Video Title */}
        <div className="p-4" style={{ backgroundColor: primaryColor }}>
          <h3
            className="font-semibold text-lg"
            style={{ color: secondaryColor }}
          >
            {video.title}
          </h3>
          {video.description && (
            <p className="text-sm opacity-80 mt-1" style={{ color: secondaryColor }}>
              {video.description}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default VideoPlayer;
