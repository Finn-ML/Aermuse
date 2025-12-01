import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { FAQ } from '@/components/pricing/FAQ';
import { Link } from 'wouter';
import { useState } from 'react';

export default function Pricing() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has premium subscription
  const isPremium = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7E6CA] to-white">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-[#660033]">
          Aermuse
        </Link>
        <div className="flex items-center gap-6">
          {user ? (
            <Link href="/dashboard" className="text-[#660033] hover:underline">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth" className="text-[#660033] hover:underline">
                Sign In
              </Link>
              <Link
                href="/auth"
                className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#660033] mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-[#660033]/80 max-w-2xl mx-auto">
          Get the tools you need to understand and manage your music contracts with confidence.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        {isPremium ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-[#660033] mb-2">You're on Premium!</h3>
            <p className="text-[#660033]/70 mb-6">
              You have full access to all Aermuse features.
            </p>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors inline-block"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-[#660033] mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#660033]">£0</span>
                <span className="text-[#660033]/60">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-[#660033]/80">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>3 contract analyses per month</span>
                </li>
                <li className="flex items-center gap-2 text-[#660033]/80">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Basic risk assessment</span>
                </li>
                <li className="flex items-center gap-2 text-[#660033]/80">
                  <Check className="h-5 w-5 text-green-600" />
                  <span>Landing page builder</span>
                </li>
              </ul>
              <Link
                href={user ? "/dashboard" : "/auth"}
                className="block w-full py-3 text-center border-2 border-[#660033] text-[#660033] rounded-lg hover:bg-[#660033]/5 transition-colors"
              >
                {user ? "Current Plan" : "Get Started"}
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-[#660033] rounded-2xl shadow-lg p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F7E6CA] text-[#660033] text-sm font-semibold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-[#F7E6CA] mb-2">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[#F7E6CA]">£9.99</span>
                <span className="text-[#F7E6CA]/60">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-[#F7E6CA]/90">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Unlimited contract analyses</span>
                </li>
                <li className="flex items-center gap-2 text-[#F7E6CA]/90">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Advanced AI risk detection</span>
                </li>
                <li className="flex items-center gap-2 text-[#F7E6CA]/90">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Contract templates</span>
                </li>
                <li className="flex items-center gap-2 text-[#F7E6CA]/90">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>E-signing integration</span>
                </li>
                <li className="flex items-center gap-2 text-[#F7E6CA]/90">
                  <Check className="h-5 w-5 text-green-400" />
                  <span>Priority support</span>
                </li>
              </ul>
              {error && (
                <p className="text-red-300 text-sm mb-4 text-center">{error}</p>
              )}
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full py-3 bg-[#F7E6CA] text-[#660033] font-semibold rounded-lg hover:bg-[#f0d9b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Value Proposition */}
      <div className="bg-[#660033] text-[#F7E6CA] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">
            Why Musicians Choose Aermuse
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Stop signing contracts you don't fully understand. Our AI-powered analysis
            helps you spot unfair terms, understand complex clauses, and negotiate better deals.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="opacity-80">Contracts Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85%</div>
              <div className="opacity-80">Users Found Issues</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24h</div>
              <div className="opacity-80">Average Response Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-[#660033]">
          Frequently Asked Questions
        </h2>
        <FAQ />
      </div>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} Aermuse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
