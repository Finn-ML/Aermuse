import { useState } from 'react';
import { CheckCircle, Copy, ExternalLink, Check } from 'lucide-react';

interface SignatoryInfo {
  id: string;
  name: string;
  email: string;
  status: 'waiting' | 'pending' | 'signed';
  signingUrl?: string | null;
}

interface SignatureRequestInfo {
  id: string;
  signatories: SignatoryInfo[];
}

interface Props {
  request: SignatureRequestInfo;
  onClose: () => void;
  onViewStatus: () => void;
}

export function SignatureRequestSuccess({ request, onClose, onViewStatus }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySigningUrl = async (signatoryId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(signatoryId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="text-center p-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}
      >
        <CheckCircle className="h-8 w-8 text-white" />
      </div>

      <h2 className="text-xl font-bold text-[#660033] mb-2">
        Signature Request Sent!
      </h2>

      <p className="text-[rgba(102,0,51,0.6)] mb-6">
        {request.signatories.length === 1
          ? 'An email has been sent to the signatory.'
          : `Emails will be sent to ${request.signatories.length} signatories in order.`}
      </p>

      <div className="bg-[rgba(102,0,51,0.03)] rounded-xl p-4 mb-6 text-left">
        <h3 className="font-semibold text-[#660033] mb-3">Signing Order</h3>
        <div className="space-y-3">
          {request.signatories.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 text-white rounded-full flex items-center justify-center text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-[#660033]">{s.name}</p>
                  <p className="text-sm text-[rgba(102,0,51,0.5)]">{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  s.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : s.status === 'signed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.status === 'pending' ? 'Ready to sign' : s.status === 'signed' ? 'Signed' : 'Waiting'}
                </span>
                {s.signingUrl && (
                  <button
                    onClick={() => copySigningUrl(s.id, s.signingUrl!)}
                    className="p-1.5 hover:bg-[rgba(102,0,51,0.08)] rounded-lg transition-colors"
                    title="Copy signing link"
                  >
                    {copiedId === s.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onClose}
          className="px-4 py-2.5 border border-[rgba(102,0,51,0.2)] rounded-xl font-semibold text-[#660033] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
        >
          Done
        </button>
        <button
          onClick={onViewStatus}
          className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold hover:scale-105 transition-all"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <ExternalLink className="h-4 w-4" />
          View Status
        </button>
      </div>
    </div>
  );
}
