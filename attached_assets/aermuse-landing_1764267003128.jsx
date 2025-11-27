import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Shader Animation Component
function ShaderAnimation() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `;

    // Custom shader with cream/burgundy palette
    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.03;
        float lineWidth = 0.0015;

        // Burgundy base: rgb(102, 0, 51) = vec3(0.4, 0.0, 0.2)
        // Cream accent: rgb(247, 230, 202) = vec3(0.97, 0.9, 0.79)
        
        vec3 burgundy = vec3(0.4, 0.0, 0.2);
        vec3 cream = vec3(0.97, 0.9, 0.79);
        vec3 rose = vec3(0.6, 0.15, 0.3);
        
        float intensity = 0.0;
        for(int i = 0; i < 6; i++){
          intensity += lineWidth * float(i*i) / abs(fract(t + float(i) * 0.015) * 4.0 - length(uv) + mod(uv.x + uv.y, 0.25));
        }
        
        intensity = clamp(intensity, 0.0, 1.0);
        
        // Blend between burgundy and cream based on intensity
        vec3 color = mix(burgundy, cream, intensity * 0.7);
        color = mix(color, rose, intensity * 0.3);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const camera = new THREE.Camera();
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    const onWindowResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      uniforms.resolution.value.x = renderer.domElement.width;
      uniforms.resolution.value.y = renderer.domElement.height;
    };

    onWindowResize();
    window.addEventListener("resize", onWindowResize, false);

    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);

      if (sceneRef.current) {
        sceneRef.current.animationId = animationId;
      }
    };

    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: 0,
    };

    animate();

    return () => {
      window.removeEventListener("resize", onWindowResize);

      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);

        if (container && sceneRef.current.renderer.domElement) {
          container.removeChild(sceneRef.current.renderer.domElement);
        }

        sceneRef.current.renderer.dispose();
        geometry.dispose();
        material.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  );
}

export default function AermuseLanding() {
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7E6CA',
      fontFamily: '"Nunito", sans-serif',
      color: '#660033',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        ::selection {
          background: #660033;
          color: #F7E6CA;
        }
        
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .nav-link {
          position: relative;
          text-decoration: none;
          color: #660033;
          font-family: 'Nunito', sans-serif;
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
          font-family: 'Nunito', sans-serif;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          border-radius: 50px;
        }
        
        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(247, 230, 202, 0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(102, 0, 51, 0.3);
        }
        
        .btn-primary:hover::before {
          left: 100%;
        }
        
        .btn-secondary {
          background: transparent;
          color: #660033;
          border: 2px solid #660033;
          padding: 16px 48px;
          font-family: 'Nunito', sans-serif;
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
          font-family: 'Nunito', sans-serif;
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
        
        .decorative-line {
          width: 80px;
          height: 3px;
          background: #660033;
          border-radius: 3px;
        }
        
        .grain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          z-index: 1000;
        }
      `}</style>

      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Decorative Background Elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '5%',
        width: '400px',
        height: '400px',
        border: '1px solid rgba(102, 0, 51, 0.1)',
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '-100px',
        width: '300px',
        height: '300px',
        border: '1px solid rgba(102, 0, 51, 0.08)',
        borderRadius: '50%',
        animation: 'float 10s ease-in-out infinite 2s'
      }} />

      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '40px 80px',
        opacity: isLoaded ? 1 : 0,
        animation: isLoaded ? 'fadeIn 1s ease forwards' : 'none',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: '300',
          letterSpacing: '0.3em',
          textTransform: 'lowercase'
        }}>
          aermuse
        </div>
        <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#artists" className="nav-link">For Artists</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <button className="btn-primary" style={{ padding: '14px 32px' }}>
            Join Waitlist
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '80px 80px 120px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '80px',
        alignItems: 'center',
        minHeight: '80vh',
        position: 'relative'
      }}>
        <div>
          <div style={{
            opacity: isLoaded ? 1 : 0,
            animation: isLoaded ? 'fadeUp 1s ease forwards 0.2s' : 'none',
            animationFillMode: 'both'
          }}>
            <p style={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '12px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '32px',
              fontWeight: '400'
            }}>
              The Artist Operating System
            </p>
          </div>
          
          <h1 style={{
            fontSize: 'clamp(48px, 7vw, 96px)',
            fontWeight: '300',
            lineHeight: '1.05',
            marginBottom: '40px',
            opacity: isLoaded ? 1 : 0,
            animation: isLoaded ? 'fadeUp 1s ease forwards 0.4s' : 'none',
            animationFillMode: 'both'
          }}>
            Your career,<br />
            <span style={{ fontWeight: '700' }}>orchestrated</span>
          </h1>
          
          <p style={{
            fontFamily: '"Nunito", sans-serif',
            fontSize: '18px',
            lineHeight: '1.8',
            maxWidth: '480px',
            fontWeight: '400',
            marginBottom: '48px',
            opacity: isLoaded ? 1 : 0,
            animation: isLoaded ? 'fadeUp 1s ease forwards 0.6s' : 'none',
            animationFillMode: 'both',
            color: 'rgba(102, 0, 51, 0.8)'
          }}>
            AI-powered contract intelligence. Exclusive fan experiences. 
            Beautiful landing pages. Everything you need to own your artistry.
          </p>
          
          <div style={{
            display: 'flex',
            gap: '24px',
            opacity: isLoaded ? 1 : 0,
            animation: isLoaded ? 'fadeUp 1s ease forwards 0.8s' : 'none',
            animationFillMode: 'both'
          }}>
            <button className="btn-primary">Request Early Access</button>
            <button className="btn-secondary">Watch Demo</button>
          </div>
        </div>

        {/* Hero Visual */}
        <div style={{
          position: 'relative',
          height: '600px',
          opacity: isLoaded ? 1 : 0,
          animation: isLoaded ? 'fadeIn 1.2s ease forwards 0.6s' : 'none',
          animationFillMode: 'both',
          borderRadius: '32px',
          overflow: 'hidden'
        }}>
          {/* Shader Animation Background */}
          <ShaderAnimation />
          
          {/* Overlay gradient for readability */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at center, transparent 0%, rgba(102, 0, 51, 0.2) 100%)',
            pointerEvents: 'none'
          }} />
          
          {/* Floating UI Cards */}
          <div style={{
            position: 'absolute',
            top: '60px',
            right: '40px',
            background: 'rgba(247, 230, 202, 0.9)',
            backdropFilter: 'blur(20px)',
            padding: '24px 32px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(102, 0, 51, 0.25)',
            animation: 'float 6s ease-in-out infinite',
            zIndex: 10
          }}>
            <div style={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '8px',
              opacity: 0.6
            }}>Contract Analysis</div>
            <div style={{ fontSize: '24px', fontWeight: '300' }}>3 clauses flagged</div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '120px',
            left: '20px',
            background: 'rgba(247, 230, 202, 0.9)',
            backdropFilter: 'blur(20px)',
            padding: '24px 32px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(102, 0, 51, 0.25)',
            animation: 'float 7s ease-in-out infinite 1s',
            zIndex: 10
          }}>
            <div style={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '8px',
              opacity: 0.6
            }}>Fan Growth</div>
            <div style={{ fontSize: '24px', fontWeight: '300' }}>+847 this week</div>
          </div>

          <div style={{
            position: 'absolute',
            top: '200px',
            left: '60px',
            background: '#660033',
            color: '#F7E6CA',
            padding: '32px',
            borderRadius: '20px',
            boxShadow: '0 30px 80px rgba(102, 0, 51, 0.4)',
            animation: 'float 8s ease-in-out infinite 0.5s',
            zIndex: 10
          }}>
            <div style={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '12px',
              opacity: 0.7
            }}>Revenue</div>
            <div style={{ fontSize: '32px', fontWeight: '300' }}>$12,450</div>
            <div style={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '12px',
              marginTop: '8px',
              opacity: 0.7
            }}>↑ 23% from exclusive content</div>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <section style={{
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '100px',
        margin: '0 80px',
        padding: '24px 0',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          gap: '80px',
          fontFamily: '"Nunito", sans-serif',
          fontSize: '13px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(102, 0, 51, 0.5)',
          whiteSpace: 'nowrap',
          animation: 'marquee 30s linear infinite'
        }}>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
          {[...Array(2)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '80px' }}>
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

      {/* Features Section */}
      <section id="features" style={{
        padding: '160px 80px',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '100px'
        }}>
          <div>
            <p style={{
              fontFamily: '"Nunito", sans-serif',
              fontSize: '12px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '24px',
              fontWeight: '300'
            }}>
              Capabilities
            </p>
            <h2 style={{
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: '300',
              lineHeight: '1.15'
            }}>
              Built for the<br />
              <span style={{ fontWeight: '700' }}>modern artist</span>
            </h2>
          </div>
          <div className="decorative-line" style={{ marginTop: '48px' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '40px'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              className="feature-card"
              style={{
                padding: '48px 32px',
                background: activeFeature === index 
                  ? 'rgba(255, 255, 255, 0.5)' 
                  : 'rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                cursor: 'pointer',
                border: activeFeature === index 
                  ? '2px solid rgba(102, 0, 51, 0.15)'
                  : '2px solid transparent'
              }}
              onMouseEnter={() => setActiveFeature(index)}
            >
              <div style={{
                fontSize: '32px',
                marginBottom: '32px',
                opacity: activeFeature === index ? 1 : 0.4,
                transition: 'opacity 0.3s ease'
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '400',
                marginBottom: '16px',
                lineHeight: '1.3'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontFamily: '"Nunito", sans-serif',
                fontSize: '14px',
                lineHeight: '1.7',
                fontWeight: '300',
                color: 'rgba(102, 0, 51, 0.7)'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase Section */}
      <section style={{
        padding: '0 80px 160px',
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: '120px',
        alignItems: 'center'
      }}>
        <div>
          <p style={{
            fontFamily: '"Nunito", sans-serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            marginBottom: '24px',
            fontWeight: '300'
          }}>
            Contract Intelligence
          </p>
          <h2 style={{
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: '300',
            lineHeight: '1.2',
            marginBottom: '32px'
          }}>
            Never sign blind<br />
            <span style={{ fontWeight: '700' }}>again</span>
          </h2>
          <p style={{
            fontFamily: '"Nunito", sans-serif',
            fontSize: '16px',
            lineHeight: '1.8',
            fontWeight: '300',
            color: 'rgba(102, 0, 51, 0.8)',
            marginBottom: '32px'
          }}>
            Our AI has analyzed thousands of music industry contracts. It understands 
            publishing deals, management agreements, label contracts, and sync licenses. 
            Upload any document and receive instant, actionable insights.
          </p>
          <ul style={{
            fontFamily: '"Nunito", sans-serif',
            fontSize: '14px',
            lineHeight: '2.2',
            fontWeight: '300',
            listStyle: 'none',
            color: 'rgba(102, 0, 51, 0.9)'
          }}>
            <li>◈ Clause-by-clause analysis</li>
            <li>◈ Industry-standard comparisons</li>
            <li>◈ Suggested revisions</li>
            <li>◈ E-signature integration</li>
          </ul>
        </div>

        {/* Contract Preview Mock */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px)',
          padding: '48px',
          borderRadius: '24px',
          boxShadow: '0 40px 100px rgba(102, 0, 51, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '40px',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(102, 0, 51, 0.1)'
          }}>
            <div>
              <div style={{
                fontFamily: '"Nunito", sans-serif',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginBottom: '4px'
              }}>Analyzing</div>
              <div style={{ fontSize: '18px', fontWeight: '400' }}>Publishing_Agreement_Draft.pdf</div>
            </div>
            <div style={{
              background: 'rgba(102, 0, 51, 0.1)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontFamily: '"Nunito", sans-serif',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              3 issues found
            </div>
          </div>

          {[
            { severity: 'high', title: 'Perpetual Rights Clause', desc: 'Section 4.2 grants perpetual rights with no reversion.' },
            { severity: 'medium', title: 'Audit Rights Limited', desc: 'Annual audit window may be too restrictive.' },
            { severity: 'low', title: 'Territory Definition', desc: 'Consider specifying digital territories.' }
          ].map((item, i) => (
            <div key={i} style={{
              padding: '20px 0',
              borderBottom: i < 2 ? '1px solid rgba(102, 0, 51, 0.08)' : 'none',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                marginTop: '6px',
                background: item.severity === 'high' ? '#660033' : 
                           item.severity === 'medium' ? 'rgba(102, 0, 51, 0.5)' : 
                           'rgba(102, 0, 51, 0.25)'
              }} />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '400', marginBottom: '4px' }}>
                  {item.title}
                </div>
                <div style={{
                  fontFamily: '"Nunito", sans-serif',
                  fontSize: '13px',
                  fontWeight: '300',
                  color: 'rgba(102, 0, 51, 0.7)'
                }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        background: '#660033',
        color: '#F7E6CA',
        padding: '120px 80px',
        borderRadius: '40px',
        margin: '0 40px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '80px'
        }}>
          <p style={{
            fontFamily: '"Nunito", sans-serif',
            fontSize: '12px',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: '300',
            opacity: 0.7
          }}>
            Artist Voices
          </p>
          <div className="decorative-line" style={{ background: 'rgba(247, 230, 202, 0.3)' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '60px'
        }}>
          {testimonials.map((item, i) => (
            <div key={i}>
              <p style={{
                fontSize: '24px',
                fontWeight: '300',
                lineHeight: '1.5',
                marginBottom: '32px',
                fontStyle: 'italic'
              }}>
                "{item.quote}"
              </p>
              <div style={{
                fontFamily: '"Nunito", sans-serif',
                fontSize: '13px',
                fontWeight: '400',
                letterSpacing: '0.1em'
              }}>
                {item.name}
              </div>
              <div style={{
                fontFamily: '"Nunito", sans-serif',
                fontSize: '12px',
                fontWeight: '300',
                opacity: 0.6,
                marginTop: '4px'
              }}>
                {item.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '160px 80px',
        textAlign: 'center'
      }}>
        <p style={{
          fontFamily: '"Nunito", sans-serif',
          fontSize: '12px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          fontWeight: '300'
        }}>
          Limited Beta
        </p>
        <h2 style={{
          fontSize: 'clamp(40px, 6vw, 80px)',
          fontWeight: '300',
          lineHeight: '1.15',
          marginBottom: '24px',
          maxWidth: '800px',
          margin: '0 auto 40px'
        }}>
          Your artistry deserves<br />
          <span style={{ fontWeight: '700' }}>better tools</span>
        </h2>
        <p style={{
          fontFamily: '"Nunito", sans-serif',
          fontSize: '18px',
          lineHeight: '1.7',
          fontWeight: '300',
          color: 'rgba(102, 0, 51, 0.7)',
          maxWidth: '500px',
          margin: '0 auto 48px'
        }}>
          We're accepting a limited number of artists into our early access program. 
          Join the waitlist to be among the first.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            style={{ textAlign: 'center' }}
          />
        </div>
        <button className="btn-primary" style={{ marginTop: '32px' }}>
          Request Access
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 80px',
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '300',
          letterSpacing: '0.3em',
          textTransform: 'lowercase'
        }}>
          aermuse
        </div>
        
        <div style={{
          display: 'flex',
          gap: '48px'
        }}>
          <a href="#" className="nav-link">Privacy</a>
          <a href="#" className="nav-link">Terms</a>
          <a href="#" className="nav-link">Contact</a>
        </div>
        
        <div style={{
          fontFamily: '"Nunito", sans-serif',
          fontSize: '12px',
          fontWeight: '300',
          opacity: 0.6
        }}>
          © 2025 Aermuse. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
