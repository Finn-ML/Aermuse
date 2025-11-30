import { useState } from 'react';
import { AlertTriangle, AlertCircle, ChevronDown, Lightbulb, CheckCircle, Shield } from 'lucide-react';
import { RedFlag } from '../../types';

interface Props {
  redFlags: RedFlag[];
}

const severityConfig = {
  warning: {
    icon: AlertCircle,
    bg: 'rgba(212, 175, 55, 0.15)',
    border: 'rgba(212, 175, 55, 0.3)',
    iconBg: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
    textColor: '#B8860B',
    label: 'Warning',
  },
  critical: {
    icon: AlertTriangle,
    bg: 'rgba(220, 53, 69, 0.15)',
    border: 'rgba(220, 53, 69, 0.3)',
    iconBg: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)',
    textColor: '#dc3545',
    label: 'Critical',
  },
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  Rights: { bg: 'rgba(102, 0, 51, 0.1)', text: '#660033' },
  Revenue: { bg: 'rgba(212, 175, 55, 0.15)', text: '#B8860B' },
  Termination: { bg: 'rgba(220, 53, 69, 0.15)', text: '#dc3545' },
  Exclusivity: { bg: 'rgba(102, 0, 51, 0.1)', text: '#660033' },
  Duration: { bg: 'rgba(139, 0, 69, 0.1)', text: '#8B0045' },
  Obligations: { bg: 'rgba(212, 175, 55, 0.15)', text: '#B8860B' },
  default: { bg: 'rgba(102, 0, 51, 0.1)', text: '#660033' },
};

export function RedFlagsCard({ redFlags }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!redFlags || redFlags.length === 0) {
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
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#B8860B]">No Red Flags Detected</h3>
            <p className="text-[rgba(184,134,11,0.8)] mt-1 text-sm">
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
    <div
      className="rounded-[20px] p-7"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: criticalCount > 0
                ? 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)'
                : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)'
            }}
          >
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-[#660033]">Potential Issues</h3>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] text-white"
              style={{ background: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)' }}
            >
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em]"
              style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#B8860B' }}
            >
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
          const categoryStyle = categoryColors[flag.category] || categoryColors.default;

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
                    <span className="font-semibold text-[#660033] text-[15px]">{flag.issue}</span>
                    <span
                      className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] rounded-full"
                      style={{ background: categoryStyle.bg, color: categoryStyle.text }}
                    >
                      {flag.category}
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
                  maxHeight: isExpanded ? '500px' : '0',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <div className="px-4 pb-4 ml-12 space-y-3">
                  {flag.clause && (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        border: '1px solid rgba(102, 0, 51, 0.1)'
                      }}
                    >
                      <p className="text-sm text-[rgba(102,0,51,0.7)] italic leading-relaxed">
                        "{flag.clause}"
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-[rgba(102,0,51,0.8)] leading-relaxed">
                    {flag.explanation}
                  </p>

                  {flag.recommendation && (
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{
                        background: 'rgba(102, 0, 51, 0.05)',
                        border: '1px solid rgba(102, 0, 51, 0.1)'
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                      >
                        <Lightbulb className="h-3.5 w-3.5 text-[#F7E6CA]" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-[#660033] uppercase tracking-[0.05em]">
                          Recommendation
                        </span>
                        <p className="text-sm text-[rgba(102,0,51,0.8)] mt-1 leading-relaxed">
                          {flag.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
