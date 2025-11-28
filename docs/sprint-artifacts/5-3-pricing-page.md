# Story 5.3: Pricing Page

## Story Overview

| Field | Value |
|-------|-------|
| **Story ID** | 5.3 |
| **Epic** | Epic 5: Subscription & Billing |
| **Title** | Pricing Page |
| **Priority** | P0 - Critical |
| **Story Points** | 3 |
| **Status** | Drafted |

## User Story

**As a** visitor or free user
**I want** to see clear pricing information
**So that** I can decide to subscribe

## Context

The pricing page is a key conversion point. It needs to clearly communicate the value proposition of Aermuse Premium, show what's included in free vs premium tiers, and make it easy to start the subscription process.

**Dependencies:**
- Story 5.1 (Stripe Integration Setup)

## Acceptance Criteria

- [ ] **AC-1:** Pricing page accessible at `/pricing`
- [ ] **AC-2:** Free tier features clearly listed
- [ ] **AC-3:** Premium tier features clearly listed (£9/month)
- [ ] **AC-4:** Visual comparison between tiers
- [ ] **AC-5:** "Get Started" button for premium redirects to checkout
- [ ] **AC-6:** Logged-in users with premium see "Current Plan" badge
- [ ] **AC-7:** FAQ section addresses common questions
- [ ] **AC-8:** Mobile responsive design
- [ ] **AC-9:** Clear value proposition messaging

## Technical Requirements

### Files to Create/Modify

| File | Changes |
|------|---------|
| `client/src/pages/Pricing.tsx` | New: Pricing page component |
| `client/src/components/pricing/PricingCard.tsx` | New: Tier comparison card |
| `client/src/components/pricing/FeatureList.tsx` | New: Feature list component |
| `client/src/components/pricing/FAQ.tsx` | New: FAQ accordion |
| `client/src/App.tsx` | Add pricing route |

### Implementation

#### Pricing Page

```tsx
// client/src/pages/Pricing.tsx
import { useNavigate } from 'react-router-dom';
import { Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PricingCard } from '../components/pricing/PricingCard';
import { FAQ } from '../components/pricing/FAQ';

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

export function Pricing() {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();

  const isPremium = subscription?.tier === 'premium';

  const handleGetPremium = () => {
    if (!user) {
      // Redirect to login with return URL
      navigate('/login?redirect=/pricing&action=subscribe');
    } else {
      // Redirect to checkout
      navigate('/checkout');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
            buttonText={user ? 'Current Plan' : 'Get Started'}
            buttonVariant="secondary"
            onButtonClick={() => !user && navigate('/register')}
            disabled={!!user}
            current={!!user && !isPremium}
          />

          {/* Premium Tier */}
          <PricingCard
            name="Premium"
            price="£9"
            period="per month"
            description="Everything you need to protect your music career"
            features={PREMIUM_FEATURES}
            buttonText={isPremium ? 'Current Plan' : 'Get Premium'}
            buttonVariant="primary"
            onButtonClick={handleGetPremium}
            disabled={isPremium}
            current={isPremium}
            highlighted
            badge="Most Popular"
          />
        </div>
      </div>

      {/* Value Proposition */}
      <div className="bg-burgundy text-white py-16">
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
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <FAQ />
      </div>

      {/* Final CTA */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to protect your music career?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of artists who trust Aermuse to review their contracts.
          </p>
          {!isPremium && (
            <button
              onClick={handleGetPremium}
              className="px-8 py-3 bg-burgundy text-white rounded-lg hover:bg-burgundy-dark font-medium text-lg"
            >
              Start Your Premium Trial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Pricing Card Component

```tsx
// client/src/components/pricing/PricingCard.tsx
import { Check, X } from 'lucide-react';

interface Feature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

