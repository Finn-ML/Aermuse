// VideoSection - Horizontally scrollable container with CSS scroll-snap
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Video as VideoIcon } from 'lucide-react';
import { VideoCard, type Video } from './VideoCard';
import { VideoPlayer } from './VideoPlayer';
import { VideoPurchaseModal } from './VideoPurchaseModal';

interface VideoSectionProps {
  artistSlug: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  className?: string;
  purchasedVideoTokens?: Record<string, string>;
  onVideoPurchased?: (videoId: string, accessToken: string) => void;
}

export function VideoSection({
  artistSlug,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
  textColor = '#FFFFFF',
  className,
  purchasedVideoTokens = {},
  onVideoPurchased,
}: VideoSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [localPurchasedTokens, setLocalPurchasedTokens] = useState<Record<string, string>>({});

  const { data: videos, isLoading, error } = useQuery<Video[]>({
    queryKey: ['artist-videos', artistSlug],
    queryFn: async () => {
      const response = await fetch(`/api/artist/${artistSlug}/videos`);
      if (!response.ok) {
        throw new Error('Failed to load videos');
      }
      return response.json();
    },
    enabled: !!artistSlug,
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleClosePlayer = () => {
    setSelectedVideo(null);
  };

  const handlePurchaseClick = () => {
    setShowPurchaseModal(true);
  };

  const handlePurchaseSuccess = (videoId: string, accessToken?: string) => {
    if (accessToken) {
      setLocalPurchasedTokens(prev => ({ ...prev, [videoId]: accessToken }));
      onVideoPurchased?.(videoId, accessToken);
    }
    setShowPurchaseModal(false);
  };

  // Combine parent-provided tokens with local tokens
  const allPurchasedTokens = { ...purchasedVideoTokens, ...localPurchasedTokens };

  const hasAccessToVideo = (video: Video) => {
    return !video.isPaywalled || video.id in allPurchasedTokens;
  };

  const getAccessToken = (video: Video) => {
    return allPurchasedTokens[video.id];
  };

  // Don't render if no videos
  if (!isLoading && (!videos || videos.length === 0)) {
    return null;
  }

  return (
    <section className={className}>
      {/* Section Header */}
      <div className="text-center mb-6">
        <h2
          className="text-xl md:text-2xl font-bold mb-2"
          style={{ color: textColor }}
        >
          Videos
        </h2>
        <div
          className="w-12 h-1 mx-auto rounded-full"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: textColor }}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          className="text-center py-6 opacity-70"
          style={{ color: textColor }}
        >
          Failed to load videos
        </div>
      )}

      {/* Video Carousel */}
      {videos && videos.length > 0 && (
        <div className="relative max-w-6xl mx-auto">
          {/* Scroll Buttons */}
          {videos.length > 3 && (
            <>
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full backdrop-blur-sm hidden md:flex items-center justify-center transition-opacity hover:opacity-100 opacity-70"
                style={{ backgroundColor: `${primaryColor}90`, color: secondaryColor }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full backdrop-blur-sm hidden md:flex items-center justify-center transition-opacity hover:opacity-100 opacity-70"
                style={{ backgroundColor: `${primaryColor}90`, color: secondaryColor }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto px-4 md:px-12 pb-4 scrollbar-hide"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isSelected={selectedVideo?.id === video.id}
                onClick={() => handleVideoSelect(video)}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                textColor={textColor}
              />
            ))}
          </div>

          {/* Scroll Indicators */}
          {videos.length > 3 && (
            <div className="flex justify-center gap-1.5 mt-4">
              {videos.map((_, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full transition-opacity"
                  style={{
                    backgroundColor: secondaryColor,
                    opacity: 0.3,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            hasAccess={hasAccessToVideo(selectedVideo)}
            accessToken={getAccessToken(selectedVideo)}
            onClose={handleClosePlayer}
            onPurchaseClick={handlePurchaseClick}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        )}
      </AnimatePresence>

      {/* Purchase Modal */}
      {selectedVideo && (
        <VideoPurchaseModal
          isOpen={showPurchaseModal}
          video={selectedVideo}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={(accessToken) => handlePurchaseSuccess(selectedVideo.id, accessToken)}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

export default VideoSection;
