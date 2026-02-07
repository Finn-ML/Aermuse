import { useState } from 'react';
import { Sparkles, Check, X, Crown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePremium } from '@/hooks/usePremium';
import { FAQ } from '@/components/pricing/FAQ';
import { Link } from 'wouter';
import type { SubscriptionTier } from '@shared/schema';
import { TIER_HIERARCHY, STRIPE_PAYMENT_LINKS } from '@shared/constants/tiers';

type BillingPeriod = 'monthly' | 'annual';

interface PricingFeature {
  text: string;
  included: boolean;
  teaser?: string;
}

interface PricingTier {
  id: SubscriptionTier;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: '£0',
    annualPrice: '£0',
    description: 'Get started with basic features',
    features: [
      { text: 'Up to 10 contracts', included: true },
      { text: 'Contract templates', included: false },
      { text: 'E-signing', included: true },
      { text: 'AI Summary & Risk Score', included: false },
      { text: 'AI Red Flags Analysis', included: false },
      { text: 'AI Key Terms & Missing Clauses', included: false },
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    id: 'beta',
    name: 'AERMUSE Beta',
    monthlyPrice: '£10',
    annualPrice: '£100',
    description: 'Essential tools for artists',
    features: [
      { text: 'Unlimited contracts', included: true },
      { text: 'Contract templates', included: true },
      { text: 'E-signing', included: true },
      { text: 'AI Summary & Risk Score', included: true },
      { text: 'AI Red Flags Analysis', included: false, teaser: 'Alpha only' },
      { text: 'AI Key Terms & Missing Clauses', included: false, teaser: 'Alpha only' },
    ],
    cta: 'Start Beta',
    highlighted: false,
  },
  {
    id: 'alpha',
    name: 'AERMUSE Alpha',
    monthlyPrice: '£19.99',
    annualPrice: '£199',
    description: 'Complete contract intelligence',
    features: [
      { text: 'Unlimited contracts', included: true },
      { text: 'Contract templates', included: true },
      { text: 'E-signing', included: true },
      { text: 'AI Summary & Risk Score', included: true },
      { text: 'AI Red Flags Analysis', included: true },
      { text: 'AI Key Terms & Missing Clauses', included: true },
      { text: 'Aerival: Artist launcher', included: true },
    ],
    cta: 'Go Alpha',
    highlighted: true,
    badge: 'Recommended',
  },
  {
    id: 'theta',
    name: 'AERMUSE Theta',
    monthlyPrice: 'Coming Soon',
    annualPrice: 'Coming Soon',
    description: 'The ultimate artist platform',
    features: [
      { text: 'Everything in Alpha', included: true },
      { text: 'Canvas Video Loop', included: true },
      { text: 'Mailing List', included: true },
      { text: 'Track Preview Selection', included: true },
      { text: 'Merch Selling', included: true },
    ],
    cta: 'Contact Us',
    highlighted: false,
    badge: 'Exclusive',
  },
];

interface PricingCardProps {
  plan: PricingTier;
  currentTier: SubscriptionTier;
  isLoggedIn: boolean;
  billingPeriod: BillingPeriod;
  onSubscribe: (tier: 'beta' | 'alpha', billingPeriod: BillingPeriod) => void;
}

