import { Link } from 'wouter';
import { Lock, Sparkles, ExternalLink, Mail, BarChart3, FileText, ShoppingBag, Users, Radio } from 'lucide-react';

interface PremiumFeatureGateProps {
  feature: 'landing' | 'proposals' | 'analytics' | 'contract-templates' | 'merch-selling' | 'mailing-list' | 'distribution';
  children?: React.ReactNode;
}

const featureInfo = {
  landing: {
    title: 'Landing Page Builder',
    description: 'Create a stunning artist page with your bio, links, and media. Share it with fans and industry contacts.',
    icon: ExternalLink,
    tier: 'Beta' as const,
    price: '£10/month',
    benefits: [
      'Custom artist bio and avatar',
      'Add unlimited links (music, social, merchandise)',
      'Embedded video and audio players',
      'Custom themes and colors',
      'Analytics and visitor insights',
    ],
  },
  proposals: {
    title: 'Proposal Inbox',
    description: 'Receive and manage collaboration proposals directly from your landing page.',
    icon: Mail,
    tier: 'Beta' as const,
    price: '£10/month',
    benefits: [
      'Receive proposals from your landing page',
      'Organized inbox with status tracking',
      'Convert proposals to contracts',
      'Email notifications for new proposals',
      'Archive and manage history',
    ],
  },
  analytics: {
    title: 'Analytics Dashboard',
    description: 'Track your landing page performance with detailed visitor analytics.',
    icon: BarChart3,
    tier: 'Beta' as const,
    price: '£10/month',
    benefits: [
      'Page view tracking',
      'Unique visitor counts',
      'Link click analytics',
      'Time on page metrics',
      'Traffic source insights',
    ],
  },
  'contract-templates': {
    title: 'Contract Templates',
    description: 'Access professionally-crafted music industry contract templates to streamline your workflow.',
    icon: FileText,
    tier: 'Beta' as const,
    price: '£10/month',
    benefits: [
      'Artist collaboration agreements',
      'Sync licensing contracts',
      'Production and beat licensing deals',
      'Management contracts',
      'Distribution agreements',
      'Pre-filled custom fields',
      'Legally reviewed templates',
    ],
  },
  'merch-selling': {
    title: 'Merch Store',
    description: 'Sell merchandise directly to your fans with your own integrated store.',
    icon: ShoppingBag,
    tier: 'Theta' as const,
    price: '£27.02/month',
    benefits: [
      'Create and manage products',
      'Set your own prices and variants',
      'Track orders and inventory',
      'Sell directly from your artist page',
      'Keep more of your earnings',
      'Automated order notifications',
    ],
  },
  'mailing-list': {
    title: 'Mailing List',
    description: 'Build and engage your fanbase with email collection and campaign tools.',
    icon: Users,
    tier: 'Theta' as const,
    price: '£27.02/month',
    benefits: [
      'Collect fan email addresses',
      'Build your subscriber list',
      'Send email campaigns to fans',
      'Track subscriber growth',
      'Export your mailing list',
      'Embed signup on your artist page',
    ],
  },
  'distribution': {
    title: 'Distribution',
    description: 'Prepare your tracks for distribution to streaming platforms like Spotify and Apple Music.',
    icon: Radio,
    tier: 'Beta' as const,
    price: '£10/month',
    benefits: [
      'ISRC code generation for your tracks',
      'Complete distribution metadata management',
      'Genre, credits, and rights information',
      'Distribution readiness tracking',
      'Prepare for Spotify, Apple Music, and more',
    ],
  },
};

export function PremiumFeatureGate({ feature, children }: PremiumFeatureGateProps) {
  const info = featureInfo[feature];
  const Icon = info.icon;

  return (
    <div className="relative">
      {/* Blurred preview background */}
      {children && (
        <div className="absolute inset-0 overflow-hidden rounded-[20px]">
          <div className="blur-sm opacity-30 pointer-events-none scale-95">
            {children}
          </div>
        </div>
      )}

      {/* Lock overlay */}
      <div className="relative z-10 rounded-[20px] p-8 md:p-12" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-[#660033] mb-3">
            {info.title}
          </h2>
          <p className="text-[rgba(102,0,51,0.7)] text-lg mb-8">
            {info.description}
          </p>

          {/* Benefits */}
          <div className="bg-[rgba(102,0,51,0.03)] rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-[#660033] mb-4 flex items-center gap-2">
              <Icon className="h-5 w-5" />
              What you'll get with {info.tier}
            </h3>
            <ul className="space-y-3">
              {info.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3 text-[rgba(102,0,51,0.8)]">
                  <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-lg hover:bg-[#4a0024] transition-all hover:scale-105"
          >
            <Sparkles className="h-5 w-5" />
            Upgrade to {info.tier} - {info.price}
          </Link>

          <p className="mt-4 text-sm text-[rgba(102,0,51,0.5)]">
            Cancel anytime. No commitment required.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline premium badge for navigation items
 */
export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded ${className}`}>
      <Sparkles className="h-2.5 w-2.5" />
      PRO
    </span>
  );
}
