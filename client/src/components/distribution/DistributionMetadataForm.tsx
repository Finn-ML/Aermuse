import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { IsrcInput } from './IsrcInput';
import { ReadinessIndicator } from './ReadinessIndicator';
import { ArrowLeft, Save, Loader2, Music } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop/Rap', 'R&B/Soul', 'Electronic/Dance', 'Jazz',
  'Classical', 'Country', 'Folk', 'Reggae', 'Latin', 'Blues', 'Metal',
  'Punk', 'Indie', 'Alternative', 'Afrobeats', 'Grime', 'Drill',
  'Dancehall', 'Gospel', 'Ambient', 'Lo-fi', 'Soundtrack', 'World', 'Other',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'sw', label: 'Swahili' },
  { code: 'yo', label: 'Yoruba' },
];

interface TrackWithReadiness {
  id: string;
  title: string;
  artistName: string | null;
  coverArtPath: string | null;
  isrcCode: string | null;
  genre: string | null;
  secondaryGenre: string | null;
  releaseDate: string | null;
  language: string | null;
  explicitContent: boolean | null;
  songwriters: string | null;
  producers: string | null;
  recordLabel: string | null;
  copyrightHolder: string | null;
  publishingRights: string | null;
  distributionStatus: string | null;
  readiness: { percentage: number; missing: string[]; isReady: boolean };
}

interface DistributionMetadataFormProps {
  track: TrackWithReadiness;
  onBack: () => void;
}

export function DistributionMetadataForm({ track, onBack }: DistributionMetadataFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    genre: track.genre || '',
    secondaryGenre: track.secondaryGenre || '',
    releaseDate: track.releaseDate ? new Date(track.releaseDate).toISOString().split('T')[0] : '',
    language: track.language || 'en',
    explicitContent: track.explicitContent || false,
    songwriters: track.songwriters || '',
    producers: track.producers || '',
    recordLabel: track.recordLabel || 'Independent',
    copyrightHolder: track.copyrightHolder || '',
    publishingRights: track.publishingRights || '',
  });

  // Track local readiness for real-time updates
  const [localReadiness, setLocalReadiness] = useState(track.readiness);

  // Recalculate readiness when form changes
  useEffect(() => {
    const requiredFields: { key: string; label: string }[] = [
      { key: 'isrcCode', label: 'ISRC Code' },
      { key: 'genre', label: 'Genre' },
      { key: 'releaseDate', label: 'Release Date' },
      { key: 'language', label: 'Language' },
      { key: 'songwriters', label: 'Songwriters' },
      { key: 'copyrightHolder', label: 'Copyright Holder' },
      { key: 'publishingRights', label: 'Publishing Rights' },
    ];

    const merged = { ...track, ...formData };
    const missing: string[] = [];
    for (const field of requiredFields) {
      const value = (merged as any)[field.key];
      if (value === null || value === undefined || value === '') {
        missing.push(field.label);
      }
    }

    const filled = requiredFields.length - missing.length;
    const percentage = Math.round((filled / requiredFields.length) * 100);
    setLocalReadiness({ percentage, missing, isReady: missing.length === 0 });
  }, [formData, track]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = { ...formData };
      // Convert date string to ISO for the server
      if (payload.releaseDate) {
        payload.releaseDate = new Date(payload.releaseDate).toISOString();
      } else {
        payload.releaseDate = null;
      }
      const res = await apiRequest('PATCH', `/api/distribution/tracks/${track.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/tracks'] });
      toast({ title: 'Distribution metadata saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save metadata', description: error.message, variant: 'destructive' });
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[#660033]" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {track.coverArtPath ? (
            <img
              src={`/api/tracks/${track.id}/cover/${encodeURIComponent(track.coverArtPath)}`}
              alt={track.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[rgba(102,0,51,0.1)] flex items-center justify-center">
              <Music size={20} className="text-[#660033]" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-[#660033]">{track.title}</h2>
            <p className="text-sm text-[rgba(102,0,51,0.6)]">{track.artistName || 'Unknown Artist'}</p>
          </div>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#660033] text-[#F7E6CA] rounded-xl hover:bg-[#4a0024] transition-colors font-medium disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* ISRC Section */}
          <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
            <h3 className="text-sm font-semibold text-[#660033] mb-4 uppercase tracking-wider">ISRC Code</h3>
            <IsrcInput
              trackId={track.id}
              currentIsrc={track.isrcCode}
              onUpdated={() => queryClient.invalidateQueries({ queryKey: ['/api/distribution/tracks'] })}
            />
          </div>

          {/* Genre & Language */}
          <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
            <h3 className="text-sm font-semibold text-[#660033] mb-4 uppercase tracking-wider">Genre & Language</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Primary Genre *</label>
                <select
                  value={formData.genre}
                  onChange={(e) => updateField('genre', e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033] bg-white"
                >
                  <option value="">Select genre...</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Secondary Genre</label>
                <select
                  value={formData.secondaryGenre}
                  onChange={(e) => updateField('secondaryGenre', e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033] bg-white"
                >
                  <option value="">None</option>
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Language *</label>
                <select
                  value={formData.language}
                  onChange={(e) => updateField('language', e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033] bg-white"
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Release Date *</label>
                <input
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => updateField('releaseDate', e.target.value)}
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
                />
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
            <h3 className="text-sm font-semibold text-[#660033] mb-4 uppercase tracking-wider">Credits</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Songwriters *</label>
                <input
                  type="text"
                  value={formData.songwriters}
                  onChange={(e) => updateField('songwriters', e.target.value)}
                  placeholder="e.g. John Smith, Jane Doe"
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated names of all songwriters</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Producers</label>
                <input
                  type="text"
                  value={formData.producers}
                  onChange={(e) => updateField('producers', e.target.value)}
                  placeholder="e.g. Producer Name"
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated names of producers</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Record Label</label>
                <input
                  type="text"
                  value={formData.recordLabel}
                  onChange={(e) => updateField('recordLabel', e.target.value)}
                  placeholder="Independent"
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
                />
              </div>
            </div>
          </div>

          {/* Rights & Content */}
          <div className="bg-white rounded-2xl p-6 border border-[rgba(102,0,51,0.08)]">
            <h3 className="text-sm font-semibold text-[#660033] mb-4 uppercase tracking-wider">Rights & Content</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Copyright Holder *</label>
                <input
                  type="text"
                  value={formData.copyrightHolder}
                  onChange={(e) => updateField('copyrightHolder', e.target.value)}
                  placeholder="℗ 2026 Artist Name"
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
                />
                <p className="text-xs text-gray-500 mt-1">Sound recording copyright, e.g. "℗ 2026 Your Name"</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[#660033] mb-1 block">Publishing Rights *</label>
                <input
                  type="text"
                  value={formData.publishingRights}
                  onChange={(e) => updateField('publishingRights', e.target.value)}
                  placeholder="© 2026 Artist Name"
                  className="w-full px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
                />
                <p className="text-xs text-gray-500 mt-1">Composition copyright, e.g. "© 2026 Your Name"</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-[#660033]">Explicit Content</label>
                  <p className="text-xs text-gray-500">Does this track contain explicit lyrics?</p>
                </div>
                <Switch
                  checked={formData.explicitContent}
                  onCheckedChange={(checked) => updateField('explicitContent', checked)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Readiness */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <ReadinessIndicator
              percentage={localReadiness.percentage}
              missing={localReadiness.missing}
              isReady={localReadiness.isReady}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