interface Props {
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  buttonText: string;
  buttonVariant: 'primary' | 'secondary';
  onButtonClick: () => void;
  disabled?: boolean;
  current?: boolean;
  highlighted?: boolean;
  badge?: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant,
  onButtonClick,
  disabled,
  current,
  highlighted,
  badge,
}: Props) {
  return (
    <div
      className={`
        relative rounded-2xl p-8
        ${highlighted
          ? 'bg-white shadow-xl ring-2 ring-burgundy'
          : 'bg-white shadow-lg'
        }
      `}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-burgundy text-white px-4 py-1 rounded-full text-sm font-medium">
            {badge}
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {current && (
        <div className="absolute top-4 right-4">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
            Current Plan
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-500">/{period}</span>
        </div>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>

      {/* Features */}
      <ul className="space-y-4 mb-8">
        {features.map((feature) => (
          <li key={feature.name} className="flex items-start gap-3">
            {feature.included ? (
              <Check
                className={`h-5 w-5 flex-shrink-0 ${
                  feature.highlight ? 'text-burgundy' : 'text-green-500'
                }`}
              />
            ) : (
              <X className="h-5 w-5 flex-shrink-0 text-gray-300" />
            )}
            <span
              className={`${
                feature.included
                  ? feature.highlight
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-700'
                  : 'text-gray-400'
              }`}
            >
              {feature.name}
            </span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <button
        onClick={onButtonClick}
        disabled={disabled}
        className={`
          w-full py-3 rounded-lg font-medium transition-colors
          ${buttonVariant === 'primary'
            ? 'bg-burgundy text-white hover:bg-burgundy-dark disabled:bg-gray-300'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-100'
          }
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        {buttonText}
      </button>
    </div>
  );
}
```

#### FAQ Component

```tsx
// client/src/components/pricing/FAQ.tsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards including Visa, Mastercard, and American Express. Payments are securely processed through Stripe.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time from your billing settings. You\'ll continue to have access until the end of your current billing period.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'We offer a free tier that lets you try Aermuse with up to 3 contracts. This lets you experience the platform before committing to Premium.',
  },
  {
    question: 'What happens to my contracts if I cancel?',
    answer: 'Your contracts remain safely stored in your account. However, you\'ll lose access to AI analysis and e-signing features until you resubscribe.',
  },
  {
    question: 'Is the AI analysis legally binding advice?',
    answer: 'No, Aermuse provides AI-powered analysis to help you understand your contracts, but it\'s not a substitute for professional legal advice. We always recommend consulting with a qualified attorney for important legal decisions.',
  },
  {
    question: 'How secure is my contract data?',
    answer: 'We take security seriously. All documents are encrypted at rest and in transit. We never share your data with third parties, and you can delete your data at any time.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'You can upgrade to Premium at any time. If you downgrade, you\'ll keep Premium access until your current billing period ends.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">{faq.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-gray-500 transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-4 pb-4 text-gray-600">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### Route Configuration

```tsx
// client/src/App.tsx - Add route
import { Pricing } from './pages/Pricing';

// In routes:
<Route path="/pricing" element={<Pricing />} />
```

## Definition of Done

- [ ] Pricing page renders at /pricing
- [ ] Both tiers clearly displayed
- [ ] Feature comparison accurate
- [ ] Premium button initiates checkout flow
- [ ] Current plan indicator for logged-in users
- [ ] FAQ section complete
- [ ] Mobile responsive
- [ ] Value proposition section included

## Testing Checklist

### Unit Tests

- [ ] PricingCard renders features correctly
- [ ] FAQ accordion opens/closes
- [ ] Button states based on auth status

### Integration Tests

- [ ] Anonymous user → Get Premium → Login redirect
- [ ] Free user → Get Premium → Checkout
- [ ] Premium user sees current plan badge

### Visual Tests

- [ ] Desktop layout (side by side cards)
- [ ] Mobile layout (stacked cards)
- [ ] Highlighted premium card stands out

## Related Documents

- [Epic 5 Tech Spec](./tech-spec-epic-5.md)
- [Story 5.4: Stripe Checkout Flow](./5-4-stripe-checkout-flow.md)
- [Story 5.8: Subscription Paywall](./5-8-subscription-paywall.md)
