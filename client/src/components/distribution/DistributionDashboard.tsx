import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { DistributionTrackList } from './DistributionTrackList';
import { DistributionMetadataForm } from './DistributionMetadataForm';

export default function DistributionDashboard() {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const { data: tracks = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/distribution/tracks'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#660033]" size={32} />
      </div>
    );
  }

  const selectedTrack = selectedTrackId ? tracks.find((t: any) => t.id === selectedTrackId) : null;

  if (selectedTrack) {
    return (
      <DistributionMetadataForm
        track={selectedTrack}
        onBack={() => setSelectedTrackId(null)}
      />
    );
  }

  return (
    <DistributionTrackList
      tracks={tracks}
      onSelectTrack={setSelectedTrackId}
    />
  );
}
