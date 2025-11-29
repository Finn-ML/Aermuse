import { useLocation } from 'wouter';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PricingCard } from '@/components/pricing/PricingCard';
import { FAQ } from '@/components/pricing/FAQ';
import { Link } from 'wouter';

const FREE_FEATURES = [
  { name: 'Upload up to 3 contracts', included: true },
  { name: 'Basic contract storage', included: true },
  { name: 'Standard security', included: true },
  { name: 'AI contract analysis', included: false },
  { name: 'E-signing capabilities', included: false },
  { name: 'Contract templates', included: false },
  { name: 'Unlimited contracts', included: false },
  { name: 'PDF export', included: false },
];

const PREMIUM_FEATURES = [
  { name: 'Unlimited contracts', included: true },
  { name: 'AI Attorney analysis', included: true, highlight: true },
  { name: 'Fairness scoring & risk flags', included: true },
  { name: 'E-signing with DocuSeal', included: true, highlight: true },
  { name: '5 professional templates', included: true },
  { name: 'PDF export', included: true },
  { name: 'Priority support', included: true },
  { name: 'Full contract history', included: true },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Check if user has premium subscription
  const isPremium = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  const handleGetPremium = () => {
    if (!user) {
      // Redirect to auth with return URL
      setLocation('/auth?redirect=/pricing&action=subscribe');
    } else {
      // Redirect to checkout
      setLocation('/checkout');
    }
  };

  const handleGetStarted = () => {
    if (!user) {
      setLocation('/auth');
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
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <PricingCard
            name="Free"
            price="£0"
            period="forever"
            description="Perfect for trying out Aermuse"
            features={FREE_FEATURES}
            buttonText={user ? (isPremium ? 'Downgrade' : 'Current Plan') : 'Get Started'}
            buttonVariant="secondary"
            onButtonClick={handleGetStarted}
            disabled={!!user && !isPremium}
            current={!!user && !isPremium}
          />

          {/* Premium Tier */}
          <PricingCard
            name="Premium"
            price="£9"
            period="month"
            description="Everything you need to protect your music career"
            features={PREMIUM_FEATURES}
            buttonText={isPremium ? 'Current Plan' : 'Get Premium'}
            buttonVariant="default"
            onButtonClick={handleGetPremium}
            disabled={isPremium}
            current={isPremium}
            highlighted
            badge="Most Popular"
          />
        </div>
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

      {/* Final CTA */}
      <div className="bg-[#F7E6CA] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4 text-[#660033]">
            Ready to protect your music career?
          </h2>
          <p className="text-[#660033]/80 mb-8">
            Join thousands of artists who trust Aermuse to review their contracts.
          </p>
          {!isPremium && (
            <button
              onClick={handleGetPremium}
              className="px-8 py-3 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] font-medium text-lg transition-colors"
            >
              {user ? 'Start Your Premium Trial' : 'Get Started Free'}
            </button>
          )}
        </div>
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
