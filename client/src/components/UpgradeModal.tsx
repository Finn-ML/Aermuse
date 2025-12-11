import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UpgradePreview {
  amountDue: number;
  currency: string;
  newPlanAmount: number;
}

export function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [preview, setPreview] = useState<UpgradePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewLoading(true);
      setError(null);
      fetch('/api/subscriptions/preview-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetTier: 'alpha' }),
      })
        .then(r => {
          if (!r.ok) throw new Error('Failed to preview upgrade');
          return r.json();
        })
        .then(setPreview)
        .catch(err => setError(err.message))
        .finally(() => setPreviewLoading(false));
    }
  }, [isOpen]);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetTier: 'alpha' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upgrade failed');
      }

      // Invalidate user query to refresh tier state
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            <Sparkles className="h-8 w-8 text-[#F7E6CA]" />
          </div>
          <h2 className="text-2xl font-bold text-[#660033]">Upgrade to Alpha</h2>
          <p className="text-[#660033]/70 mt-2">
            Unlock all AI features including Red Flags, Key Terms, and Missing Clauses detection
          </p>
        </div>

        {previewLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#660033]" />
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
            {error}
          </div>
        ) : preview && (
          <div className="bg-[#F7E6CA]/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#660033]/70">Amount due today</span>
              <span className="text-xl font-bold text-[#660033]">
                £{preview.amountDue.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-[#660033]/60">
              This is the prorated amount for your remaining billing cycle.
              Future charges will be £{preview.newPlanAmount}/month.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg font-semibold border border-[#660033]/20 text-[#660033] hover:bg-[#660033]/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading || previewLoading || !!error}
            className="flex-1 py-3 px-4 rounded-lg font-semibold text-[#F7E6CA] flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Upgrading...
              </>
            ) : (
              'Confirm Upgrade'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
