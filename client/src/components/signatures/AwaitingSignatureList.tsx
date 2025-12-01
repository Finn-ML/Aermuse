import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  FileSignature,
  ExternalLink,
  Clock,
  User,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

interface SignatureToSign {
  id: string;
  contractId: string;
  contractTitle: string;
  initiator: {
    id: string;
    name: string;
    email: string;
  } | null;
  message?: string | null;
  signingUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

interface Props {
  maxItems?: number;
  showTitle?: boolean;
  onCountChange?: (count: number) => void;
}

export function AwaitingSignatureList({ maxItems = 5, showTitle = true, onCountChange }: Props) {
  const [, setLocation] = useLocation();
  const [toSign, setToSign] = useState<SignatureToSign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToSign = useCallback(async () => {
    try {
      const response = await fetch('/api/signatures/to-sign', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch signature requests');
      }

      const data = await response.json();
      const items = data.toSign || [];
      setToSign(items);
      onCountChange?.(items.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchToSign();
    // Poll for updates every 60 seconds
    const interval = setInterval(fetchToSign, 60000);
    return () => clearInterval(interval);
  }, [fetchToSign]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isExpiringSoon = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    const expDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3 && daysLeft >= 0;
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white shadow-lg p-6">
        {showTitle && (
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        )}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white shadow-lg p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (toSign.length === 0) {
    return null; // Don't render if nothing to sign
  }

  const displayItems = maxItems ? toSign.slice(0, maxItems) : toSign;

  return (
    <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
      {showTitle && (
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <div className="flex items-center gap-3 text-white">
            <FileSignature className="h-5 w-5" />
            <h2 className="font-bold text-lg">Awaiting Your Signature</h2>
          </div>
          <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-semibold">
            {toSign.length}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-xl border border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)] hover:bg-[rgba(102,0,51,0.02)] transition-all group"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[#660033] truncate">
                {item.contractTitle}
              </h3>
              <div className="flex items-center gap-2 text-sm text-[rgba(102,0,51,0.6)]">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">From {item.initiator?.name || 'Unknown'}</span>
                <span className="text-[rgba(102,0,51,0.3)]">•</span>
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(item.createdAt)}</span>
              </div>
              {isExpiringSoon(item.expiresAt) && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Expiring soon</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {item.signingUrl && (
                <a
                  href={item.signingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  Sign Now
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                onClick={() => setLocation(`/contracts/${item.contractId}`)}
                className="p-2 hover:bg-[rgba(102,0,51,0.08)] rounded-lg transition-colors"
                title="View contract"
              >
                <ChevronRight className="h-5 w-5 text-[rgba(102,0,51,0.5)]" />
              </button>
            </div>
          </div>
        ))}

        {toSign.length > maxItems && (
          <button
            onClick={() => setLocation('/signatures')}
            className="w-full py-3 text-center text-[#660033] font-semibold hover:bg-[rgba(102,0,51,0.05)] rounded-xl transition-colors"
          >
            View all {toSign.length} pending signatures
          </button>
        )}
      </div>
    </div>
  );
}
