import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  extraction: {
    success: boolean;
    charCount: number;
    pageCount?: number;
    warning?: string;
    error?: string;
  };
  onRetry?: () => void;
}

export function ExtractionStatus({ extraction, onRetry }: Props) {
  if (extraction.success) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">
            Text extracted successfully
          </span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          {extraction.charCount.toLocaleString()} characters
          {extraction.pageCount && ` from ${extraction.pageCount} pages`}
        </p>
      </div>
    );
  }

  if (extraction.warning) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-medium text-amber-800">
            Limited extraction
          </span>
        </div>
        <p className="text-sm text-amber-700 mt-1">{extraction.warning}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-amber-800 hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-center gap-2">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="font-medium text-red-800">
          Extraction failed
        </span>
      </div>
      <p className="text-sm text-red-700 mt-1">
        {extraction.error || 'Unable to extract text from this document'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-red-800 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
