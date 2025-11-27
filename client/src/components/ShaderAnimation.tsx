import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ShaderAnimationProps {
  variant?: 'landing' | 'auth';
}

interface SceneRef {
  camera: THREE.Camera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  uniforms: {
    time: { type: string; value: number };
    resolution: { type: string; value: THREE.Vector2 };
  };
  animationId: number;
}

export default function ShaderAnimation({ variant = 'landing' }: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneRef | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `;

    const fragmentShader = variant === 'landing' ? `
      #define TWO_PI 6.2831853072
      #define PI 3.14159265359

      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
        float t = time * 0.03;
        float lineWidth = 0.0015;

        vec3 burgundy = vec3(0.4, 0.0, 0.2);
        vec3 cream = vec3(0.97, 0.9, 0.79);
        vec3 rose = vec3(0.6, 0.15, 0.3);
        
        float intensity = 0.0;
        for(int i = 0; i < 6; i++){
          intensity += lineWidth * float(i*i) / abs(fract(t + float(i) * 0.015) * 4.0 - length(uv) + mod(uv.x + uv.y, 0.25));
        }
        
        intensity = clamp(intensity, 0.0, 1.0);
        
        vec3 color = mix(burgundy, cream, intensity * 0.7);
        color = mix(color, rose, intensity * 0.3);
        
        gl_FragColor = vec4(color, 1.0);
      }
    ` : `
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
      uniforms.time.value += variant === 'landing' ? 0.05 : 0.04;
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
  }, [variant]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    />
  );
}
