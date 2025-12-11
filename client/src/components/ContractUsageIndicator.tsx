import { Link } from 'wouter';
import { useContractUsage } from '@/hooks/useContractUsage';

export function ContractUsageIndicator() {
  const { current, limit, isLimited, isNearLimit, isAtLimit, isLoading } = useContractUsage();

  if (isLoading || !isLimited) return null;

  return (
    <div className={`
      p-3 rounded-lg text-sm
      ${isAtLimit ? 'bg-red-100 text-red-800' :
        isNearLimit ? 'bg-amber-100 text-amber-800' :
        'bg-gray-100 text-gray-600'}
    `}>
      <div className="flex items-center justify-between">
        <span>
          {current} of {limit} contracts used
        </span>
        {(isNearLimit || isAtLimit) && (
          <Link href="/pricing" className="font-medium underline hover:no-underline">
            Upgrade
          </Link>
        )}
      </div>

      {/* Progress bar */}
      {limit && (
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isAtLimit ? 'bg-red-500' :
              isNearLimit ? 'bg-amber-500' :
              'bg-[#660033]'
            }`}
            style={{ width: `${Math.min((current / limit) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
