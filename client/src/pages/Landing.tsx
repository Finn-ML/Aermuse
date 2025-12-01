import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import ShaderAnimation from '@/components/ShaderAnimation';
import GrainOverlay from '@/components/GrainOverlay';

export default function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [email, setEmail] = useState('');

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
      title: 'Exclusive Fan Spaces',
      description: 'Create gated content experiences. Unreleased tracks, behind-the-scenes, early access—monetize your most dedicated audience.',
      icon: '◈'
    },
    {
      title: 'Artist Landing Pages',
      description: 'Stunning, customizable pages that capture your aesthetic. One link for everything—tour dates, releases, merch, and more.',
      icon: '◎'
    },
    {
      title: 'Fan Relationship CRM',
      description: 'Know your audience intimately. Track engagement, segment superfans, and build lasting connections that transcend algorithms.',
      icon: '◆'
    }
  ];

  const testimonials = [
    { name: 'Mira Voss', role: 'Electronic Producer', quote: 'Finally, a platform that treats artists like professionals, not products.' },
    { name: 'The Fernwood Collective', role: 'Indie Folk Band', quote: 'Our fan relationships have never been stronger. The CRM alone is worth it.' },
    { name: 'D. Monarch', role: 'R&B Artist', quote: 'The contract AI saved me from a terrible publishing deal. Invaluable.' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Waitlist submission:', email);
    setEmail('');
  };

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
        
        .input-field {
          background: rgba(255, 255, 255, 0.5);
          border: 2px solid rgba(102, 0, 51, 0.2);
          border-radius: 50px;
          padding: 18px 28px;
          font-size: 16px;
          color: #660033;
          width: 100%;
          transition: all 0.3s ease;
        }
        
        .input-field::placeholder {
          color: rgba(102, 0, 51, 0.5);
        }
        
        .input-field:focus {
          outline: none;
          border-color: #660033;
          background: rgba(255, 255, 255, 0.7);
        }
      `}</style>

      <GrainOverlay />

      <div 
        className="absolute rounded-full border border-[rgba(102,0,51,0.1)]"
        style={{
          top: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          animation: 'float 8s ease-in-out infinite'
        }} 
      />
      <div 
        className="absolute rounded-full border border-[rgba(102,0,51,0.08)]"
        style={{
          bottom: '20%',
          left: '-100px',
          width: '300px',
          height: '300px',
          animation: 'float 10s ease-in-out infinite 2s'
        }} 
      />

      <nav 
        className={`flex justify-between items-center relative z-10 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ padding: '40px 80px' }}
      >
        <div className="text-[28px] font-light tracking-[0.3em] lowercase">
          aermuse
        </div>
        <div className="flex gap-12 items-center">
          <a href="#features" className="nav-link" data-testid="link-features">Features</a>
          <a href="#artists" className="nav-link" data-testid="link-artists">For Artists</a>
          <Link href="/pricing" className="nav-link" data-testid="link-pricing">Pricing</Link>
          <Link href="/auth">
            <button className="btn-primary" style={{ padding: '14px 32px' }} data-testid="button-get-started">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      <section 
        className="relative min-h-[80vh]"
        style={{
          padding: '80px 80px 120px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          alignItems: 'center'
        }}
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
            AI-powered contract intelligence. Exclusive fan experiences. 
            Beautiful landing pages. Everything you need to own your artistry.
          </p>
          
          <div 
            className={`flex gap-6 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: '800ms' }}
          >
            <Link href="/auth">
              <button className="btn-primary" data-testid="button-request-access">Request Early Access</button>
            </Link>
            <button className="btn-secondary" data-testid="button-watch-demo">Watch Demo</button>
          </div>
        </div>

        <div 
          className={`relative overflow-hidden transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            height: '600px',
            borderRadius: '32px',
            transitionDelay: '600ms'
          }}
        >
          <ShaderAnimation variant="landing" />
          
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, transparent 0%, rgba(102, 0, 51, 0.2) 100%)'
            }} 
          />
          
          <div 
            className="absolute z-10"
            style={{
              top: '60px',
              right: '40px',
              background: 'rgba(247, 230, 202, 0.9)',
              backdropFilter: 'blur(20px)',
              padding: '24px 32px',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(102, 0, 51, 0.25)',
              animation: 'float 6s ease-in-out infinite'
            }}
          >
            <div className="text-[11px] tracking-[0.2em] uppercase mb-2 opacity-60">
              Contract Analysis
            </div>
            <div className="text-2xl font-light">3 clauses flagged</div>
          </div>

          <div 
            className="absolute z-10"
            style={{
              bottom: '120px',
              left: '20px',
              background: 'rgba(247, 230, 202, 0.9)',
              backdropFilter: 'blur(20px)',
              padding: '24px 32px',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(102, 0, 51, 0.25)',
              animation: 'float 7s ease-in-out infinite 1s'
            }}
          >
            <div className="text-[11px] tracking-[0.2em] uppercase mb-2 opacity-60">
              Fan Growth
            </div>
            <div className="text-2xl font-light">+847 this week</div>
          </div>

          <div 
            className="absolute z-10 bg-[#660033] text-[#F7E6CA]"
            style={{
              top: '200px',
              left: '60px',
              padding: '32px',
              borderRadius: '20px',
              boxShadow: '0 30px 80px rgba(102, 0, 51, 0.4)',
              animation: 'float 8s ease-in-out infinite 0.5s'
            }}
          >
            <div className="text-[11px] tracking-[0.2em] uppercase mb-3 opacity-70">
              Revenue
            </div>
            <div className="text-[32px] font-light">$12,450</div>
            <div className="text-xs mt-2 opacity-70">
              ↑ 23% from exclusive content
            </div>
          </div>
        </div>
      </section>

      <section 
        className="overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '100px',
          margin: '0 80px',
          padding: '24px 0'
        }}
      >
        <div 
          className="flex gap-20 text-[13px] tracking-[0.2em] uppercase whitespace-nowrap"
          style={{
            color: 'rgba(102, 0, 51, 0.5)',
            animation: 'marquee 30s linear infinite'
          }}
        >
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-20">
              <span>◈ Contract Intelligence</span>
              <span>◈ Fan Monetization</span>
              <span>◈ Landing Pages</span>
              <span>◈ CRM Analytics</span>
              <span>◈ Royalty Tracking</span>
              <span>◈ Release Management</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative" style={{ padding: '160px 80px' }}>
        <div className="flex justify-between items-start mb-24">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-6 font-light">
              Capabilities
            </p>
            <h2 
              className="font-light leading-[1.15]"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
            >
              Built for the<br />
              <span className="font-bold">modern artist</span>
            </h2>
          </div>
          <div className="w-20 h-[3px] bg-[#660033] rounded mt-12" />
        </div>

        <div 
          className="grid gap-10"
          style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card cursor-pointer"
              style={{
                padding: '48px 32px',
                background: activeFeature === index 
                  ? 'rgba(255, 255, 255, 0.5)' 
                  : 'rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                border: activeFeature === index 
                  ? '2px solid rgba(102, 0, 51, 0.15)'
                  : '2px solid transparent'
              }}
              onMouseEnter={() => setActiveFeature(index)}
              data-testid={`card-feature-${index}`}
            >
              <div 
                className="text-[32px] mb-8 transition-opacity duration-300"
                style={{ opacity: activeFeature === index ? 1 : 0.4 }}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-normal mb-4 leading-[1.3]">
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

      <section id="artists" style={{ padding: '80px 80px 160px' }}>
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.3em] uppercase mb-6 font-light">
            Testimonials
          </p>
          <h2 
            className="font-light"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Trusted by <span className="font-bold">artists</span>
          </h2>
        </div>

        <div 
          className="grid gap-8"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-10"
              style={{
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: '24px'
              }}
              data-testid={`card-testimonial-${index}`}
            >
              <p 
                className="text-lg leading-[1.7] mb-8 italic"
                style={{ color: 'rgba(102, 0, 51, 0.85)' }}
              >
                "{testimonial.quote}"
              </p>
              <div>
                <div className="font-semibold">{testimonial.name}</div>
                <div 
                  className="text-sm"
                  style={{ color: 'rgba(102, 0, 51, 0.6)' }}
                >
                  {testimonial.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section 
        className="text-center text-[#F7E6CA]"
        style={{
          background: '#660033',
          margin: '0 80px',
          padding: '100px 80px',
          borderRadius: '40px'
        }}
      >
        <h2 
          className="font-light mb-6"
          style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}
        >
          Ready to own your <span className="font-bold">artistry</span>?
        </h2>
        <p 
          className="text-lg mb-12 max-w-lg mx-auto"
          style={{ color: 'rgba(247, 230, 202, 0.8)' }}
        >
          Join the waitlist and be the first to experience the future of artist management.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-4 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field flex-1"
            style={{
              background: 'rgba(247, 230, 202, 0.1)',
              borderColor: 'rgba(247, 230, 202, 0.3)',
              color: '#F7E6CA'
            }}
            data-testid="input-email"
          />
          <button 
            type="submit"
            className="btn-primary"
            style={{
              background: '#F7E6CA',
              color: '#660033'
            }}
            data-testid="button-submit-email"
          >
            Join
          </button>
        </form>
      </section>

      <footer 
        className="flex justify-between items-center"
        style={{ padding: '60px 80px' }}
      >
        <div className="text-xl font-light tracking-[0.25em] lowercase">
          aermuse
        </div>
        <div className="flex gap-10">
          <a href="#" className="nav-link text-sm">Privacy</a>
          <a href="#" className="nav-link text-sm">Terms</a>
          <a href="#" className="nav-link text-sm">Contact</a>
        </div>
        <div 
          className="text-sm"
          style={{ color: 'rgba(102, 0, 51, 0.5)' }}
        >
          © 2025 Aermuse. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
