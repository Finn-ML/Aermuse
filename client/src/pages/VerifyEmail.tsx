import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import ShaderAnimation from '@/components/ShaderAnimation';
import GrainOverlay from '@/components/GrainOverlay';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const search = useSearch();
  const token = new URLSearchParams(search).get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex relative overflow-hidden">
      <style>{`
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }
      `}</style>

      <GrainOverlay />

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <ShaderAnimation variant="auth" />

        <div
          className={`relative z-10 text-center transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <Link href="/">
            <div
              className="text-5xl font-light tracking-[0.3em] lowercase text-[#F7E6CA] mb-6 cursor-pointer"
              style={{ textShadow: '0 4px 30px rgba(102, 0, 51, 0.3)' }}
            >
              aermuse
            </div>
          </Link>
          <p className="text-lg font-normal text-[rgba(247,230,202,0.8)] max-w-[300px] leading-[1.6]">
            Where artistry meets intelligence
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-15 relative z-10">
        <div
          className={`w-full max-w-[440px] transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="bg-white/80 rounded-2xl p-8 shadow-lg text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 text-[#660033] animate-spin" />
                <h1 className="text-2xl font-bold text-[#660033] mb-2">Verifying Email</h1>
                <p className="text-[rgba(102,0,51,0.7)]">
                  Please wait while we verify your email address...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                <h1 className="text-2xl font-bold text-[#660033] mb-2">Email Verified!</h1>
                <p className="text-[rgba(102,0,51,0.7)] mb-6">{message}</p>
                <Link href="/dashboard">
                  <button className="bg-[#660033] text-[#F7E6CA] px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
                    Go to Dashboard
                  </button>
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h1 className="text-2xl font-bold text-[#660033] mb-2">Verification Failed</h1>
                <p className="text-[rgba(102,0,51,0.7)] mb-6">{message}</p>
                <div className="space-y-3">
                  <Link href="/dashboard">
                    <button className="w-full bg-[#660033] text-[#F7E6CA] px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
                      Go to Dashboard
                    </button>
                  </Link>
                  <p className="text-sm text-[rgba(102,0,51,0.6)]">
                    You can request a new verification email from your dashboard.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
