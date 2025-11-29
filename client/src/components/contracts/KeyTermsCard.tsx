import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { KeyTerm } from '../../types';

interface Props {
  keyTerms: KeyTerm[];
}

const riskColors = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

const riskIcons = {
  low: CheckCircle,
  medium: AlertCircle,
  high: AlertCircle,
};

export function KeyTermsCard({ keyTerms }: Props) {
  if (!keyTerms || keyTerms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Key Terms</h3>
      </div>

      <div className="space-y-4">
        {keyTerms.map((term, index) => {
          const RiskIcon = riskIcons[term.risk];

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${riskColors[term.risk]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{term.term}</span>
                    {term.section && (
                      <span className="text-xs text-gray-500">
                        ({term.section})
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{term.value}</div>
                  <p className="mt-2 text-sm opacity-90">{term.explanation}</p>
                </div>
                <div className="flex-shrink-0">
                  <RiskIcon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Low Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>High Risk</span>
        </div>
      </div>
    </div>
  );
}
