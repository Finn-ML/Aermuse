import { useState } from 'react';
import { FileSearch, Info, AlertCircle, AlertTriangle, ChevronDown, Plus, Shield } from 'lucide-react';
import { MissingClause } from '../../types';

interface Props {
  missingClauses: MissingClause[];
}

const importanceConfig = {
  recommended: {
    icon: Info,
    bg: 'rgba(102, 0, 51, 0.1)',
    border: 'rgba(102, 0, 51, 0.2)',
    iconBg: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)',
    textColor: '#660033',
    label: 'Recommended',
  },
  important: {
    icon: AlertCircle,
    bg: 'rgba(212, 175, 55, 0.15)',
    border: 'rgba(212, 175, 55, 0.3)',
    iconBg: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
    textColor: '#B8860B',
    label: 'Important',
  },
  essential: {
    icon: AlertTriangle,
    bg: 'rgba(220, 53, 69, 0.15)',
    border: 'rgba(220, 53, 69, 0.3)',
    iconBg: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)',
    textColor: '#dc3545',
    label: 'Essential',
  },
};

export function MissingClausesCard({ missingClauses }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!missingClauses || missingClauses.length === 0) {
    return (
      <div
        className="rounded-[20px] p-7"
        style={{
          background: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' }}
          >
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#B8860B]">All Key Protections Present</h3>
            <p className="text-[rgba(184,134,11,0.8)] mt-1 text-sm">
              This contract includes the standard protective clauses expected for this type of agreement.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const essentialCount = missingClauses.filter((c) => c.importance === 'essential').length;
  const importantCount = missingClauses.filter((c) => c.importance === 'important').length;

  return (
    <div
      className="rounded-[20px] p-7"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            <FileSearch className="h-5 w-5 text-[#F7E6CA]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#660033]">Missing Protections</h3>
            <p className="text-sm text-[rgba(102,0,51,0.5)]">Consider requesting these clauses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {essentialCount > 0 && (
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] text-white"
              style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}
            >
              {essentialCount} Essential
            </span>
          )}
          {importantCount > 0 && (
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em]"
              style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#B8860B' }}
            >
              {importantCount} Important
            </span>
          )}
        </div>
      </div>

      {/* Clauses List */}
      <div className="space-y-3">
        {missingClauses.map((clause, index) => {
          const config =
            importanceConfig[clause.importance as keyof typeof importanceConfig] || importanceConfig.recommended;
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              className="rounded-xl overflow-hidden transition-all duration-300"
              style={{
                background: config.bg,
                border: `1px solid ${config.border}`,
              }}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full p-4 flex items-start gap-3 text-left hover:bg-white/30 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: config.iconBg }}
                >
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#660033] text-[15px]">{clause.clause}</span>
                    <span
                      className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full"
                      style={{ background: config.bg, color: config.textColor, border: `1px solid ${config.border}` }}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                  style={{
                    background: 'rgba(102, 0, 51, 0.08)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                >
                  <ChevronDown className="h-4 w-4 text-[#660033]" />
                </div>
              </button>

              {/* Expanded Content */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: isExpanded ? '300px' : '0',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <div className="px-4 pb-4 ml-12">
                  <p className="text-sm text-[rgba(102,0,51,0.8)] leading-relaxed">
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
