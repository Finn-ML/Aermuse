import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Menu, X } from 'lucide-react';
import ShaderAnimation from '@/components/ShaderAnimation';
import GrainOverlay from '@/components/GrainOverlay';

export default function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      title: 'AI Contract Intelligence',
      description: 'Navigate complex agreements with AI that understands the music industry. Flag unfavorable terms, suggest revisions, and sign with confidence.',
      icon: '§'
    },
    {
      title: 'E-Signature Integration',
      description: 'Send contracts for signature directly from the platform. Track status, collect signatures, and store signed documents securely.',
      icon: '◈'
    },
    {
      title: 'Artist Landing Pages',
      description: 'Stunning, customizable pages that capture your aesthetic. One link for everything—streaming links, social profiles, and more.',
      icon: '◎'
    },
    {
      title: 'Contract Templates',
      description: 'Professional music industry templates ready to customize. Artist agreements, sync licenses, production deals—all legally reviewed.',
      icon: '◆'
    }
  ];

  const testimonials = [
    { name: 'Mira Voss', role: 'Electronic Producer', quote: 'Finally, a platform that treats artists like professionals, not products.' },
    { name: 'The Fernwood Collective', role: 'Indie Folk Band', quote: 'The contract analysis alone has saved us from multiple bad deals.' },
    { name: 'D. Monarch', role: 'R&B Artist', quote: 'The contract AI saved me from a terrible publishing deal. Invaluable.' }
  ];

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] overflow-hidden relative">
      <style>{`
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .nav-link {
          position: relative;
          text-decoration: none;
          color: #660033;
          font-weight: 400;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: all 0.3s ease;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 1px;
          background: #660033;
          transition: width 0.3s ease;
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .btn-primary {
          background: #660033;
          color: #F7E6CA;
          border: none;
          padding: 18px 48px;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(102, 0, 51, 0.3);
        }

        .btn-secondary {
          background: transparent;
          color: #660033;
          border: 2px solid #660033;
          padding: 16px 48px;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50px;
        }

        .btn-secondary:hover {
          background: #660033;
          color: #F7E6CA;
        }

        .feature-card {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .feature-card:hover {
          transform: translateY(-8px);
        }
      `}</style>

      <GrainOverlay />

      <div
        className="absolute rounded-full border border-[rgba(102,0,51,0.1)] hidden md:block w-48 h-48 lg:w-80 lg:h-80 xl:w-[400px] xl:h-[400px] top-[10%] right-[5%]"
        style={{ animation: 'float 8s ease-in-out infinite' }}
      />
      <div
        className="absolute rounded-full border border-[rgba(102,0,51,0.08)] hidden lg:block w-40 h-40 lg:w-60 lg:h-60 xl:w-[300px] xl:h-[300px] bottom-[20%] -left-12 lg:-left-24"
        style={{ animation: 'float 10s ease-in-out infinite 2s' }}
      />

      <nav
        className={`flex justify-between items-center relative z-10 transition-opacity duration-1000 px-4 sm:px-8 md:px-12 lg:px-20 py-6 sm:py-8 lg:py-10 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="text-xl sm:text-2xl lg:text-[28px] font-light tracking-[0.3em]">
          AERMUSE
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex gap-6 lg:gap-12 items-center">
          <a href="#features" className="nav-link" data-testid="link-features">Features</a>
          <a href="#testimonials" className="nav-link" data-testid="link-testimonials">Testimonials</a>
          <Link href="/pricing" className="nav-link" data-testid="link-pricing">Pricing</Link>
          <Link href="/auth">
            <button className="btn-primary px-6 py-3 lg:px-8 lg:py-3.5" data-testid="button-get-started">
              Get Started
            </button>
          </Link>
        </div>
        {/* Mobile burger menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 -mr-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] text-[#660033]"
          data-testid="button-mobile-menu"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu panel */}
          <div
            className="absolute top-0 right-0 w-[280px] h-full bg-[#F7E6CA] p-6"
            style={{ boxShadow: '-10px 0 40px rgba(102, 0, 51, 0.2)' }}
          >
            <div className="flex justify-between items-center mb-8">
              <div className="text-xl font-light tracking-[0.25em] text-[#660033]">
                AERMUSE
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-[rgba(102,0,51,0.06)] text-[#660033]"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-[#660033] font-medium hover:bg-[rgba(102,0,51,0.06)] transition-colors"
              >
                Features
              </a>
              <a
                href="#testimonials"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-[#660033] font-medium hover:bg-[rgba(102,0,51,0.06)] transition-colors"
              >
                Testimonials
              </a>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-[#660033] font-medium hover:bg-[rgba(102,0,51,0.06)] transition-colors"
              >
                Pricing
              </Link>
              <div className="border-t border-[rgba(102,0,51,0.1)] my-4" />
              <Link
                href="/auth?mode=login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-[#660033] font-medium hover:bg-[rgba(102,0,51,0.06)] transition-colors"
              >
                Sign In
              </Link>
              <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full btn-primary px-6 py-3 mt-2" data-testid="button-get-started-mobile">
                  Start Free
                </button>
              </Link>
            </nav>
          </div>
        </div>
      )}

      <section
        className="relative min-h-[60vh] lg:min-h-[80vh] px-4 sm:px-8 md:px-12 lg:px-20 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-20 items-center"
      >
        <div>
          <div
            className={`transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '200ms' }}
          >
            <p className="text-xs tracking-[0.3em] uppercase mb-8 font-normal">
              The Artist Operating System
            </p>
          </div>

          <h1
            className={`font-light leading-[1.05] mb-10 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{
              fontSize: 'clamp(48px, 7vw, 96px)',
              transitionDelay: '400ms'
            }}
          >
            Your career,<br />
            <span className="font-bold">orchestrated</span>
          </h1>

          <p
            className={`text-lg leading-[1.8] max-w-[480px] font-normal mb-12 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{
              color: 'rgba(102, 0, 51, 0.8)',
              transitionDelay: '600ms'
            }}
          >
            AI-powered contract analysis. E-signatures. Beautiful landing pages.
            Professional templates. Everything independent artists need to thrive.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-4 sm:gap-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '800ms' }}
          >
            <Link href="/auth">
              <button className="btn-primary w-full sm:w-auto" data-testid="button-start-free">Start Free</button>
            </Link>
            <Link href="/pricing">
              <button className="btn-secondary w-full sm:w-auto" data-testid="button-view-pricing">View Pricing</button>
            </Link>
          </div>

          <p
            className={`mt-6 text-sm transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ color: 'rgba(102, 0, 51, 0.6)', transitionDelay: '900ms' }}
          >
            Free forever for basic features. Premium from £10/month.
          </p>
        </div>

        <div
          className={`relative overflow-hidden transition-opacity duration-1000 h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px] rounded-2xl lg:rounded-[32px] hidden sm:block ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '600ms' }}
        >
          <ShaderAnimation variant="landing" />

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, transparent 0%, rgba(102, 0, 51, 0.2) 100%)'
            }}
          />

          <div
            className="absolute z-10 top-4 right-4 lg:top-[60px] lg:right-[40px] p-4 lg:p-6 rounded-xl lg:rounded-[20px] hidden md:block"
            style={{
              background: 'rgba(247, 230, 202, 0.9)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(102, 0, 51, 0.25)',
              animation: 'float 6s ease-in-out infinite'
            }}
          >
            <div className="text-[10px] lg:text-[11px] tracking-[0.2em] uppercase mb-1 lg:mb-2 opacity-60">
              Contract Analysis
            </div>
            <div className="text-lg lg:text-2xl font-light">3 clauses flagged</div>
          </div>

          <div
            className="absolute z-10 bottom-16 left-2 lg:bottom-[120px] lg:left-[20px] p-4 lg:p-6 rounded-xl lg:rounded-[20px] hidden lg:block"
            style={{
              background: 'rgba(247, 230, 202, 0.9)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(102, 0, 51, 0.25)',
              animation: 'float 7s ease-in-out infinite 1s'
            }}
          >
            <div className="text-[10px] lg:text-[11px] tracking-[0.2em] uppercase mb-1 lg:mb-2 opacity-60">
              Risk Score
            </div>
            <div className="text-lg lg:text-2xl font-light">Medium Risk</div>
          </div>

          <div
            className="absolute z-10 bg-[#660033] text-[#F7E6CA] top-24 left-4 lg:top-[200px] lg:left-[60px] p-4 lg:p-8 rounded-xl lg:rounded-[20px] hidden lg:block"
            style={{
              boxShadow: '0 30px 80px rgba(102, 0, 51, 0.4)',
              animation: 'float 8s ease-in-out infinite 0.5s'
            }}
          >
            <div className="text-[10px] lg:text-[11px] tracking-[0.2em] uppercase mb-2 lg:mb-3 opacity-70">
              Contracts
            </div>
            <div className="text-xl lg:text-[32px] font-light">12 Active</div>
            <div className="text-xs mt-2 opacity-70">
              2 awaiting signature
            </div>
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden mx-4 sm:mx-8 md:mx-12 lg:mx-20 py-4 lg:py-6 rounded-full lg:rounded-[100px]"
        style={{ background: 'rgba(255, 255, 255, 0.3)' }}
      >
        <div
          className="flex gap-8 sm:gap-12 lg:gap-20 text-[11px] sm:text-xs lg:text-[13px] tracking-[0.15em] sm:tracking-[0.2em] uppercase whitespace-nowrap"
          style={{
            color: 'rgba(102, 0, 51, 0.5)',
            animation: 'marquee 30s linear infinite'
          }}
        >
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-8 sm:gap-12 lg:gap-20">
              <span>◈ AI Contract Analysis</span>
              <span>◈ E-Signatures</span>
              <span>◈ Landing Pages</span>
              <span>◈ Contract Templates</span>
              <span>◈ Document Storage</span>
              <span>◈ Risk Assessment</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative px-4 sm:px-8 md:px-12 lg:px-20 py-16 sm:py-24 lg:py-32 xl:py-40">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-12 sm:mb-16 lg:mb-24 gap-4">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-4 sm:mb-6 font-light">
              Features
            </p>
            <h2
              className="font-light leading-[1.15]"
              style={{ fontSize: 'clamp(28px, 5vw, 64px)' }}
            >
              Built for the<br />
              <span className="font-bold">modern artist</span>
            </h2>
          </div>
          <div className="hidden sm:block w-20 h-[3px] bg-[#660033] rounded mt-0 sm:mt-12" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card cursor-pointer p-6 sm:p-8 lg:p-10 xl:p-12 rounded-2xl lg:rounded-3xl border-2 transition-all"
              style={{
                background: activeFeature === index
                  ? 'rgba(255, 255, 255, 0.5)'
                  : 'rgba(255, 255, 255, 0.2)',
                borderColor: activeFeature === index
                  ? 'rgba(102, 0, 51, 0.15)'
                  : 'transparent'
              }}
              onMouseEnter={() => setActiveFeature(index)}
              data-testid={`card-feature-${index}`}
            >
              <div
                className="text-2xl sm:text-3xl lg:text-[32px] mb-4 sm:mb-6 lg:mb-8 transition-opacity duration-300"
                style={{ opacity: activeFeature === index ? 1 : 0.4 }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 leading-[1.3]">
                {feature.title}
              </h3>
              <p
                className="text-sm leading-[1.7] font-normal"
                style={{ color: 'rgba(102, 0, 51, 0.7)' }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 sm:px-8 md:px-12 lg:px-20 py-16 sm:py-24 lg:py-32">
        <div className="text-center mb-14 lg:mb-20">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase mb-4 sm:mb-6 font-light">
            How It Works
          </p>
          <h2
            className="font-light"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            Get started in <span className="font-bold">minutes</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16 max-w-5xl mx-auto">
          <div className="text-center">
            <div
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8 text-2xl lg:text-3xl font-bold text-[#F7E6CA]"
              style={{ background: '#660033' }}
            >
              1
            </div>
            <h3 className="text-xl lg:text-2xl font-semibold mb-3 lg:mb-4">Upload Your Contract</h3>
            <p className="text-sm lg:text-base leading-relaxed" style={{ color: 'rgba(102, 0, 51, 0.7)' }}>
              Drop in any music contract—PDF, Word, or use our templates.
            </p>
          </div>
          <div className="text-center">
            <div
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8 text-2xl lg:text-3xl font-bold text-[#F7E6CA]"
              style={{ background: '#660033' }}
            >
              2
            </div>
            <h3 className="text-xl lg:text-2xl font-semibold mb-3 lg:mb-4">AI Analysis</h3>
            <p className="text-sm lg:text-base leading-relaxed" style={{ color: 'rgba(102, 0, 51, 0.7)' }}>
              Our AI scans for red flags, unfair terms, and missing protections.
            </p>
          </div>
          <div className="text-center">
            <div
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8 text-2xl lg:text-3xl font-bold text-[#F7E6CA]"
              style={{ background: '#660033' }}
            >
              3
            </div>
            <h3 className="text-xl lg:text-2xl font-semibold mb-3 lg:mb-4">Sign with Confidence</h3>
            <p className="text-sm lg:text-base leading-relaxed" style={{ color: 'rgba(102, 0, 51, 0.7)' }}>
              Negotiate better terms and e-sign directly from the platform.
            </p>
          </div>
        </div>
      </section>

      <section id="testimonials" className="px-4 sm:px-8 md:px-12 lg:px-20 py-16 sm:py-24 lg:py-32 xl:py-40">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase mb-4 sm:mb-6 font-light">
            Testimonials
          </p>
          <h2
            className="font-light"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            Trusted by <span className="font-bold">artists</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 sm:p-10 lg:p-12 rounded-2xl lg:rounded-3xl"
              style={{ background: 'rgba(255, 255, 255, 0.4)' }}
              data-testid={`card-testimonial-${index}`}
            >
              <p
                className="text-lg sm:text-xl lg:text-xl leading-[1.7] mb-8 sm:mb-10 italic"
                style={{ color: 'rgba(102, 0, 51, 0.85)' }}
              >
                "{testimonial.quote}"
              </p>
              <div>
                <div className="font-semibold text-lg">{testimonial.name}</div>
                <div
                  className="text-sm sm:text-base"
                  style={{ color: 'rgba(102, 0, 51, 0.6)' }}
                >
                  {testimonial.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="px-4 sm:px-8 md:px-12 lg:px-20 py-12 sm:py-16 lg:py-20">
        <div
          className="rounded-2xl sm:rounded-3xl lg:rounded-[40px] p-8 sm:p-12 lg:p-16"
          style={{ background: 'rgba(255, 255, 255, 0.5)' }}
        >
          <div className="text-center mb-8 lg:mb-12">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 font-light">
              Simple Pricing
            </p>
            <h2
              className="font-light mb-6"
              style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
            >
              Start free,<br /><span className="font-bold">upgrade when ready</span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(102, 0, 51, 0.8)' }}>
              Get started with our free tier. Unlock more features as your needs grow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="text-3xl font-bold mb-2">£0</div>
              <div className="text-sm font-semibold mb-4">Free</div>
              <ul className="text-sm space-y-2" style={{ color: 'rgba(102, 0, 51, 0.7)' }}>
                <li>• Up to 10 contracts</li>
                <li>• Contract storage</li>
                <li>• Basic features</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="text-3xl font-bold mb-2">£10</div>
              <div className="text-sm font-semibold mb-4">Beta /mo</div>
              <ul className="text-sm space-y-2" style={{ color: 'rgba(102, 0, 51, 0.7)' }}>
                <li>• Unlimited contracts</li>
                <li>• E-signatures</li>
                <li>• AI Summary & Risk Score</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl text-[#F7E6CA]" style={{ background: '#660033' }}>
              <div className="text-3xl font-bold mb-2">£19.99</div>
              <div className="text-sm font-semibold mb-4">Alpha /mo</div>
              <ul className="text-sm space-y-2 opacity-90">
                <li>• Everything in Beta</li>
                <li>• AI Red Flags Analysis</li>
                <li>• AI Key Terms & Clauses</li>
              </ul>
            </div>
          </div>
          <div className="text-center">
            <Link href="/pricing">
              <button className="btn-primary">View Full Pricing</button>
            </Link>
          </div>
        </div>
      </section>

      <section
        className="text-center text-[#F7E6CA] mx-4 sm:mx-8 md:mx-12 lg:mx-20 px-4 sm:px-8 lg:px-16 xl:px-20 py-12 sm:py-16 lg:py-20 xl:py-24 rounded-2xl sm:rounded-3xl lg:rounded-[40px]"
        style={{ background: '#660033' }}
      >
        <h2
          className="font-light mb-4 sm:mb-6"
          style={{ fontSize: 'clamp(24px, 4vw, 56px)' }}
        >
          Ready to own your <span className="font-bold">artistry</span>?
        </h2>
        <p
          className="text-base sm:text-lg mb-8 sm:mb-10 lg:mb-12 max-w-lg mx-auto px-4"
          style={{ color: 'rgba(247, 230, 202, 0.8)' }}
        >
          Join thousands of artists who are taking control of their contracts and careers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth">
            <button
              className="btn-primary px-8 py-4 sm:py-3"
              style={{
                background: '#F7E6CA',
                color: '#660033'
              }}
              data-testid="button-get-started-footer"
            >
              Get Started Free
            </button>
          </Link>
          <Link href="/pricing">
            <button
              className="btn-secondary px-8 py-4 sm:py-3"
              style={{
                borderColor: '#F7E6CA',
                color: '#F7E6CA'
              }}
            >
              View Pricing
            </button>
          </Link>
        </div>
      </section>

      <footer className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-4 px-4 sm:px-8 md:px-12 lg:px-20 py-8 sm:py-12 lg:py-16">
        <div className="text-lg sm:text-xl font-light tracking-[0.25em]">
          AERMUSE
        </div>
        <div className="flex gap-6 sm:gap-10">
          <Link href="/privacy" className="nav-link text-sm">Privacy</Link>
          <Link href="/terms" className="nav-link text-sm">Terms</Link>
          <button onClick={() => setShowContactPopup(true)} className="nav-link text-sm">Contact</button>
        </div>
        <div
          className="text-xs sm:text-sm text-center sm:text-right"
          style={{ color: 'rgba(102, 0, 51, 0.5)' }}
        >
          © 2025 AERMUSE. All rights reserved.
        </div>
      </footer>

      {/* Contact Popup */}
      {showContactPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowContactPopup(false)}
        >
          <div
            className="bg-[#F7E6CA] rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#660033]">Contact Us</h3>
              <button
                onClick={() => setShowContactPopup(false)}
                className="text-[#660033]/50 hover:text-[#660033] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-[#660033]/70 mb-4">
              Have questions or feedback? Reach out to us at:
            </p>
            <a
              href="mailto:served@aermuse.com"
              className="block text-center py-3 px-4 bg-[#660033] text-[#F7E6CA] rounded-xl font-medium hover:shadow-lg transition-all"
            >
              served@aermuse.com
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
