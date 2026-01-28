import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatTime } from '@/hooks/useAudioPlayer';
import { cn } from '@/lib/utils';

interface AudioProgressBarProps {
  currentTime: number;
  duration: number;
  buffered?: number;
  onSeek: (time: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export function AudioProgressBar({
  currentTime,
  duration,
  buffered = 0,
  onSeek,
  onSeekStart,
  onSeekEnd,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
  className,
}: AudioProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [dragPosition, setDragPosition] = useState(0);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Use drag position while dragging, otherwise use actual progress
  const displayProgress = isDragging ? dragPosition : progress;
  const displayTime = isDragging ? (dragPosition / 100) * duration : currentTime;

  // Calculate position from mouse/touch event
  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return percentage;
  }, []);

  // Calculate time from position percentage
  const getTimeFromPosition = useCallback((position: number): number => {
    return (position / 100) * duration;
  }, [duration]);

  // Handle click on track
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return; // Handled by drag end
    const position = getPositionFromEvent(e.clientX);
    const time = getTimeFromPosition(position);
    onSeek(time);
  }, [isDragging, getPositionFromEvent, getTimeFromPosition, onSeek]);

  // Handle mouse down (start drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const position = getPositionFromEvent(e.clientX);
    setDragPosition(position);
    onSeekStart?.();
  }, [getPositionFromEvent, onSeekStart]);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const position = getPositionFromEvent(touch.clientX);
    setDragPosition(position);
    onSeekStart?.();
  }, [getPositionFromEvent, onSeekStart]);

  // Handle mouse move (during drag)
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const position = getPositionFromEvent(e.clientX);
      setDragPosition(position);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const position = getPositionFromEvent(e.clientX);
      const time = getTimeFromPosition(position);
      onSeek(time);
      setIsDragging(false);
      onSeekEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, getPositionFromEvent, getTimeFromPosition, onSeek, onSeekEnd]);

  // Handle touch move and end
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const position = getPositionFromEvent(touch.clientX);
      setDragPosition(position);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const position = getPositionFromEvent(touch.clientX);
      const time = getTimeFromPosition(position);
      onSeek(time);
      setIsDragging(false);
      onSeekEnd?.();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, getPositionFromEvent, getTimeFromPosition, onSeek, onSeekEnd]);

  // Handle hover position for tooltip
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    const position = getPositionFromEvent(e.clientX);
    setHoverPosition(position);
  }, [isDragging, getPositionFromEvent]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const jumpSeconds = 5;
    let newTime = currentTime;

    switch (e.key) {
      case 'ArrowLeft':
        newTime = Math.max(0, currentTime - jumpSeconds);
        break;
      case 'ArrowRight':
        newTime = Math.min(duration, currentTime + jumpSeconds);
        break;
      case 'Home':
        newTime = 0;
        break;
      case 'End':
        newTime = duration;
        break;
      default:
        return;
    }

    e.preventDefault();
    onSeek(newTime);
  }, [currentTime, duration, onSeek]);

  const showThumb = isHovering || isDragging;
  const hoverTime = (hoverPosition / 100) * duration;

  return (
    <div className={cn('w-full', className)}>
      {/* Progress track with larger touch target */}
      <div
        ref={trackRef}
        className="relative h-1 cursor-pointer group"
        style={{
          touchAction: 'none',
          // Larger touch target via padding
          padding: '10px 0',
          margin: '-10px 0',
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Track background */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          {/* Buffered indicator */}
          <motion.div
            className="absolute h-full rounded-full"
            style={{ backgroundColor: `${primaryColor}40` }}
            initial={{ width: 0 }}
            animate={{ width: `${buffered}%` }}
            transition={{ duration: 0.1 }}
          />

          {/* Played progress */}
          <motion.div
            className="absolute h-full rounded-full"
            style={{ backgroundColor: primaryColor }}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: isDragging ? 0 : 0.1 }}
          />
        </div>

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-md"
          style={{
            backgroundColor: primaryColor,
            left: `${displayProgress}%`,
            boxShadow: `0 0 0 2px ${secondaryColor}`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: showThumb ? 1 : 0,
            opacity: showThumb ? 1 : 0,
          }}
          transition={{ duration: 0.15 }}
        />

        {/* Time tooltip on hover */}
        {isHovering && !isDragging && (
          <motion.div
            className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap pointer-events-none"
            style={{
              left: `${hoverPosition}%`,
              backgroundColor: primaryColor,
              color: secondaryColor,
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            {formatTime(hoverTime)}
          </motion.div>
        )}

        {/* Time tooltip during drag */}
        {isDragging && (
          <motion.div
            className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium whitespace-nowrap pointer-events-none"
            style={{
              left: `${dragPosition}%`,
              backgroundColor: primaryColor,
              color: secondaryColor,
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {formatTime(displayTime)}
          </motion.div>
        )}
      </div>

      {/* Time display */}
      <div
        className="flex justify-between text-xs mt-1 opacity-70"
        style={{ color: primaryColor }}
      >
        <span>{formatTime(displayTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

export default AudioProgressBar;
