import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import ShaderAnimation from '@/components/ShaderAnimation';
import GrainOverlay from '@/components/GrainOverlay';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activeTab === 'login') {
        await login(formData.email, formData.password);
        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Error",
            description: "Passwords don't match.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        if (!termsAccepted) {
          toast({
            title: "Error",
            description: "Please accept the terms and conditions.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          artistName: formData.name,
        });
        toast({
          title: "Account created!",
          description: "Welcome to Aermuse.",
        });
      }
      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        .tab-btn {
          background: transparent;
          color: rgba(102, 0, 51, 0.5);
          border: none;
          padding: 16px 32px;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .tab-btn.active {
          color: #660033;
        }
        
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 3px;
          background: #660033;
          border-radius: 3px;
        }
        
        .link {
          color: #660033;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.3s ease;
        }
        
        .link:hover {
          opacity: 0.7;
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
          <div 
            className="flex justify-center mb-12 rounded-[20px] p-2"
            style={{ background: 'rgba(255, 255, 255, 0.4)' }}
          >
            <button 
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
              data-testid="button-signin-tab"
            >
              Sign In
            </button>
            <button 
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
              data-testid="button-register-tab"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div 
              className="mb-5 transition-opacity duration-300"
              style={{ 
                opacity: activeTab === 'register' ? 1 : 0,
                height: activeTab === 'register' ? 'auto' : 0,
                overflow: 'hidden'
              }}
            >
              <label className="block mb-2 text-[13px] font-semibold tracking-[0.05em] uppercase text-[rgba(102,0,51,0.7)]">
                Artist / Band Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Your stage name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field"
                tabIndex={activeTab === 'register' ? 0 : -1}
                data-testid="input-name"
              />
            </div>

            <div className="mb-5">
              <label className="block mb-2 text-[13px] font-semibold tracking-[0.05em] uppercase text-[rgba(102,0,51,0.7)]">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                required
                data-testid="input-email"
              />
            </div>

            <div className="mb-5">
              <label className="block mb-2 text-[13px] font-semibold tracking-[0.05em] uppercase text-[rgba(102,0,51,0.7)]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field pr-14"
                  required
                  minLength={6}
                  data-testid="input-password"
                />
                <button 
                  type="button"
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)] hover:text-[#660033] transition-colors p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div 
              className="mb-5 transition-opacity duration-300"
              style={{ 
                opacity: activeTab === 'register' ? 1 : 0,
                height: activeTab === 'register' ? 'auto' : 0,
                overflow: 'hidden'
              }}
            >
              <label className="block mb-2 text-[13px] font-semibold tracking-[0.05em] uppercase text-[rgba(102,0,51,0.7)]">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-field"
                tabIndex={activeTab === 'register' ? 0 : -1}
                data-testid="input-confirm-password"
              />
            </div>

            <div className="h-[52px] mb-6">
              {activeTab === 'login' ? (
                <div className="text-center">
                  <a href="#" className="link text-sm" data-testid="link-forgot-password">
                    Forgot password?
                  </a>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 accent-[#660033] mt-0.5 flex-shrink-0"
                    data-testid="checkbox-terms"
                  />
                  <label 
                    htmlFor="terms" 
                    className="text-sm text-[rgba(102,0,51,0.7)] leading-[1.5]"
                  >
                    I agree to the <a href="#" className="link">Terms of Service</a> and <a href="#" className="link">Privacy Policy</a>
                  </label>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSubmitting}
              data-testid="button-submit"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              {activeTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-center mt-8 text-sm text-[rgba(102,0,51,0.6)]">
              {activeTab === 'login' ? (
                <>Don't have an account? <button type="button" className="link" onClick={() => setActiveTab('register')} data-testid="link-create-account">Create one</button></>
              ) : (
                <>Already have an account? <button type="button" className="link" onClick={() => setActiveTab('login')} data-testid="link-signin">Sign in</button></>
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
