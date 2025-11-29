import { useState } from 'react';
import { AlertCircle, X, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onResend: () => Promise<void>;
}

export function VerificationBanner({ onResend }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await onResend();
      setSent(true);
      toast({
        title: "Email Sent",
        description: "Please check your inbox for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800 text-sm">
            Please verify your email address to access all features.
            {sent ? (
              <span className="ml-2 text-green-600 inline-flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Email sent! Check your inbox.
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={sending}
                className="ml-2 text-[#660033] hover:underline disabled:opacity-50 font-medium inline-flex items-center gap-1"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend verification email'
                )}
              </button>
            )}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
