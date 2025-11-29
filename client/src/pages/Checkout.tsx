import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLocation('/auth?redirect=/checkout');
      return;
    }

    initiateCheckout();
  }, [user, authLoading]);

  const initiateCheckout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.redirect) {
          setLocation(data.redirect);
          return;
        }
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Checkout Error
          </h1>

          <p className="text-gray-600 mb-6">{error}</p>

          <div className="flex gap-4 justify-center">
            <Button
              variant="ghost"
              onClick={() => setLocation('/pricing')}
            >
              Back to Pricing
            </Button>
            <Button
              onClick={initiateCheckout}
              className="bg-[#660033] hover:bg-[#4a0024] text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-[#660033]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CreditCard className="h-8 w-8 text-[#660033]" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting to Checkout
        </h1>

        <p className="text-gray-600 mb-6">
          Please wait while we redirect you to our secure payment page...
        </p>

        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading checkout...</span>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Powered by Stripe. Your payment is secure.
        </p>
      </div>
    </div>
  );
}
