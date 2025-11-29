import { FileSearch, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { MissingClause } from '../../types';

interface Props {
  missingClauses: MissingClause[];
}

const importanceConfig = {
  recommended: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
    label: 'Recommended',
  },
  important: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800',
    label: 'Important',
  },
  essential: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    textColor: 'text-red-800',
    label: 'Essential',
  },
};

export function MissingClausesCard({ missingClauses }: Props) {
  if (!missingClauses || missingClauses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="h-5 w-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">
          Missing Protections
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Consider requesting these clauses be added to protect your interests:
      </p>

      <div className="space-y-3">
        {missingClauses.map((clause, index) => {
          const config =
            importanceConfig[clause.importance as keyof typeof importanceConfig] || importanceConfig.recommended;
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${config.textColor}`}>
                      {clause.clause}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${config.textColor} opacity-90`}>
                    {clause.explanation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
