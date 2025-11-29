import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  analysisCount?: number;
  rateLimit?: { remaining: number; resetIn: string };
}

export function ReanalyzeConfirmModal({
  onConfirm,
  onCancel,
  rateLimit,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-[#660033]" />
            <h2 className="text-lg font-semibold">Re-analyze Contract?</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-gray-600">
            Running a new analysis will replace your current results. This action
            uses one of your hourly analysis credits.
          </p>

          {rateLimit && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium">
                  {rateLimit.remaining} analyses remaining
                </p>
                <p className="text-amber-700">Limit resets {rateLimit.resetIn}</p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500">
            <p>Re-analysis may provide different results because:</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>AI models are continuously improved</li>
              <li>Analysis can vary slightly between runs</li>
              <li>New patterns may be detected</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-[#660033] hover:bg-[#4d0026] text-white"
          >
            Re-analyze
          </Button>
        </div>
      </div>
    </div>
  );
}
