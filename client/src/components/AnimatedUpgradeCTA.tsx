import { Link } from 'wouter';
import { Unlock, Sparkles } from 'lucide-react';

interface AnimatedUpgradeCTAProps {
  feature: string;
  count?: number;
}

function FloatingParticles() {
  const particles = [
    { size: 6, left: '10%', top: '20%' },
    { size: 4, left: '85%', top: '15%' },
    { size: 8, left: '75%', top: '70%' },
    { size: 5, left: '15%', top: '75%' },
    { size: 7, left: '50%', top: '10%' },
    { size: 4, left: '60%', top: '85%' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle absolute rounded-full bg-[#660033]"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            opacity: 0.3,
            animation: `float 3s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

export function AnimatedUpgradeCTA({ feature, count }: AnimatedUpgradeCTAProps) {
  return (
    <Link href="/pricing">
      <div className="animated-cta relative p-4 sm:p-6 rounded-2xl cursor-pointer group">
        {/* Shimmer border */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(102, 0, 51, 0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s ease-in-out infinite',
          }}
        />

        {/* Floating particles */}
        <FloatingParticles />

        {/* Glassmorphism card */}
        <div className="relative bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/40 shadow-lg">
          {/* Pulsing unlock icon */}
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4">
            <div
              className="absolute inset-0 rounded-full bg-[#660033]/20"
              style={{ animation: 'pulse-ring 1.5s ease-out infinite' }}
            />
            <div
              className="absolute inset-0 rounded-full bg-[#660033]/20"
              style={{ animation: 'pulse-ring 1.5s ease-out infinite', animationDelay: '0.5s' }}
            />
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              <Unlock className="w-5 h-5 sm:w-8 sm:h-8 text-[#F7E6CA]" />
            </div>
          </div>

          {/* Text content */}
          <h3 className="text-base sm:text-lg font-bold text-[#660033] text-center mb-1">
            {feature}
          </h3>
          {count !== undefined && count > 0 && (
            <p className="text-xs sm:text-sm text-[#660033]/70 text-center mb-3 sm:mb-4">
              {count} {count === 1 ? 'item' : 'items'} found
            </p>
          )}

          {/* CTA button */}
          <button className="w-full py-2.5 sm:py-3 px-3 sm:px-4 text-[#F7E6CA] font-semibold rounded-lg flex items-center justify-center gap-2 group-hover:shadow-lg transition-shadow text-sm sm:text-base"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Unlock with Alpha
          </button>
        </div>
      </div>
    </Link>
  );
}

// Add CSS keyframes to global styles or component
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
      opacity: 0.3;
    }
    50% {
      transform: translateY(-15px) rotate(10deg);
      opacity: 0.6;
    }
  }

  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .animated-cta * {
      animation: none !important;
    }
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('animated-cta-styles')) {
  styleSheet.id = 'animated-cta-styles';
  document.head.appendChild(styleSheet);
}
