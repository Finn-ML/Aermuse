import { Link } from 'wouter';
import { Sparkles, Lock } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: 'inline' | 'card' | 'badge';
  className?: string;
}

/**
 * Reusable component to prompt users to upgrade to premium
 */
export function UpgradePrompt({
  feature,
  description,
  variant = 'inline',
  className = ''
}: UpgradePromptProps) {
  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded ${className}`}>
        <Sparkles className="h-3 w-3" />
        Premium
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6 text-center ${className}`}>
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-[#660033] mb-2">{feature}</h3>
        {description && (
          <p className="text-[#660033]/70 text-sm mb-4">{description}</p>
        )}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Premium
        </Link>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg ${className}`}>
      <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#660033]">
          <span className="font-medium">{feature}</span> is a premium feature.
        </p>
        {description && (
          <p className="text-xs text-[#660033]/70 mt-0.5">{description}</p>
        )}
      </div>
      <Link
        href="/pricing"
        className="flex-shrink-0 px-3 py-1.5 bg-[#660033] text-[#F7E6CA] text-sm font-medium rounded hover:bg-[#4a0024] transition-colors"
      >
        Upgrade
      </Link>
    </div>
  );
}

interface ContractLimitPromptProps {
  current: number;
  limit: number;
  className?: string;
}

/**
 * Specific component for contract limit reached state
 */
export function ContractLimitPrompt({ current, limit, className = '' }: ContractLimitPromptProps) {
  return (
    <div className={`bg-gradient-to-br from-[#660033]/5 to-[#660033]/10 border-2 border-[#660033]/20 rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#660033] rounded-full flex items-center justify-center flex-shrink-0">
          <Lock className="h-6 w-6 text-[#F7E6CA]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[#660033] mb-1">You've Hit Your Free Limit</h3>
          <p className="text-[#660033]/70 text-sm mb-1">
            You've used all <span className="font-semibold">{limit} contracts</span> on the free plan.
          </p>
          <p className="text-[#660033]/60 text-xs mb-4">
            Upgrade to unlock unlimited contracts, AI analysis, and e-signatures.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#660033] text-[#F7E6CA] rounded-lg hover:bg-[#4a0024] transition-colors font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Now
            </Link>
            <span className="text-xs text-[#660033]/50">From £9.99/month</span>
          </div>
        </div>
      </div>
    </div>
  );
}
