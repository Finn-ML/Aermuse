import { useState } from 'react';
import { DollarSign, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KeyTerm } from '../../types';

interface Props {
  keyTerms: KeyTerm[];
}

const riskConfig = {
  low: {
    bg: 'rgba(212, 175, 55, 0.15)',
    border: 'rgba(212, 175, 55, 0.3)',
    iconBg: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
    textColor: '#B8860B',
    label: 'Fair Term',
    Icon: TrendingUp,
  },
  medium: {
    bg: 'rgba(139, 0, 69, 0.12)',
    border: 'rgba(139, 0, 69, 0.25)',
    iconBg: 'linear-gradient(135deg, #8B0045 0%, #660033 100%)',
    textColor: '#8B0045',
    label: 'Review',
    Icon: Minus,
  },
  high: {
    bg: 'rgba(220, 53, 69, 0.15)',
    border: 'rgba(220, 53, 69, 0.3)',
    iconBg: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)',
    textColor: '#dc3545',
    label: 'Attention',
    Icon: TrendingDown,
  },
};

export function KeyTermsCard({ keyTerms }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!keyTerms || keyTerms.length === 0) {
    return null;
  }

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
            <DollarSign className="h-5 w-5 text-[#F7E6CA]" />
          </div>
          <h3 className="text-lg font-bold text-[#660033]">Key Terms</h3>
        </div>
        <span className="text-sm text-[rgba(102,0,51,0.5)]">{keyTerms.length} terms identified</span>
      </div>

      {/* Terms List */}
      <div className="space-y-3">
        {keyTerms.map((term, index) => {
          const config = riskConfig[term.risk as keyof typeof riskConfig] || riskConfig.medium;
          const Icon = config.Icon;
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
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#660033] text-[15px]">{term.term}</span>
                    {term.section && (
                      <span
                        className="px-2 py-0.5 text-[11px] rounded-full"
                        style={{ background: 'rgba(102, 0, 51, 0.08)', color: 'rgba(102, 0, 51, 0.6)' }}
                      >
                        {term.section}
                      </span>
                    )}
                    <span
                      className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full"
                      style={{ background: config.bg, color: config.textColor, border: `1px solid ${config.border}` }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="mt-1 font-bold text-[#660033]">{term.value}</div>
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
                  maxHeight: isExpanded ? '200px' : '0',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <div className="px-4 pb-4 ml-12">
                  <p className="text-sm text-[rgba(102,0,51,0.8)] leading-relaxed">
                    {term.explanation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-5 border-t border-[rgba(102,0,51,0.08)] flex items-center gap-5 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
          <span className="text-[rgba(102,0,51,0.6)] text-xs">Fair Terms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#8B0045]" />
          <span className="text-[rgba(102,0,51,0.6)] text-xs">Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#dc3545]" />
          <span className="text-[rgba(102,0,51,0.6)] text-xs">Attention</span>
        </div>
      </div>
    </div>
  );
}
