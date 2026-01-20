import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, ShoppingCart, X, Loader2 } from 'lucide-react';
import { SpinningDiscPlayer, type Track } from './SpinningDiscPlayer';
import { useAudioPlayer, formatTime, formatPrice } from '@/hooks/useAudioPlayer';

interface PlaylistSectionProps {
  artistSlug: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  className?: string;
}

function PlaylistItem({
  track,
  isSelected,
  isPlaying,
  onSelect,
  onTogglePlay,
  primaryColor,
  secondaryColor,
  textColor,
}: {
  track: Track;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onTogglePlay: () => void;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
}) {
  const coverArtUrl = track.coverArtPath
    ? `/api/tracks/${track.id}/cover/${encodeURIComponent(track.coverArtPath)}`
    : undefined;

  return (
    <motion.div
      layout
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
        isSelected ? 'ring-2' : 'hover:bg-white/10'
      }`}
      style={{
        backgroundColor: isSelected ? `${secondaryColor}20` : 'transparent',
        '--tw-ring-color': isSelected ? secondaryColor : 'transparent',
      } as React.CSSProperties}
      onClick={onSelect}
    >
      {/* Cover Art / Play Button */}
      <div
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden flex-shrink-0 group"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay();
        }}
      >
        {coverArtUrl ? (
          <img
            src={coverArtUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}30` }}
          >
            <Music className="w-5 h-5" style={{ color: textColor }} />
          </div>
        )}

        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </div>

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-white rounded-full"
                  animate={{ height: [4, 12, 4] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4
          className="font-semibold truncate text-sm md:text-base"
          style={{ color: textColor }}
        >
          {track.title}
        </h4>
        {track.artistName && (
          <p
            className="text-xs md:text-sm truncate opacity-70"
            style={{ color: textColor }}
          >
            {track.artistName}
          </p>
        )}
        {track.durationSeconds && (
          <p
            className="text-xs opacity-50 mt-0.5"
            style={{ color: textColor }}
          >
            {formatTime(track.durationSeconds)}
          </p>
        )}
      </div>

      {/* Price */}
      <div
        className="flex-shrink-0 text-right"
      >
        {track.pricingType === 'pwyw' ? (
          <>
            <span
              className="text-sm md:text-base font-semibold"
              style={{ color: secondaryColor }}
            >
              {track.minimumPriceInCents === 0
                ? 'Name Your Price'
                : `From ${formatPrice(track.minimumPriceInCents || 0, track.currency || 'gbp')}`}
            </span>
            <p
              className="text-[10px] opacity-50"
              style={{ color: textColor }}
            >
              PWYW
            </p>
          </>
        ) : (
          <>
            <span
              className="text-sm md:text-base font-semibold"
              style={{ color: secondaryColor }}
            >
              {formatPrice(track.priceInCents, track.currency || 'gbp')}
            </span>
            <p
              className="text-[10px] opacity-50"
              style={{ color: textColor }}
            >
              + VAT
            </p>
          </>
        )}
        {track.allowFreeStreaming && (
          <p
            className="text-[10px] font-medium"
            style={{ color: secondaryColor }}
          >
            Free Stream
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function PlaylistSection({
  artistSlug,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
  textColor = '#FFFFFF',
  className,
}: PlaylistSectionProps) {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const { data: tracks, isLoading, error } = useQuery<Track[]>({
    queryKey: ['artist-tracks', artistSlug],
    queryFn: async () => {
      const response = await fetch(`/api/artist/${artistSlug}/tracks`);
      if (!response.ok) {
        throw new Error('Failed to load tracks');
      }
      return response.json();
    },
    enabled: !!artistSlug,
  });

  // Determine audio source: full stream if track allows free streaming, otherwise preview
  const playingTrack = tracks?.find(t => t.id === playingTrackId);
  const previewUrl = playingTrackId
    ? playingTrack?.allowFreeStreaming
      ? `/api/tracks/${playingTrackId}/stream`
      : `/api/tracks/${playingTrackId}/preview`
    : undefined;

  const {
    isPlaying,
    toggle,
    pause,
  } = useAudioPlayer(previewUrl);

  const handleTogglePlay = (trackId: string) => {
    if (playingTrackId === trackId) {
      toggle();
    } else {
      setPlayingTrackId(trackId);
      // Audio will auto-play when source changes
    }
  };

  const handleSelectTrack = (track: Track) => {
    setSelectedTrack(track);
  };

  const handleClosePlayer = () => {
    setSelectedTrack(null);
    pause();
    setPlayingTrackId(null);
  };

  const handlePurchase = async (trackId: string, customAmount?: number) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customAmount: customAmount !== undefined ? customAmount : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();

      // Handle free downloads (PWYW with 0 amount)
      if (data.free && data.downloadToken) {
        // Show success modal with download link
        window.location.href = `?purchase=success&track=${trackId}&download_token=${data.downloadToken}`;
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Failed to start checkout. Please try again.');
    }
  };

  // Don't render if no tracks
  if (!isLoading && (!tracks || tracks.length === 0)) {
    return null;
  }

  return (
    <section className={className}>
      {/* Section header */}
      <div className="text-center mb-6">
        <h2
          className="text-xl md:text-2xl font-bold mb-2"
          style={{ color: textColor }}
        >
          Music
        </h2>
        <div
          className="w-12 h-1 mx-auto rounded-full"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: textColor }}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="text-center py-6 opacity-70"
          style={{ color: textColor }}
        >
          Failed to load tracks
        </div>
      )}

      {/* Main content - Playlist + Player */}
      {tracks && tracks.length > 0 && (
        <div className="max-w-4xl mx-auto">
          {/* Desktop: Side by side, Mobile: Stacked */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Playlist */}
            <div
              className="flex-1 rounded-2xl p-3 md:p-4"
              style={{ backgroundColor: `${primaryColor}40` }}
            >
              <div className="space-y-1">
                {tracks.map((track) => (
                  <PlaylistItem
                    key={track.id}
                    track={track}
                    isSelected={selectedTrack?.id === track.id}
                    isPlaying={playingTrackId === track.id && isPlaying}
                    onSelect={() => handleSelectTrack(track)}
                    onTogglePlay={() => handleTogglePlay(track.id)}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    textColor={textColor}
                  />
                ))}
              </div>
            </div>

            {/* Player Panel - Shows when track selected */}
            <AnimatePresence mode="wait">
              {selectedTrack && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="lg:w-80 xl:w-96"
                >
                  <div
                    className="rounded-2xl p-4 md:p-6 relative"
                    style={{ backgroundColor: `${secondaryColor}` }}
                  >
                    {/* Close button */}
                    <button
                      onClick={handleClosePlayer}
                      className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/10 transition-colors"
                      style={{ color: primaryColor }}
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* Spinning Disc Player */}
                    <SpinningDiscPlayer
                      track={selectedTrack}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      onPurchase={handlePurchase}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state when no track selected - Desktop only */}
            {!selectedTrack && (
              <div className="hidden lg:flex lg:w-80 xl:w-96 items-center justify-center">
                <div
                  className="text-center p-8 rounded-2xl border-2 border-dashed opacity-50"
                  style={{ borderColor: textColor }}
                >
                  <Music
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                    style={{ color: textColor }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: textColor }}
                  >
                    Select a track to preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default PlaylistSection;
