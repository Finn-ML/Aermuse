// VideoCard - Thumbnail card with lock icon overlay for paywalled videos
import { motion } from 'framer-motion';
import { Lock, Play, Clock } from 'lucide-react';
import { formatPrice } from '@/hooks/useAudioPlayer';

export interface Video {
  id: string;
  title: string;
  description?: string | null;
  thumbnailPath?: string | null;
  durationSeconds?: number | null;
  isPaywalled: boolean;
  priceInCents?: number | null;
  currency?: string | null;
  pricingType?: 'fixed' | 'pwyw' | null;
  minimumPriceInCents?: number | null;
  isPublished: boolean;
  viewCount?: number;
  purchaseCount?: number;
}

interface VideoCardProps {
  video: Video;
  isSelected?: boolean;
  onClick?: () => void;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoCard({
  video,
  isSelected = false,
  onClick,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
  textColor = '#FFFFFF',
}: VideoCardProps) {
  const thumbnailUrl = video.thumbnailPath
    ? `/api/videos/${video.id}/thumbnail/${encodeURIComponent(video.thumbnailPath)}`
    : undefined;

  const isPWYW = video.pricingType === 'pwyw';
  const minPrice = video.minimumPriceInCents || 0;

  return (
    <motion.div
      className="flex-shrink-0 w-64 md:w-72 cursor-pointer group"
      style={{ scrollSnapAlign: 'start' }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail Container */}
      <div
        className={`relative aspect-video rounded-xl overflow-hidden ${
          isSelected ? 'ring-2' : ''
        }`}
        style={{
          backgroundColor: `${primaryColor}30`,
          '--tw-ring-color': isSelected ? secondaryColor : 'transparent',
        } as React.CSSProperties}
      >
        {/* Thumbnail Image */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}40` }}
          >
            <Play className="w-12 h-12 opacity-30" style={{ color: textColor }} />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Lock Icon for Paywalled Videos */}
        {video.isPaywalled && (
          <div
            className="absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm"
            style={{ backgroundColor: `${primaryColor}90` }}
          >
            <Lock className="w-4 h-4" style={{ color: secondaryColor }} />
          </div>
        )}

        {/* Duration Badge */}
        {video.durationSeconds && (
          <div
            className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm flex items-center gap-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
          >
            <Clock className="w-3 h-3" />
            {formatDuration(video.durationSeconds)}
          </div>
        )}

        {/* Play Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: `${secondaryColor}e0` }}
          >
            <Play className="w-7 h-7 ml-1" style={{ color: primaryColor }} />
          </div>
        </div>

        {/* Price Badge for Paywalled */}
        {video.isPaywalled && video.priceInCents !== null && (
          <div
            className="absolute bottom-3 left-3 px-2 py-1 rounded text-xs font-semibold backdrop-blur-sm"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
          >
            {isPWYW
              ? minPrice === 0
                ? 'Name Your Price'
                : `From ${formatPrice(minPrice, video.currency || 'gbp')}`
              : formatPrice(video.priceInCents!, video.currency || 'gbp')}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mt-2 px-1">
        <h4
          className="font-semibold text-sm truncate"
          style={{ color: textColor }}
        >
          {video.title}
        </h4>
        {video.description && (
          <p
            className="text-xs truncate opacity-70 mt-0.5"
            style={{ color: textColor }}
          >
            {video.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default VideoCard;
