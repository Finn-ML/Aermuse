import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Keyboard, X, Copy, Check } from 'lucide-react';

interface IsrcInputProps {
  trackId: string;
  currentIsrc: string | null;
  onUpdated: () => void;
}

export function IsrcInput({ trackId, currentIsrc, onUpdated }: IsrcInputProps) {
  const [mode, setMode] = useState<'view' | 'auto' | 'manual'>('view');
  const [manualIsrc, setManualIsrc] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/distribution/tracks/${trackId}/generate-isrc`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/tracks'] });
      toast({ title: 'ISRC code generated successfully' });
      setMode('view');
      onUpdated();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to generate ISRC', description: error.message, variant: 'destructive' });
    },
  });

  const setManualMutation = useMutation({
    mutationFn: async (isrc: string) => {
      const res = await apiRequest('PATCH', `/api/distribution/tracks/${trackId}/isrc`, { isrc });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/tracks'] });
      toast({ title: 'ISRC code saved successfully' });
      setMode('view');
      setManualIsrc('');
      onUpdated();
    },
    onError: (error: Error) => {
      toast({ title: 'Invalid ISRC', description: error.message, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/distribution/tracks/${trackId}/isrc`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/tracks'] });
      toast({ title: 'ISRC code removed' });
      onUpdated();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove ISRC', description: error.message, variant: 'destructive' });
    },
  });

  const handleCopy = () => {
    if (currentIsrc) {
      navigator.clipboard.writeText(currentIsrc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show current ISRC
  if (currentIsrc && mode === 'view') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#660033]">ISRC Code</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg font-mono text-sm text-emerald-800">
            {currentIsrc}
          </div>
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Copy ISRC"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-gray-500" />}
          </button>
          <button
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            title="Remove ISRC"
          >
            {removeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>
      </div>
    );
  }

  // No ISRC set - show options
  if (!currentIsrc && mode === 'view') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#660033]">ISRC Code</label>
        <div className="flex gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            Generate for me
          </button>
          <button
            onClick={() => setMode('manual')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-[rgba(102,0,51,0.2)] text-[#660033] rounded-lg hover:bg-[rgba(102,0,51,0.05)] transition-colors text-sm font-medium"
          >
            <Keyboard size={16} />
            I have one
          </button>
        </div>
      </div>
    );
  }

  // Manual entry mode
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#660033]">Enter ISRC Code</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={manualIsrc}
          onChange={(e) => setManualIsrc(e.target.value.toUpperCase())}
          placeholder="CC-XXX-YY-NNNNN"
          className="flex-1 px-3 py-2 border border-[rgba(102,0,51,0.2)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#660033]/20 focus:border-[#660033]"
          maxLength={17}
        />
        <button
          onClick={() => setManualMutation.mutate(manualIsrc)}
          disabled={!manualIsrc || setManualMutation.isPending}
          className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors text-sm font-medium disabled:opacity-50"
        >
          {setManualMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
        </button>
        <button
          onClick={() => { setMode('view'); setManualIsrc(''); }}
          className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-500">Format: CC-XXX-YY-NNNNN (e.g., GB-AER-26-00001)</p>
    </div>
  );
}
