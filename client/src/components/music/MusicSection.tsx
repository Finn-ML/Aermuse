import { useQuery } from '@tanstack/react-query';
import { SpinningDiscPlayer, type Track } from './SpinningDiscPlayer';
import { Loader2 } from 'lucide-react';

interface MusicSectionProps {
  artistSlug: string;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export function MusicSection({
  artistSlug,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
  className,
}: MusicSectionProps) {
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

  const handlePurchase = async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
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
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: primaryColor }}
        >
          Music
        </h2>
        <div
          className="w-16 h-1 mx-auto rounded-full"
          style={{ backgroundColor: primaryColor }}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: primaryColor }}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="text-center py-8 opacity-70"
          style={{ color: primaryColor }}
        >
          Failed to load tracks
        </div>
      )}

      {/* Tracks grid */}
      {tracks && tracks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {tracks.map((track) => (
            <SpinningDiscPlayer
              key={track.id}
              track={track}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              onPurchase={handlePurchase}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default MusicSection;
