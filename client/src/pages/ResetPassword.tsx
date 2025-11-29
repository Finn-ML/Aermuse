import { useState, useEffect } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import ShaderAnimation from '@/components/ShaderAnimation';
import GrainOverlay from '@/components/GrainOverlay';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const search = useSearch();
  const token = new URLSearchParams(search).get('token');
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Password Reset",
          description: "Your password has been reset successfully.",
        });
        // Redirect to auth page after 2 seconds
        setTimeout(() => setLocation('/auth'), 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex items-center justify-center relative overflow-hidden">
        <GrainOverlay />
        <ShaderAnimation variant="auth" />
        <div className="relative z-10 text-center p-8">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
          <p className="text-[rgba(102,0,51,0.7)] mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/auth">
            <button className="bg-[#660033] text-[#F7E6CA] px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
              Back to Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex items-center justify-center relative overflow-hidden">
        <GrainOverlay />
        <ShaderAnimation variant="auth" />
        <div className="relative z-10 text-center p-8">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h1 className="text-2xl font-bold mb-4">Password Reset Complete</h1>
          <p className="text-[rgba(102,0,51,0.7)] mb-6">
            Your password has been reset successfully. Redirecting to sign in...
          </p>
          <Link href="/auth">
            <button className="bg-[#660033] text-[#F7E6CA] px-8 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
              Sign In Now
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] flex relative overflow-hidden">
      <style>{`
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }

        .input-field {
          background: rgba(255, 255, 255, 0.6);
          border: 2px solid rgba(102, 0, 51, 0.1);
          border-radius: 16px;
          padding: 18px 24px;
          font-size: 16px;
          font-weight: 500;
          color: #660033;
          width: 100%;
          transition: all 0.3s ease;
        }

        .input-field::placeholder {
          color: rgba(102, 0, 51, 0.4);
          font-weight: 400;
        }

        .input-field:focus {
          outline: none;
          border-color: #660033;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 30px rgba(102, 0, 51, 0.1);
        }

        .btn-primary {
          background: #660033;
          color: #F7E6CA;
          border: none;
          padding: 18px 48px;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(102, 0, 51, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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
          <h1 className="text-3xl font-bold text-center mb-2">Reset Password</h1>
          <p className="text-center text-[rgba(102,0,51,0.7)] mb-8">
            Enter your new password below
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block mb-2 text-[13px] font-semibold tracking-[0.05em] uppercase text-[rgba(102,0,51,0.7)]">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-14"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)] hover:text-[#660033] transition-colors p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="mb-8">
              <label className="block mb-2 text-[13px] font-semibold tracking-[0.05em] uppercase text-[rgba(102,0,51,0.7)]">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              Reset Password
            </button>

            <p className="text-center mt-8 text-sm text-[rgba(102,0,51,0.6)]">
              Remember your password?{' '}
              <Link href="/auth" className="text-[#660033] font-semibold hover:opacity-70 transition-opacity">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
