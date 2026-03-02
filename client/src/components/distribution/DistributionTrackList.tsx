import { Music, Disc3 } from 'lucide-react';
import { ReadinessIndicator } from './ReadinessIndicator';

interface TrackWithReadiness {
  id: string;
  title: string;
  artistName: string | null;
  coverArtPath: string | null;
  isrcCode: string | null;
  distributionStatus: string | null;
  readiness: { percentage: number; missing: string[]; isReady: boolean };
}

interface DistributionTrackListProps {
  tracks: TrackWithReadiness[];
  onSelectTrack: (trackId: string) => void;
}

export function DistributionTrackList({ tracks, onSelectTrack }: DistributionTrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-[rgba(102,0,51,0.08)] flex items-center justify-center mx-auto mb-4">
          <Music size={32} className="text-[#660033]" />
        </div>
        <h3 className="text-lg font-bold text-[#660033] mb-2">No tracks yet</h3>
        <p className="text-sm text-[rgba(102,0,51,0.6)] max-w-md mx-auto">
          Upload tracks from your Artist Launcher music tab first, then come back here to prepare them for distribution.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tracks.map((track) => (
        <button
          key={track.id}
          onClick={() => onSelectTrack(track.id)}
          className="text-left bg-white rounded-2xl border border-[rgba(102,0,51,0.08)] hover:border-[rgba(102,0,51,0.2)] hover:shadow-md transition-all duration-200 overflow-hidden group"
        >
          {/* Cover art */}
          <div className="aspect-square relative bg-[rgba(102,0,51,0.04)]">
            {track.coverArtPath ? (
              <img
                src={`/api/tracks/${track.id}/cover/${encodeURIComponent(track.coverArtPath)}`}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={48} className="text-[rgba(102,0,51,0.2)]" />
              </div>
            )}

            {/* Status badge */}
            {track.readiness.isReady && (
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                Ready
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-[#660033] truncate">{track.title}</h3>
              <p className="text-sm text-[rgba(102,0,51,0.6)] truncate">{track.artistName || 'Unknown Artist'}</p>
            </div>

            {/* ISRC badge */}
            {track.isrcCode && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-[rgba(102,0,51,0.5)]">
                <Disc3 size={12} />
                {track.isrcCode}
              </div>
            )}

            {/* Readiness bar */}
            <ReadinessIndicator
              percentage={track.readiness.percentage}
              missing={track.readiness.missing}
              isReady={track.readiness.isReady}
              compact
            />
          </div>
        </button>
      ))}
    </div>
  );
}
