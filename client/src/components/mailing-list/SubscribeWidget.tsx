import { useState } from 'react';
import { Loader2, CheckCircle, Mail } from 'lucide-react';

interface SubscribeWidgetProps {
  slug: string;
  primaryColor: string;
  accentColor?: string;
  textColor?: string;
}

type WidgetState = 'idle' | 'loading' | 'success' | 'already_subscribed' | 'error';

export function SubscribeWidget({
  slug,
  primaryColor,
  accentColor,
  textColor,
}: SubscribeWidgetProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<WidgetState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const buttonColor = accentColor || primaryColor;
  const labelColor = textColor || primaryColor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || state === 'loading') return;

    setState('loading');
    setErrorMessage('');

    try {
      const res = await fetch(`/api/artist/${slug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setState('success');
        setEmail('');
      } else {
        const data = await res.json().catch(() => null);
        if (res.status === 409 || data?.error?.toLowerCase().includes('already')) {
          setState('already_subscribed');
        } else {
          setErrorMessage(data?.error || 'Something went wrong. Please try again.');
          setState('error');
        }
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/10 backdrop-blur-sm">
        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: buttonColor }} />
        <p className="text-sm font-medium" style={{ color: labelColor }}>
          Check your email to confirm your subscription!
        </p>
      </div>
    );
  }

  if (state === 'already_subscribed') {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/10 backdrop-blur-sm">
        <Mail className="w-5 h-5 flex-shrink-0" style={{ color: buttonColor }} />
        <p className="text-sm font-medium" style={{ color: labelColor }}>
          You're already subscribed!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          placeholder="Enter your email"
          required
          className="flex-1 px-4 py-2.5 rounded-full text-sm bg-white/90 backdrop-blur-sm border-0 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all"
          style={{
            focusRingColor: buttonColor,
          } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={state === 'loading' || !email.trim()}
          className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60 flex-shrink-0 flex items-center gap-1.5"
          style={{ backgroundColor: buttonColor }}
        >
          {state === 'loading' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Subscribe'
          )}
        </button>
      </div>
      {state === 'error' && errorMessage && (
        <p className="text-xs mt-2 text-red-400">{errorMessage}</p>
      )}
    </form>
  );
}
