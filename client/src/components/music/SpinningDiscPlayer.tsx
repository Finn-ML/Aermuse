import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Music } from 'lucide-react';
import { useAudioPlayer, formatTime, formatPrice } from '@/hooks/useAudioPlayer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Track {
  id: string;
  title: string;
  artistName?: string | null;
  priceInCents: number;
  currency: string;
  coverArtPath?: string | null;
  previewFilePath?: string | null;
  durationSeconds?: number | null;
  isPublished: boolean;
  // PWYW (Pay What You Want) fields
  pricingType?: 'fixed' | 'pwyw' | null;
  minimumPriceInCents?: number | null;
  suggestedPriceInCents?: number | null;
  // Free streaming
  allowFreeStreaming?: boolean | null;
}

interface SpinningDiscPlayerProps {
  track: Track;
  primaryColor?: string;
  secondaryColor?: string;
  onPurchase?: (trackId: string, customAmount?: number) => void;
  className?: string;
}

export function SpinningDiscPlayer({
  track,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
  onPurchase,
  className,
}: SpinningDiscPlayerProps) {
  // Determine audio source: full stream if free streaming enabled, otherwise preview
  const audioUrl = track.allowFreeStreaming
    ? `/api/tracks/${track.id}/stream`
    : track.previewFilePath
      ? `/api/tracks/${track.id}/preview`
      : undefined;

  const coverArtUrl = track.coverArtPath
    ? `/api/tracks/${track.id}/cover/${encodeURIComponent(track.coverArtPath)}`
    : undefined;

  const {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    toggle,
    seek,
  } = useAudioPlayer(audioUrl);

  const [isHovering, setIsHovering] = useState(false);

  // PWYW state
  const isPWYW = track.pricingType === 'pwyw';
  const minPrice = track.minimumPriceInCents || 0;
  const suggestedPrice = track.suggestedPriceInCents || track.priceInCents || 0;
  const [customAmount, setCustomAmount] = useState<number>(suggestedPrice);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    seek(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn('flex flex-col items-center gap-4 p-4', className)}>
      {/* Spinning Disc */}
      <div
        className="relative cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => audioUrl && toggle()}
      >
        {/* Outer vinyl ring */}
        <motion.div
          className="w-48 h-48 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at center,
              ${primaryColor} 0%,
              #1a1a1a 35%,
              #2a2a2a 40%,
              #1a1a1a 45%,
              #2a2a2a 50%,
              #1a1a1a 55%,
              #2a2a2a 60%,
              #1a1a1a 65%,
              #2a2a2a 100%)`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 0 60px rgba(0,0,0,0.5)',
          }}
          animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
          transition={
            isPlaying
              ? {
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }
              : { duration: 0.3 }
          }
        >
          {/* Album art center */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: secondaryColor,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
            }}
          >
            {coverArtUrl ? (
              <img
                src={coverArtUrl}
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music
                className="w-10 h-10"
                style={{ color: primaryColor }}
              />
            )}
          </div>

          {/* Center hole */}
          <div
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: '#1a1a1a',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)',
            }}
          />
        </motion.div>

        {/* Play/Pause overlay */}
        {audioUrl && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovering && !isPlaying ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            style={{
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </div>
          </motion.div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <motion.div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: primaryColor }}
            />
          </motion.div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center w-full max-w-[200px]">
        <h3
          className="font-semibold text-lg truncate"
          style={{ color: primaryColor }}
        >
          {track.title}
        </h3>
        {track.artistName && (
          <p
            className="text-sm truncate opacity-80"
            style={{ color: primaryColor }}
          >
            {track.artistName}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {audioUrl && (
        <div className="w-full max-w-[200px]">
          <div
            className="h-1 rounded-full cursor-pointer overflow-hidden"
            style={{ backgroundColor: `${primaryColor}20` }}
            onClick={handleProgressClick}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: primaryColor }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div
            className="flex justify-between text-xs mt-1 opacity-70"
            style={{ color: primaryColor }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || track.durationSeconds || 0)}</span>
          </div>
        </div>
      )}

      {/* Purchase section */}
      {onPurchase && (
        <div className="w-full max-w-[200px] space-y-2">
          {/* PWYW Price Input */}
          {isPWYW && (
            <div className="space-y-1">
              <label
                className="text-xs font-medium block text-center"
                style={{ color: primaryColor }}
              >
                {minPrice === 0 ? 'Name Your Price' : 'Pay What You Want'}
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                  style={{ color: primaryColor }}
                >
                  £
                </span>
                <input
                  type="number"
                  min={minPrice / 100}
                  step="0.50"
                  value={(customAmount / 100).toFixed(2)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) * 100;
                    setCustomAmount(Math.max(minPrice, Math.round(value) || 0));
                  }}
                  className="w-full pl-7 pr-3 py-2 text-center text-sm font-semibold rounded-lg border-2 focus:outline-none focus:ring-2"
                  style={{
                    borderColor: `${primaryColor}40`,
                    color: primaryColor,
                    backgroundColor: 'white',
                  }}
                />
              </div>
              {minPrice > 0 && (
                <p
                  className="text-[10px] text-center opacity-60"
                  style={{ color: primaryColor }}
                >
                  Min: {formatPrice(minPrice, track.currency || 'gbp')}
                </p>
              )}
            </div>
          )}

          {/* Buy Button */}
          <Button
            onClick={() => onPurchase(track.id, isPWYW ? customAmount : undefined)}
            className="w-full font-semibold"
            style={{
              backgroundColor: primaryColor,
              color: secondaryColor,
            }}
          >
            {isPWYW
              ? customAmount === 0
                ? 'Get Free'
                : `${formatPrice(customAmount, track.currency || 'gbp')} - Buy Now`
              : `${formatPrice(track.priceInCents, track.currency || 'gbp')} - Buy Now`}
          </Button>

          {/* Free streaming badge */}
          {track.allowFreeStreaming && (
            <p
              className="text-[10px] text-center font-medium"
              style={{ color: primaryColor }}
            >
              Free to stream
            </p>
          )}

          {/* VAT notice */}
          {(isPWYW ? customAmount > 0 : true) && (
            <p
              className="text-[10px] text-center opacity-60"
              style={{ color: primaryColor }}
            >
              + VAT where applicable
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SpinningDiscPlayer;
