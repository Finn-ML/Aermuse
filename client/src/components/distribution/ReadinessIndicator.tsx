import { Check, AlertCircle } from 'lucide-react';

interface ReadinessIndicatorProps {
  percentage: number;
  missing: string[];
  isReady: boolean;
  compact?: boolean;
}

export function ReadinessIndicator({ percentage, missing, isReady, compact = false }: ReadinessIndicatorProps) {
  const getColor = () => {
    if (isReady) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
    if (percentage >= 30) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
    return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' };
  };

  const colors = getColor();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${colors.text}`}>{percentage}%</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 ${colors.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${colors.text}`}>
          {isReady ? 'Distribution Ready' : 'Distribution Readiness'}
        </span>
        <span className={`text-sm font-bold ${colors.text}`}>{percentage}%</span>
      </div>
      <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 mb-1">Missing fields:</p>
          {missing.map((field) => (
            <div key={field} className="flex items-center gap-1.5 text-xs text-gray-600">
              <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
              {field}
            </div>
          ))}
        </div>
      )}
      {isReady && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700">
          <Check size={12} />
          All required fields completed
        </div>
      )}
    </div>
  );
}
