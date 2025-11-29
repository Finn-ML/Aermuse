import { Loader2 } from 'lucide-react';

export function AnalyzingState() {
  return (
    <div className="bg-white rounded-lg border p-8 text-center">
      <div className="relative inline-flex items-center justify-center w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-[#660033]/10"></div>
        <Loader2 className="h-10 w-10 animate-spin text-[#660033]" />
      </div>

      <h3 className="mt-4 text-xl font-semibold text-gray-900">
        Analyzing Your Contract
      </h3>

      <p className="mt-2 text-gray-600 max-w-md mx-auto">
        Our AI is reviewing your contract to provide a plain-language summary,
        identify key terms, and flag any potential concerns.
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
        <div className="flex gap-1">
          <div
            className="w-2 h-2 rounded-full bg-[#660033] animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-[#660033] animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 rounded-full bg-[#660033] animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <span>This usually takes 30-45 seconds</span>
      </div>
    </div>
  );
}
