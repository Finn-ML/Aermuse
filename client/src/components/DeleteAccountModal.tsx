import { useState, FormEvent } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAccountModal({ onClose, onDeleted }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        onDeleted();
      } else {
        setError(data.error || 'Failed to delete account');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div
        className="rounded-[20px] max-w-md w-full mx-4 p-7"
        style={{ background: 'rgba(255, 255, 255, 0.98)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(220,53,69,0.1)]">
              <AlertTriangle size={20} className="text-[#dc3545]" />
            </div>
            <h2 className="text-xl font-bold text-[#660033]">Delete Account</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[rgba(102,0,51,0.5)] hover:text-[#660033] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.2)]">
          <p className="text-[#dc3545] text-sm">
            <strong>Warning:</strong> This action will schedule your account for deletion.
            Your data will be permanently removed after 30 days. During this period,
            you won't be able to log in or create a new account with this email.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.2)]">
            <span className="text-[#dc3545] font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="delete-password"
              className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2"
            >
              Enter your password to confirm
            </label>
            <input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(220,53,69,0.2)] focus:border-[#dc3545] outline-none transition-colors"
              required
              data-testid="input-delete-password"
            />
          </div>

          <div>
            <label
              htmlFor="delete-confirm"
              className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2"
            >
              Type <span className="font-mono font-bold text-[#dc3545]">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(220,53,69,0.2)] focus:border-[#dc3545] outline-none transition-colors"
              placeholder="DELETE"
              required
              data-testid="input-delete-confirm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || confirmText !== 'DELETE'}
              className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm bg-[#dc3545] text-white hover:bg-[#c82333] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              data-testid="button-confirm-delete"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
