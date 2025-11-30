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
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <Loader2 className="h-12 w-12 text-[#660033] animate-spin mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Verifying Payment
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your subscription...
          </p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Verification Issue
          </h1>

          <p className="text-gray-600 mb-6">
            {error || 'There was an issue verifying your payment.'}
          </p>

          <p className="text-sm text-gray-500 mb-6">
            Don't worry - if your payment was successful, your subscription will
            be activated shortly. Check your email for confirmation.
          </p>

          <Button
            onClick={() => setLocation('/dashboard')}
            className="bg-[#660033] hover:bg-[#4a0024] text-white"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#660033]/5 to-[#F7E6CA] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Premium!
        </h1>

        <p className="text-gray-600 mb-8">
          Your subscription is now active. You have full access to all Aermuse features.
        </p>

        <div className="bg-[#660033]/5 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-center gap-2 text-[#660033] mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">What's Unlocked</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>AI Contract Analysis</li>
            <li>E-Signing with DocuSeal</li>
            <li>Professional Templates</li>
            <li>Unlimited Contracts</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => setLocation('/dashboard')}
            className="w-full bg-[#660033] hover:bg-[#4a0024] text-white"
            size="lg"
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/dashboard')}
            className="w-full border-[#660033] text-[#660033] hover:bg-[#660033]/5"
            size="lg"
          >
            Analyze Your First Contract
          </Button>
        </div>
      </div>
    </div>
  );
}
