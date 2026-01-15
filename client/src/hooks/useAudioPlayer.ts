import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseAudioPlayerReturn extends AudioPlayerState {
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (time: number) => void;
  setSource: (url: string) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export function useAudioPlayer(initialUrl?: string): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
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
      setState(s => ({
        ...s,
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      setState(s => ({ ...s, currentTime: audio.currentTime }));
    };

    const handleEnded = () => {
      setState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
      audio.currentTime = 0;
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
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
    }
  }, []);

  return {
    ...state,
    play,
    pause,
    toggle,
    seek,
    setSource,
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
