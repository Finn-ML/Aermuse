import { useState, FormEvent } from 'react';
import { Lock, Check, AlertCircle, Loader2 } from 'lucide-react';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Client-side validation
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-[20px] p-7"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <Lock size={20} className="text-[#F7E6CA]" />
        </div>
        <h3 className="text-lg font-bold">Change Password</h3>
      </div>

      {success && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-[rgba(40,167,69,0.1)] border border-[rgba(40,167,69,0.2)]">
          <Check className="h-5 w-5 text-[#28a745]" />
          <span className="text-[#28a745] font-medium">Password updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.2)]">
          <AlertCircle className="h-5 w-5 text-[#dc3545]" />
          <span className="text-[#dc3545] font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none transition-colors"
            required
            data-testid="input-current-password"
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none transition-colors"
            required
            data-testid="input-new-password"
          />
          <p className="mt-2 text-xs text-[rgba(102,0,51,0.5)]">Minimum 8 characters</p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none transition-colors"
            required
            data-testid="input-confirm-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          data-testid="button-update-password"
        >
          {loading && <Loader2 className="animate-spin" size={16} />}
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
