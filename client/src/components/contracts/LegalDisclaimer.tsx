import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, Scale } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

interface Props {
  className?: string;
  variant?: 'banner' | 'compact' | 'footer';
  expandable?: boolean;
}

const DISCLAIMER_SHORT = `This AI analysis is for informational purposes only and does not constitute legal advice.`;

const DISCLAIMER_FULL = `This AI-powered contract analysis is provided for informational and educational purposes only.
It does not constitute legal advice, and should not be relied upon as a substitute for consultation with a qualified
attorney. The analysis may not identify all issues in a contract, and interpretations may vary.

By using this feature, you acknowledge that:
  - The AI may make errors or miss important issues
  - Contract law varies by jurisdiction and specific circumstances
  - Only a licensed attorney can provide legal advice
  - You should consult a legal professional before making decisions based on this analysis

Aermuse Ltd and its affiliates disclaim all liability for actions taken or not taken based on this analysis.`;

export function LegalDisclaimer({
  className = '',
  variant = 'banner',
  expandable = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (variant === 'compact') {
    return (
      <div className={`text-xs text-[rgba(102,0,51,0.5)] ${className}`}>
        <AlertCircle className="inline h-3 w-3 mr-1" />
        {DISCLAIMER_SHORT}
        <Link href="/terms" className="ml-1 text-[#660033] hover:underline">
          Terms
        </Link>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div
        className={`rounded-[24px] p-6 ${className}`}
        style={{
          background: 'rgba(102, 0, 51, 0.05)',
          border: '1px solid rgba(102, 0, 51, 0.1)'
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(102, 0, 51, 0.1)' }}
          >
            <Scale className="h-4 w-4 text-[#660033]" />
          </div>
          <div>
            <p className="text-sm text-[rgba(102,0,51,0.7)]">{DISCLAIMER_SHORT}</p>
            <Link
              href="/terms"
              className="text-sm text-[#660033] hover:underline mt-2 inline-flex items-center gap-1"
            >
              View full terms of service
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div
      className={`rounded-[24px] overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(102, 0, 51, 0.08) 0%, rgba(139, 0, 69, 0.06) 100%)',
        border: '1px solid rgba(102, 0, 51, 0.15)'
      }}
    >
      <div className="px-6 py-5">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            <Scale className="h-5 w-5 text-[#F7E6CA]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-[#660033]">
                AI Analysis Disclaimer
              </p>
              {expandable && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: 'rgba(102, 0, 51, 0.1)',
                    color: '#660033'
                  }}
                >
                  {expanded ? (
                    <>
                      Less <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      More <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-[rgba(102,0,51,0.7)] mt-2">{DISCLAIMER_SHORT}</p>

            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: expanded ? '400px' : '0',
                opacity: expanded ? 1 : 0,
              }}
            >
              <div
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid rgba(102, 0, 51, 0.15)' }}
              >
                <p className="text-sm text-[rgba(102,0,51,0.7)] whitespace-pre-line leading-relaxed">
                  {DISCLAIMER_FULL}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <Link
                href="/terms"
                className="text-sm font-medium text-[#660033] hover:underline flex items-center gap-1"
              >
                Terms of Service
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
