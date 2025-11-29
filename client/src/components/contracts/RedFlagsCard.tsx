import { useState } from 'react';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronUp, Lightbulb, CheckCircle } from 'lucide-react';
import { RedFlag } from '../../types';

interface Props {
  redFlags: RedFlag[];
}

const severityConfig = {
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
    label: 'Warning',
  },
  critical: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
    label: 'Critical',
  },
};

const categoryColors: Record<string, string> = {
  Rights: 'bg-purple-100 text-purple-700',
  Revenue: 'bg-green-100 text-green-700',
  Termination: 'bg-orange-100 text-orange-700',
  Exclusivity: 'bg-blue-100 text-blue-700',
  Duration: 'bg-pink-100 text-pink-700',
  Obligations: 'bg-cyan-100 text-cyan-700',
  default: 'bg-gray-100 text-gray-700',
};

export function RedFlagsCard({ redFlags }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!redFlags || redFlags.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">No Red Flags Detected</h3>
            <p className="text-sm text-green-700">
              This contract appears to have fair and balanced terms. However, we still
              recommend having a legal professional review it before signing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const criticalCount = redFlags.filter((f) => f.severity === 'critical').length;
  const warningCount = redFlags.filter((f) => f.severity === 'warning').length;

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Potential Issues Found
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-sm rounded-full font-medium">
              {warningCount} Warnings
            </span>
          )}
        </div>
      </div>

      {/* Red Flags List */}
      <div className="space-y-3">
        {redFlags.map((flag, index) => {
          const config = severityConfig[flag.severity as keyof typeof severityConfig] || severityConfig.warning;
          const Icon = config.icon;
          const isExpanded = expandedIndex === index;
          const categoryColor =
            categoryColors[flag.category] || categoryColors.default;

          return (
            <div
              key={index}
              className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
            >
              {/* Header - Always visible */}
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full p-4 flex items-start gap-3 text-left"
              >
                <Icon
                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${config.textColor}`}>
                      {flag.issue}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${categoryColor}`}
                    >
                      {flag.category}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 ml-8 space-y-3">
                  {/* Quoted Clause */}
                  {flag.clause && (
                    <div className="p-3 bg-white/70 rounded border border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        "{flag.clause}"
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  <div>
                    <p className={`text-sm ${config.textColor}`}>
                      {flag.explanation}
                    </p>
                  </div>

                  {/* Recommendation */}
                  {flag.recommendation && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                      <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-medium text-blue-800 uppercase">
                          Recommendation
                        </span>
                        <p className="text-sm text-blue-700 mt-1">
                          {flag.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
