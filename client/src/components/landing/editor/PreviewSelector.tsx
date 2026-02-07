import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Scissors, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const PREVIEW_DURATION = 30;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface PreviewSelectorProps {
  audioSrc: string;
  initialStartSeconds?: number;
  onConfirm: (previewStartSeconds: number) => void;
  onCancel?: () => void;
}

export default function PreviewSelector({
  audioSrc,
  initialStartSeconds = 0,
  onConfirm,
  onCancel,
}: PreviewSelectorProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const snippetRafRef = useRef<number | null>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false);
  const [previewStart, setPreviewStart] = useState(initialStartSeconds);
  const [isLoaded, setIsLoaded] = useState(false);

  const previewEnd = Math.min(previewStart + PREVIEW_DURATION, duration);
  const maxStart = Math.max(0, duration - PREVIEW_DURATION);
  const isTooShort = duration > 0 && duration <= PREVIEW_DURATION;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      if (initialStartSeconds && audio.duration > PREVIEW_DURATION) {
        setPreviewStart(Math.min(initialStartSeconds, audio.duration - PREVIEW_DURATION));
      }
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setIsPlayingSnippet(false); };

    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [initialStartSeconds]);

  // Stop snippet playback when it reaches the end of the preview window
  useEffect(() => {
    if (!isPlayingSnippet || !audioRef.current) return;
    const check = () => {
      if (audioRef.current && audioRef.current.currentTime >= previewEnd) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPlayingSnippet(false);
        return;
      }
      snippetRafRef.current = requestAnimationFrame(check);
    };
    snippetRafRef.current = requestAnimationFrame(check);
    return () => { if (snippetRafRef.current) cancelAnimationFrame(snippetRafRef.current); };
  }, [isPlayingSnippet, previewEnd]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsPlayingSnippet(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const playSnippet = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = previewStart;
    audio.play();
    setIsPlaying(true);
    setIsPlayingSnippet(true);
  }, [previewStart]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    audio.currentTime = frac * duration;
  }, [duration]);

  if (isTooShort && isLoaded) {
    return (
      <div className="rounded-xl p-5 bg-white/60">
        <audio ref={audioRef} src={audioSrc} preload="metadata" />
        <div className="text-center">
          <Scissors size={28} className="mx-auto mb-2 text-[rgba(102,0,51,0.3)]" />
          <p className="text-sm font-semibold text-[#660033] mb-1">Entire track will be used as preview</p>
          <p className="text-xs text-[rgba(102,0,51,0.5)] mb-3">
            Track is {formatTime(duration)} (under {PREVIEW_DURATION}s)
          </p>
          <button
            onClick={() => onConfirm(0)}
            className="px-5 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg font-semibold text-sm hover:bg-[#8B0045] transition-colors"
          >
            <Check size={14} className="inline mr-1.5 -mt-0.5" />
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-5 bg-white/60 space-y-4">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <div className="flex items-center gap-2">
        <Scissors size={16} className="text-[#660033]" />
        <h4 className="text-sm font-bold text-[#660033]">Select 30s Preview</h4>
      </div>

      {/* Playback controls + progress */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!isLoaded}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#660033] text-[#F7E6CA] hover:bg-[#8B0045] transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <div className="flex-1 relative">
          <div
            className="h-2 rounded-full bg-[rgba(102,0,51,0.1)] cursor-pointer relative overflow-hidden"
            onClick={handleProgressClick}
          >
            {/* Preview window highlight */}
            {duration > 0 && (
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: `${(previewStart / duration) * 100}%`,
                  width: `${((previewEnd - previewStart) / duration) * 100}%`,
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

      {/* Preview window slider */}
      {isLoaded && duration > PREVIEW_DURATION && (
        <>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
              Preview Window
            </label>
            <Slider
              value={[previewStart]}
              min={0}
              max={maxStart}
              step={1}
              onValueChange={(v) => setPreviewStart(v[0])}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#660033]">
                {formatTime(previewStart)} - {formatTime(previewEnd)}
              </span>
              <button
                onClick={playSnippet}
                disabled={!isLoaded}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isPlayingSnippet
                    ? 'bg-[#660033] text-[#F7E6CA]'
                    : 'bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)]'
                }`}
              >
                {isPlayingSnippet ? <Pause size={12} /> : <Play size={12} />}
                Listen to Snippet
              </button>
            </div>

            <div className="flex gap-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.06)] transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => onConfirm(previewStart)}
                className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg font-semibold text-xs hover:bg-[#8B0045] transition-colors flex items-center gap-1.5"
              >
                <Check size={14} />
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {!isLoaded && (
        <div className="text-center py-3">
          <p className="text-xs text-[rgba(102,0,51,0.5)]">Loading audio...</p>
        </div>
      )}
    </div>
  );
}