function PricingCard({ plan, currentTier, isLoggedIn, billingPeriod, onSubscribe }: PricingCardProps) {
  const isCurrentPlan = currentTier === plan.id;
  const canUpgrade = !isCurrentPlan && TIER_HIERARCHY[plan.id] > TIER_HIERARCHY[currentTier];
  const isHigherTier = TIER_HIERARCHY[plan.id] < TIER_HIERARCHY[currentTier];
  const isTheta = plan.id === 'theta';

  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const period = plan.id === 'free' ? 'forever' : isTheta ? '' : billingPeriod === 'monthly' ? '/month' : '/year';

  const handleClick = () => {
    if (plan.id === 'free') {
      window.location.href = isLoggedIn ? '/dashboard' : '/auth';
    } else if (isTheta) {
      // Theta is coming soon - no checkout yet
      return;
    } else if (canUpgrade) {
      onSubscribe(plan.id as 'beta' | 'alpha', billingPeriod);
    }
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (isHigherTier) return 'Included';
    if (isTheta && !isCurrentPlan) return 'Coming Soon';
    if (!isLoggedIn) return plan.cta;
    return canUpgrade ? 'Upgrade' : plan.cta;
  };

  const isDisabled = isCurrentPlan || isHigherTier || (isTheta && !isCurrentPlan);

  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 relative transition-all ${
        isTheta
          ? 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-[#F7E6CA] ring-4 ring-[#D4AF37]'
          : plan.highlighted
            ? 'bg-gradient-to-br from-[#660033] to-[#8B0045] text-[#F7E6CA] ring-4 ring-[#D4AF37] scale-105'
            : 'bg-white/80 text-[#660033]'
      }`}
    >
      {plan.badge && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-block px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
          isTheta
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-[#1a1a2e]'
            : 'bg-[#D4AF37] text-[#660033]'
        }`}>
          {isTheta && <Crown className="w-3 h-3 inline mr-1 -mt-0.5" />}
          {plan.badge}
        </span>
      )}

      <h3 className={`text-xl font-bold mb-2 font-playfair ${isTheta ? 'text-[#D4AF37]' : ''}`}>{plan.name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className={`text-4xl font-bold ${isTheta ? 'text-[#D4AF37]' : ''}`}>{price}</span>
        {period && (
          <span className={`text-sm ${plan.highlighted || isTheta ? 'opacity-70' : 'text-[#660033]/60'}`}>
            {period}
          </span>
        )}
      </div>

      <p className={`text-sm mb-6 ${plan.highlighted || isTheta ? 'opacity-80' : 'text-[#660033]/70'}`}>
        {plan.description}
      </p>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {feature.included ? (
              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isTheta ? 'text-[#D4AF37]' : plan.highlighted ? 'text-green-400' : 'text-green-600'}`} />
            ) : (
              <X className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted || isTheta ? 'opacity-40' : 'opacity-30'}`} />
            )}
            <span className={feature.included ? '' : plan.highlighted || isTheta ? 'opacity-50' : 'opacity-50'}>
              {feature.text}
              {feature.teaser && (
                <span className={`text-xs ml-1 ${plan.highlighted || isTheta ? 'text-[#D4AF37]' : 'text-amber-600'}`}>
                  ({feature.teaser})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          isTheta
            ? isCurrentPlan
              ? 'bg-[#D4AF37]/30 text-[#D4AF37]/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#D4AF37] to-[#F0D060] text-[#1a1a2e] cursor-not-allowed opacity-80'
            : plan.highlighted
              ? isDisabled
                ? 'bg-[#F7E6CA]/30 text-[#F7E6CA]/50 cursor-not-allowed'
                : 'bg-[#F7E6CA] text-[#660033] hover:bg-[#f0d9b8]'
              : isDisabled
                ? 'bg-[#660033]/10 text-[#660033]/50 cursor-not-allowed'
                : 'bg-[#660033] text-[#F7E6CA] hover:bg-[#4a0024]'
        }`}
      >
        {getButtonText()}
      </button>
    </div>
  );
}

export default function Pricing() {
  const { user } = useAuth();
  const { tier } = usePremium();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const handleSubscribe = (targetTier: 'beta' | 'alpha', period: BillingPeriod) => {
    if (!user) {
      window.location.href = `/auth?redirect=/pricing&tier=${targetTier}&billing=${period}`;
      return;
    }

    // Build payment link URL with prefilled email and client reference
    const billingKey = period === 'annual' ? 'yearly' : 'monthly';
    const paymentLink = STRIPE_PAYMENT_LINKS[targetTier][billingKey];
    const params = new URLSearchParams();

    if (user.email) {
      params.set('prefilled_email', user.email);
    }
    params.set('client_reference_id', user.id.toString());

    window.location.href = `${paymentLink}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7E6CA] to-white">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-[#660033]">
          AERMUSE
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
      <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-[#660033] mb-4 font-playfair">
          Choose Your Plan
        </h1>
        <p className="text-lg sm:text-xl text-[#660033]/80 max-w-2xl mx-auto">
          Protect your music career with AI-powered contract analysis
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 inline-flex items-center bg-white/60 rounded-full p-1 shadow-md">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-[#660033] text-[#F7E6CA] shadow-sm'
                : 'text-[#660033] hover:bg-white/50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              billingPeriod === 'annual'
                ? 'bg-[#660033] text-[#F7E6CA] shadow-sm'
                : 'text-[#660033] hover:bg-white/50'
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-[#D4AF37] text-[#660033] px-2 py-0.5 rounded-full font-bold">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
          {PRICING_TIERS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentTier={tier}
              isLoggedIn={!!user}
              billingPeriod={billingPeriod}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      </div>

      {/* Value Proposition */}
      <div className="bg-[#660033] text-[#F7E6CA] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">
            Why Musicians Choose AERMUSE
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
        <h2 className="text-3xl font-bold text-center mb-12 text-[#660033] font-playfair">
          Frequently Asked Questions
        </h2>
        <FAQ />
      </div>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-600">
          <p>&copy; {new Date().getFullYear()} AERMUSE. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/terms" className="hover:text-[#660033] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[#660033] transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
