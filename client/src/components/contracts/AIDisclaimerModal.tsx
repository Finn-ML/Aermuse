import { useState } from 'react';
import { AlertTriangle, Scale, Bot, CheckCircle2, X } from 'lucide-react';
import { Link } from 'wouter';

interface AIDisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  isLoading?: boolean;
}

export function AIDisclaimerModal({ isOpen, onAccept, isLoading }: AIDisclaimerModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#660033] to-[#8B0045] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Analysis Disclaimer</h2>
              <p className="text-sm text-white/80">Please read before viewing analysis</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto max-h-[50vh]">
          <div className="space-y-5">
            {/* Important Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">Important Notice</h3>
                  <p className="text-sm text-amber-700">
                    The AI-powered contract analysis provided by AERMUSE is for <strong>informational
                    and educational purposes only</strong>. This analysis does not constitute legal advice
                    and should not be relied upon as a substitute for consultation with a qualified attorney.
                  </p>
                </div>
              </div>
            </div>

            {/* Limitations */}
            <div>
              <h3 className="font-semibold text-[#660033] mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Limitations of AI Analysis
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-[#660033] mt-1">•</span>
                  <span>The AI may not identify all issues, risks, or problematic clauses in a contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#660033] mt-1">•</span>
                  <span>Interpretations may vary based on jurisdiction, context, and specific circumstances</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#660033] mt-1">•</span>
                  <span>The analysis is based on general patterns and may not account for your specific situation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#660033] mt-1">•</span>
                  <span>Contract law is complex and varies significantly by location and industry</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#660033] mt-1">•</span>
                  <span>AI technology has inherent limitations and may produce errors or inaccuracies</span>
                </li>
              </ul>
            </div>

            {/* Your Responsibilities */}
            <div>
              <h3 className="font-semibold text-[#660033] mb-3">Your Responsibilities</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Always consult a licensed attorney for legal advice on important contracts</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Do not rely solely on this analysis for legal or business decisions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Use this tool as a starting point for understanding, not as final guidance</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>You are responsible for your own legal and business decisions</span>
                </li>
              </ul>
            </div>

            {/* Limitation of Liability */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p>
                <strong>Limitation of Liability:</strong> Aermuse Ltd and its affiliates disclaim all
                liability for actions taken or not taken based on this AI analysis. We provide this
                tool "as-is" without warranties of any kind.
              </p>
              <p className="mt-2">
                For complete terms, please review our{' '}
                <Link href="/terms" className="text-[#660033] hover:underline font-medium">
                  Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          {/* Acknowledgment Checkbox */}
          <label className="flex items-start gap-3 mb-4 cursor-pointer group">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-5 h-5 accent-[#660033] mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900">
              I have read and understand that the AI analysis is for informational purposes only
              and does not constitute legal advice. I agree to consult a qualified attorney for
              legal decisions.
            </span>
          </label>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            disabled={!acknowledged || isLoading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              acknowledged && !isLoading
                ? 'bg-[#660033] hover:bg-[#4a0024] cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                I Understand - Show Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
