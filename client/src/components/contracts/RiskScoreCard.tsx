import { useEffect, useState } from 'react';
import { Shield, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RiskAssessment } from '../../types';

interface Props {
  riskAssessment: RiskAssessment;
}

const riskConfig = {
  low: {
    color: '#D4AF37',
    gradient: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
    label: 'Low Risk',
    description: 'This contract has generally fair terms.',
    icon: TrendingUp,
  },
  medium: {
    color: '#B8860B',
    gradient: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)',
    label: 'Medium Risk',
    description: 'Some terms may need negotiation.',
    icon: Minus,
  },
  high: {
    color: '#dc3545',
    gradient: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)',
    label: 'High Risk',
    description: 'Significant concerns - review carefully.',
    icon: TrendingDown,
  },
};

export function RiskScoreCard({ riskAssessment }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  if (!riskAssessment) {
    return null;
  }

  const config = riskConfig[riskAssessment.overallRisk as keyof typeof riskConfig] || riskConfig.medium;
  const score = riskAssessment.overallScore ?? 50;
  const Icon = config.icon;

  // Animate score on mount
  useEffect(() => {
    setIsVisible(true);
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Calculate ring progress
  const circumference = 2 * Math.PI * 54;
  const progress = (animatedScore / 100) * circumference;

  return (
    <div
      className="rounded-[20px] p-7"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <Shield className="h-5 w-5 text-[#F7E6CA]" />
        </div>
        <h3 className="text-lg font-bold text-[#660033]">Risk Assessment</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Animated Score Circle */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="rgba(102, 0, 51, 0.1)"
              strokeWidth="10"
              fill="none"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={config.color} />
                <stop offset="100%" stopColor={config.color} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="url(#scoreGradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: config.color }}>
              {animatedScore}
            </span>
            <span className="text-xs text-[rgba(102,0,51,0.5)]">/ 100</span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.05em] text-white"
              style={{ background: config.gradient }}
            >
              {config.label}
            </span>
            <Icon className="h-4 w-4" style={{ color: config.color }} />
          </div>
          <p className="text-sm text-[rgba(102,0,51,0.7)] leading-relaxed">
            {riskAssessment.summary || config.description}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {riskAssessment.breakdown && riskAssessment.breakdown.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[rgba(102,0,51,0.08)]">
          <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-3">
            Risk by Category
          </h4>
          <div className="space-y-3">
            {riskAssessment.breakdown.map((item, index) => {
              const barColor = item.score >= 70
                ? '#D4AF37'
                : item.score >= 40
                ? '#B8860B'
                : '#dc3545';

              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[rgba(102,0,51,0.8)]">
                      {item.category}
                    </span>
                    <span className="text-sm font-bold" style={{ color: barColor }}>
                      {item.score}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[rgba(102,0,51,0.08)]">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: isVisible ? `${item.score}%` : '0%',
                        background: barColor,
                        transitionDelay: `${index * 150}ms`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
