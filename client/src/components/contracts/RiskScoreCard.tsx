import { Shield } from 'lucide-react';
import { RiskAssessment } from '../../types';

interface Props {
  riskAssessment: RiskAssessment;
}

const riskConfig = {
  low: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    label: 'Low Risk',
    description: 'This contract has generally fair terms.',
  },
  medium: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    label: 'Medium Risk',
    description: 'Some terms may need negotiation.',
  },
  high: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    label: 'High Risk',
    description: 'Significant concerns - review carefully.',
  },
};

export function RiskScoreCard({ riskAssessment }: Props) {
  if (!riskAssessment) {
    return null;
  }

  const config = riskConfig[riskAssessment.overallRisk as keyof typeof riskConfig] || riskConfig.medium;
  const score = riskAssessment.overallScore ?? 50;

  // Calculate ring progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const progress = (score / 100) * circumference;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Score Circle */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke={
                score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
              }
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${config.color}`}>{score}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1">
          <div className={`text-lg font-semibold ${config.color}`}>
            {config.label}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {riskAssessment.summary || config.description}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {riskAssessment.breakdown && riskAssessment.breakdown.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Risk by Category
          </h4>
          <div className="space-y-2">
            {riskAssessment.breakdown.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 truncate">
                  {item.category}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.score >= 70
                        ? 'bg-green-500'
                        : item.score >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <div className="w-8 text-sm text-gray-500 text-right">
                  {item.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
