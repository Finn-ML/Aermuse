import { useEffect, useState } from 'react';
import { useLocation, useSearch, Link } from 'wouter';
import { CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

type VerificationState = 'verifying' | 'success' | 'error';

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  const [state, setState] = useState<VerificationState>('verifying');
  const [error, setError] = useState<string | null>(null);

  // Parse session_id from query string
  const params = new URLSearchParams(searchString);
  const sessionId = params.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setState('error');
      return;
    }

    verifyCheckout();
  }, [sessionId]);

  const verifyCheckout = async () => {
    try {
      const response = await fetch(`/api/billing/checkout/verify/${sessionId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.success) {
        // Refresh user data to get updated subscription
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setState('success');
      } else {
        throw new Error(data.message || 'Payment not completed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setState('error');
    }
  };

  if (state === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F7E6CA] to-white flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#660033]/10 max-w-md w-full p-10 text-center">
          <Loader2 className="h-10 w-10 text-[#660033]/70 animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-medium text-[#660033] mb-2">
            Confirming your subscription
          </h1>
          <p className="text-[#660033]/60">
            Just a moment...
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F7E6CA] to-white flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#660033]/10 max-w-md w-full p-10 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>

          <h1 className="text-xl font-medium text-[#660033] mb-3">
            We're still processing
          </h1>

          <p className="text-[#660033]/70 mb-4">
            {error || 'There was a small hiccup verifying your payment.'}
          </p>

          <p className="text-sm text-[#660033]/50 mb-8">
            If your payment went through, your subscription will activate shortly.
            We'll send a confirmation to your email.
          </p>

          <Button
            onClick={() => setLocation('/dashboard')}
            className="bg-[#660033] hover:bg-[#7a1a47] text-[#F7E6CA] rounded-xl px-8"
          >
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7E6CA] to-white flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#660033]/10 max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 bg-[#660033]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-[#660033]" />
        </div>

        <h1 className="text-2xl font-semibold text-[#660033] mb-3">
          You're all set
        </h1>

        <p className="text-[#660033]/70 mb-8">
          Welcome to Aermuse Premium. Your full access is now active.
        </p>

        <div className="bg-[#F7E6CA]/50 rounded-xl p-5 mb-8">
          <p className="text-sm font-medium text-[#660033]/80 mb-3">Now available to you:</p>
          <ul className="text-sm text-[#660033]/70 space-y-2">
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#660033]/50" />
              Unlimited contract analyses
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#660033]/50" />
              E-signing integration
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#660033]/50" />
              Professional templates
            </li>
          </ul>
        </div>

        <Button
          onClick={() => setLocation('/dashboard')}
          className="w-full bg-[#660033] hover:bg-[#7a1a47] text-[#F7E6CA] rounded-xl"
          size="lg"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
