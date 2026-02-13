import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isLoading: boolean;
  isSeeking: boolean;
  error: string | null;
}

export interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (time: number) => void;
  setSource: (url: string) => void;
  setIsSeeking: (seeking: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export function useAudioPlayer(initialUrl?: string): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSeekingRef = useRef(false);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    isLoading: false,
    isSeeking: false,
    error: null,
  });

  // Initialize audio element on mount
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Event handlers
    const handleLoadStart = () => {
      setState(s => ({ ...s, isLoading: true, error: null }));
    };

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      setState(s => ({
        ...s,
        duration: isFinite(dur) ? dur : 0,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      // Skip time updates during seeking to prevent jitter
      if (isSeekingRef.current) return;
      setState(s => ({ ...s, currentTime: audio.currentTime }));
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / audio.duration) * 100;
        setState(s => ({ ...s, buffered: isFinite(bufferedPercent) ? bufferedPercent : 0 }));
      }
    };

    const handleEnded = () => {
      setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
      try { audio.currentTime = 0; } catch {}
    };

    const handleError = () => {
      setState(s => ({
        ...s,
        isLoading: false,
        isPlaying: false,
        error: 'Failed to load audio',
      }));
    };

    const handleCanPlay = () => {
      setState(s => ({ ...s, isLoading: false }));
    };

    // Attach event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Set initial source if provided
    if (initialUrl) {
      audio.src = initialUrl;
      audio.load();
    }

    // Cleanup
    return () => {
      audio.pause();
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Update source when initialUrl changes
  useEffect(() => {
    if (audioRef.current && initialUrl) {
      audioRef.current.src = initialUrl;
      audioRef.current.load();
      setState(s => ({ ...s, currentTime: 0, isPlaying: false }));
    }
  }, [initialUrl]);

  const setSource = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      setState(s => ({ ...s, currentTime: 0, isPlaying: false, error: null }));
    }
  }, []);

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setState(s => ({ ...s, isPlaying: true, error: null }));
      } catch (err) {
        console.error('Playback failed:', err);
        setState(s => ({ ...s, error: 'Playback failed' }));
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(s => ({ ...s, isPlaying: false }));
    }
  }, []);

  const toggle = useCallback(async () => {
    if (state.isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current && isFinite(time)) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, []);

  const setIsSeeking = useCallback((seeking: boolean) => {
    isSeekingRef.current = seeking;
    setState(s => ({ ...s, isSeeking: seeking }));
  }, []);

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    setSource,
    setIsSeeking,
    audioRef: audioRef as React.RefObject<HTMLAudioElement>,
  };
}

// Format time as MM:SS
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format price in GBP (or other currency)
export function formatPrice(cents: number, currency: string = 'gbp'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}
