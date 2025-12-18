import { useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Loader2, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { STRIPE_PAYMENT_LINKS } from '@shared/constants/tiers';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    // Get tier from query params, default to 'alpha'
    const params = new URLSearchParams(search);
    const tier = params.get('tier') as 'beta' | 'alpha' || 'alpha';

    if (!user) {
      setLocation(`/auth?redirect=/checkout?tier=${tier}`);
      return;
    }

    // Build payment link URL with prefilled email
    const paymentLink = STRIPE_PAYMENT_LINKS[tier];

    if (user.email) {
      window.location.href = `${paymentLink}?prefilled_email=${encodeURIComponent(user.email)}`;
    } else {
      window.location.href = paymentLink;
    }
  }, [user, authLoading, search]);

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
