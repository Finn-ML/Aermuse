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

    const fragmentShader = `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.025;
        float lineWidth = 0.0012;

        vec3 burgundy = vec3(0.4, 0.0, 0.2);
        vec3 cream = vec3(0.97, 0.9, 0.79);
        vec3 rose = vec3(0.6, 0.15, 0.3);
        
        float intensity = 0.0;
        for(int i = 0; i < 6; i++){
          intensity += lineWidth * float(i*i) / abs(fract(t + float(i) * 0.012) * 4.5 - length(uv) + mod(uv.x + uv.y, 0.3));
        }
        
        intensity = clamp(intensity, 0.0, 1.0);
        
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
      uniforms.time.value += 0.04;
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

export default function AermuseAuth() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7E6CA',
      fontFamily: '"Nunito", sans-serif',
      color: '#660033',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden'
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
            transform: translateY(30px);
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
        
        .input-field {
          background: rgba(255, 255, 255, 0.6);
          border: 2px solid rgba(102, 0, 51, 0.1);
          border-radius: 16px;
          padding: 18px 24px;
          font-family: 'Nunito', sans-serif;
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
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50px;
          width: 100%;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(102, 0, 51, 0.3);
        }
        
        .tab-btn {
          background: transparent;
          color: rgba(102, 0, 51, 0.5);
          border: none;
          padding: 16px 32px;
          font-family: 'Nunito', sans-serif;
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
        
        .password-toggle {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(102, 0, 51, 0.4);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }
        
        .password-toggle:hover {
          color: #660033;
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

      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Left Panel - Shader Animation */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        <ShaderAnimation />
        
        {/* Brand overlay on shader */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          opacity: isLoaded ? 1 : 0,
          animation: isLoaded ? 'fadeIn 1.2s ease forwards' : 'none'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '300',
            letterSpacing: '0.3em',
            textTransform: 'lowercase',
            color: '#F7E6CA',
            marginBottom: '24px',
            textShadow: '0 4px 30px rgba(102, 0, 51, 0.3)'
          }}>
            aermuse
          </div>
          <p style={{
            fontSize: '18px',
            fontWeight: '400',
            color: 'rgba(247, 230, 202, 0.8)',
            maxWidth: '300px',
            lineHeight: '1.6'
          }}>
            Where artistry meets intelligence
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          opacity: isLoaded ? 1 : 0,
          animation: isLoaded ? 'fadeUp 0.8s ease forwards 0.3s' : 'none',
          animationFillMode: 'both'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '48px',
            background: 'rgba(255, 255, 255, 0.4)',
            borderRadius: '20px',
            padding: '8px'
          }}>
            <button 
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button 
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <div style={{ height: '520px' }}>
            {/* Name field - always rendered, hidden on login */}
            <div style={{ 
              marginBottom: '20px',
              opacity: activeTab === 'register' ? 1 : 0,
              height: activeTab === 'register' ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity 0.3s ease'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'rgba(102, 0, 51, 0.7)'
              }}>
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
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'rgba(102, 0, 51, 0.7)'
              }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'rgba(102, 0, 51, 0.7)'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ paddingRight: '56px' }}
                />
                <button 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password - always rendered, hidden on login */}
            <div style={{ 
              marginBottom: '20px',
              opacity: activeTab === 'register' ? 1 : 0,
              height: activeTab === 'register' ? 'auto' : 0,
              overflow: 'hidden',
              transition: 'opacity 0.3s ease'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'rgba(102, 0, 51, 0.7)'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••••••"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-field"
                tabIndex={activeTab === 'register' ? 0 : -1}
              />
            </div>

            {/* Forgot password (login) / Terms (register) - same height container */}
            <div style={{ height: '52px', marginBottom: '24px' }}>
              {activeTab === 'login' ? (
                <div style={{ textAlign: 'center' }}>
                  <a href="#" className="link" style={{ fontSize: '14px' }}>
                    Forgot password?
                  </a>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <input 
                    type="checkbox" 
                    id="terms"
                    style={{
                      width: '20px',
                      height: '20px',
                      accentColor: '#660033',
                      marginTop: '2px',
                      flexShrink: 0
                    }}
                  />
                  <label 
                    htmlFor="terms" 
                    style={{
                      fontSize: '14px',
                      color: 'rgba(102, 0, 51, 0.7)',
                      lineHeight: '1.5'
                    }}
                  >
                    I agree to the <a href="#" className="link">Terms of Service</a> and <a href="#" className="link">Privacy Policy</a>
                  </label>
                </div>
              )}
            </div>

            <button className="btn-primary">
              {activeTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            {/* Footer text */}
            <p style={{
              textAlign: 'center',
              marginTop: '32px',
              fontSize: '14px',
              color: 'rgba(102, 0, 51, 0.6)'
            }}>
              {activeTab === 'login' ? (
                <>Don't have an account? <a href="#" className="link" onClick={(e) => { e.preventDefault(); setActiveTab('register'); }}>Create one</a></>
              ) : (
                <>Already have an account? <a href="#" className="link" onClick={(e) => { e.preventDefault(); setActiveTab('login'); }}>Sign in</a></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
