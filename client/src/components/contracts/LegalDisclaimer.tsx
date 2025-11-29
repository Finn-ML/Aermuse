import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
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
      <div className={`text-xs text-gray-500 ${className}`}>
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
      <div className={`border-t pt-4 mt-6 ${className}`}>
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p>{DISCLAIMER_SHORT}</p>
            <Link href="/terms" className="text-[#660033] hover:underline">
              View full terms of service
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-lg ${className}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-amber-800 font-medium">
                AI Analysis Disclaimer
              </p>
              {expandable && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-amber-600 hover:text-amber-800 flex items-center gap-1 text-sm"
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
            <p className="text-sm text-amber-700 mt-1">{DISCLAIMER_SHORT}</p>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-sm text-amber-700 whitespace-pre-line">
                  {DISCLAIMER_FULL}
                </p>
              </div>
            )}

            <div className="mt-2 flex items-center gap-4 text-sm">
              <Link
                href="/terms"
                className="text-amber-600 hover:text-amber-800 flex items-center gap-1"
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
