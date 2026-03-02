import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { DistributionTrackList } from './DistributionTrackList';
import { DistributionMetadataForm } from './DistributionMetadataForm';
import { DistributionUploadForm } from './DistributionUploadForm';

type View = 'list' | 'upload' | 'metadata';

export default function DistributionDashboard() {
  const [view, setView] = useState<View>('list');
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

  if (view === 'upload') {
    return (
      <DistributionUploadForm
        onBack={() => setView('list')}
        onComplete={() => setView('list')}
      />
    );
  }

  if (view === 'metadata' && selectedTrackId) {
    const selectedTrack = tracks.find((t: any) => t.id === selectedTrackId);
    if (selectedTrack) {
      return (
        <DistributionMetadataForm
          track={selectedTrack}
          onBack={() => { setView('list'); setSelectedTrackId(null); }}
        />
      );
    }
  }

  return (
    <DistributionTrackList
      tracks={tracks}
      onSelectTrack={(id) => { setSelectedTrackId(id); setView('metadata'); }}
      onUpload={() => setView('upload')}
    />
  );
}
