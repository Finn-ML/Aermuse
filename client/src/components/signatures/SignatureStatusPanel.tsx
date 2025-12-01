import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  Clock,
  Mail,
  Copy,
  Check,
  X,
  Send,
  AlertCircle,
  ExternalLink,
  Download,
  User
} from 'lucide-react';

interface Signatory {
  id: string;
  name: string;
  email: string;
  status: 'waiting' | 'pending' | 'signed' | 'declined';
  signingOrder: number;
  signingUrl?: string | null;
  signedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
}

interface SignatureRequest {
  id: string;
  contractId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  signingOrder: string;
  message?: string | null;
  expiresAt?: string | null;
  completedAt?: string | null;
  signedPdfPath?: string | null;
  createdAt: string;
  signatories: Signatory[];
}

interface Props {
  contractId: string;
  onClose?: () => void;
}

export function SignatureStatusPanel({ contractId, onClose }: Props) {
  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/signatures?contractId=${contractId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch signature status');
      }

      const data = await response.json();
      const requests = data.signatureRequests || [];

      // Get the most recent request for this contract
      const latestRequest = requests.find(
        (r: SignatureRequest) => r.contractId === contractId
      );

      setRequest(latestRequest || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchStatus();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const copySigningUrl = async (signatoryId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(signatoryId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sendReminder = async (signatoryId: string) => {
    if (!request) return;

    setSendingReminder(signatoryId);
    try {
      const response = await fetch(`/api/signatures/request/${request.id}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ signatoryId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reminder');
      }

      // Show success feedback
      alert('Reminder sent successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const cancelRequest = async () => {
    if (!request || !confirm('Are you sure you want to cancel this signature request?')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(`/api/signatures/request/${request.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel request');
      }

      // Refresh the status
      await fetchStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'declined':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'signed':
        return 'Signed';
      case 'pending':
        return 'Ready to sign';
      case 'declined':
        return 'Declined';
      default:
        return 'Waiting';
    }
  };

  const getOverallProgress = () => {
    if (!request) return 0;
    const signedCount = request.signatories.filter(s => s.status === 'signed').length;
    return Math.round((signedCount / request.signatories.length) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-[rgba(102,0,51,0.6)]">
        <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No signature request found for this contract.</p>
      </div>
    );
  }

  const isCompleted = request.status === 'completed';
  const isCancelled = request.status === 'cancelled';
  const isExpired = request.status === 'expired';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 text-white"
        style={{
          background: isCompleted
            ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
            : isCancelled || isExpired
            ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
            : 'linear-gradient(135deg, #660033 0%, #8B0045 100%)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle className="h-6 w-6" />
            ) : isCancelled || isExpired ? (
              <X className="h-6 w-6" />
            ) : (
              <Clock className="h-6 w-6" />
            )}
            <div>
              <h3 className="font-bold text-lg">
                {isCompleted ? 'All Signatures Complete' :
                 isCancelled ? 'Request Cancelled' :
                 isExpired ? 'Request Expired' :
                 'Awaiting Signatures'}
              </h3>
              <p className="text-white/80 text-sm">
                {request.signatories.length} signator{request.signatories.length === 1 ? 'y' : 'ies'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isCancelled && !isExpired && (
        <div className="px-6 py-3 bg-[rgba(102,0,51,0.03)]">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[rgba(102,0,51,0.6)]">Progress</span>
            <span className="font-semibold text-[#660033]">{getOverallProgress()}%</span>
          </div>
          <div className="h-2 bg-[rgba(102,0,51,0.1)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${getOverallProgress()}%`,
                background: isCompleted
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                  : 'linear-gradient(135deg, #660033 0%, #8B0045 100%)'
              }}
            />
          </div>
        </div>
      )}

      {/* Signatories List */}
      <div className="p-6 space-y-4">
        <h4 className="font-semibold text-[#660033]">Signing Order</h4>

        <div className="space-y-3">
          {request.signatories.map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                s.status === 'signed'
                  ? 'bg-green-50 border-green-200'
                  : s.status === 'pending'
                  ? 'bg-amber-50 border-amber-200'
                  : s.status === 'declined'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    s.status === 'signed'
                      ? 'bg-green-500 text-white'
                      : s.status === 'pending'
                      ? 'bg-amber-500 text-white'
                      : s.status === 'declined'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s.status === 'signed' ? (
                    <Check className="h-4 w-4" />
                  ) : s.status === 'declined' ? (
                    <X className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div>
                  <p className="font-medium text-[#660033]">{s.name}</p>
                  <p className="text-sm text-[rgba(102,0,51,0.5)]">{s.email}</p>
                  {s.signedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Signed {new Date(s.signedAt).toLocaleDateString()}
                    </p>
                  )}
                  {s.declinedAt && (
                    <p className="text-xs text-red-600 mt-1">
                      Declined {new Date(s.declinedAt).toLocaleDateString()}
                      {s.declineReason && `: ${s.declineReason}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(s.status)}`}>
                  {getStatusLabel(s.status)}
                </span>

                {s.status === 'pending' && s.signingUrl && !isCancelled && !isExpired && (
                  <>
                    <button
                      onClick={() => copySigningUrl(s.id, s.signingUrl!)}
                      className="p-2 hover:bg-[rgba(102,0,51,0.08)] rounded-lg transition-colors"
                      title="Copy signing link"
                    >
                      {copiedId === s.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
                      )}
                    </button>
                    <button
                      onClick={() => sendReminder(s.id)}
                      disabled={sendingReminder === s.id}
                      className="p-2 hover:bg-[rgba(102,0,51,0.08)] rounded-lg transition-colors disabled:opacity-50"
                      title="Send reminder"
                    >
                      <Send className={`h-4 w-4 ${
                        sendingReminder === s.id ? 'animate-pulse' : ''
                      } text-[rgba(102,0,51,0.5)]`} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message */}
        {request.message && (
          <div className="mt-4 p-4 bg-[rgba(102,0,51,0.03)] rounded-xl">
            <p className="text-sm text-[rgba(102,0,51,0.6)]">
              <strong>Message:</strong> "{request.message}"
            </p>
          </div>
        )}

        {/* Expiration */}
        {request.expiresAt && !isCompleted && !isCancelled && !isExpired && (
          <div className="flex items-center gap-2 text-sm text-[rgba(102,0,51,0.6)]">
            <Clock className="h-4 w-4" />
            <span>Expires {new Date(request.expiresAt).toLocaleDateString()}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-[rgba(102,0,51,0.1)]">
          {isCompleted && request.signedPdfPath && (
            <a
              href={`/api/contracts/${contractId}/signed-pdf`}
              download
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
            >
              <Download className="h-4 w-4" />
              Download Signed PDF
            </a>
          )}

          {!isCompleted && !isCancelled && !isExpired && (
            <button
              onClick={cancelRequest}
              disabled={cancelling}
              className="flex-1 px-4 py-2.5 border border-red-200 rounded-xl font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Request'}
            </button>
          )}
        </div>

        {/* Timestamps */}
        <div className="text-xs text-[rgba(102,0,51,0.4)] mt-4">
          <p>Created: {new Date(request.createdAt).toLocaleString()}</p>
          {request.completedAt && (
            <p>Completed: {new Date(request.completedAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}
