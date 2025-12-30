import { Sparkles, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { usePremium } from '@/hooks/usePremium';
import { FAQ } from '@/components/pricing/FAQ';
import { Link } from 'wouter';
import type { SubscriptionTier } from '@shared/schema';
import { TIER_HIERARCHY, STRIPE_PAYMENT_LINKS } from '@shared/constants/tiers';

interface PricingFeature {
  text: string;
  included: boolean;
  teaser?: string;
}

interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  period: string;
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
    price: '£0',
    period: 'forever',
    description: 'Get started with basic features',
    features: [
      { text: 'Up to 10 contracts', included: true },
      { text: 'Contract templates', included: false },
      { text: 'E-signing', included: false },
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
    price: '£10',
    period: '/month',
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
    price: '£19.99',
    period: '/month',
    description: 'Complete contract intelligence',
    features: [
      { text: 'Unlimited contracts', included: true },
      { text: 'Contract templates', included: true },
      { text: 'E-signing', included: true },
      { text: 'AI Summary & Risk Score', included: true },
      { text: 'AI Red Flags Analysis', included: true },
      { text: 'AI Key Terms & Missing Clauses', included: true },
    ],
    cta: 'Go Alpha',
    highlighted: true,
    badge: 'Recommended',
  },
];

interface PricingCardProps {
  plan: PricingTier;
  currentTier: SubscriptionTier;
  isLoggedIn: boolean;
  onSubscribe: (tier: 'beta' | 'alpha') => void;
}

function PricingCard({ plan, currentTier, isLoggedIn, onSubscribe }: PricingCardProps) {
  const isCurrentPlan = currentTier === plan.id;
  const canUpgrade = !isCurrentPlan && TIER_HIERARCHY[plan.id] > TIER_HIERARCHY[currentTier];
  const isHigherTier = TIER_HIERARCHY[plan.id] < TIER_HIERARCHY[currentTier];

  const handleClick = () => {
    if (plan.id === 'free') {
      window.location.href = isLoggedIn ? '/dashboard' : '/auth';
    } else if (canUpgrade) {
      onSubscribe(plan.id as 'beta' | 'alpha');
    }
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (isHigherTier) return 'Included';
    if (!isLoggedIn) return plan.cta;
    return canUpgrade ? 'Upgrade' : plan.cta;
  };

  const isDisabled = isCurrentPlan || isHigherTier;

  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 relative transition-all ${
        plan.highlighted
          ? 'bg-gradient-to-br from-[#660033] to-[#8B0045] text-[#F7E6CA] ring-4 ring-[#D4AF37] scale-105'
          : 'bg-white/80 text-[#660033]'
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-block px-3 py-1 bg-[#D4AF37] text-[#660033] text-xs font-bold rounded-full whitespace-nowrap">
          {plan.badge}
        </span>
      )}

      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold">{plan.price}</span>
        <span className={`text-sm ${plan.highlighted ? 'opacity-70' : 'text-[#660033]/60'}`}>
          {plan.period}
        </span>
      </div>

      <p className={`text-sm mb-6 ${plan.highlighted ? 'opacity-80' : 'text-[#660033]/70'}`}>
        {plan.description}
      </p>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {feature.included ? (
              <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-green-400' : 'text-green-600'}`} />
            ) : (
              <X className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'opacity-40' : 'opacity-30'}`} />
            )}
            <span className={feature.included ? '' : plan.highlighted ? 'opacity-50' : 'opacity-50'}>
              {feature.text}
              {feature.teaser && (
                <span className={`text-xs ml-1 ${plan.highlighted ? 'text-[#D4AF37]' : 'text-amber-600'}`}>
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
          plan.highlighted
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

  const handleSubscribe = (targetTier: 'beta' | 'alpha') => {
    if (!user) {
      window.location.href = `/auth?redirect=/pricing&tier=${targetTier}`;
      return;
    }

    // Build payment link URL with prefilled email and client reference
    const paymentLink = STRIPE_PAYMENT_LINKS[targetTier];
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
        <h1 className="text-3xl sm:text-5xl font-bold text-[#660033] mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg sm:text-xl text-[#660033]/80 max-w-2xl mx-auto">
          Protect your music career with AI-powered contract analysis
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 items-start">
          {PRICING_TIERS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentTier={tier}
              isLoggedIn={!!user}
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
        <h2 className="text-3xl font-bold text-center mb-12 text-[#660033]">
          Frequently Asked Questions
        </h2>
        <FAQ />
      </div>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} AERMUSE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
