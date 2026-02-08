import { ReactNode } from 'react';
import { AnimatedUpgradeCTA } from './AnimatedUpgradeCTA';
import type { Feature } from '@shared/constants/tiers';

interface BlurredUpgradeOverlayProps {
  feature: Feature;
  count?: number;
  children: ReactNode;
}

const FEATURE_LABELS: Record<Feature, string> = {
  'contract-storage': 'Contract Storage',
  'ai-summary': 'AI Summary',
  'ai-risk-score': 'Risk Score Analysis',
  'ai-red-flags': 'Red Flags Analysis',
  'ai-key-terms': 'Key Terms Extraction',
  'ai-missing-clauses': 'Missing Clauses Detection',
  'e-signing': 'E-Signing',
  'templates': 'Contract Templates',
  'canvas-video-loop': 'Canvas Video Loop',
  'mailing-list': 'Mailing List',
  'track-preview-selection': 'Track Preview Selection',
  'merch-selling': 'Merch Selling',
};

export function BlurredUpgradeOverlay({
  feature,
  count,
  children
}: BlurredUpgradeOverlayProps) {
  const featureLabel = FEATURE_LABELS[feature] || feature;

  return (
    <div className="relative">
      {/* Blurred content */}
      <div
        className="select-none pointer-events-none"
        aria-hidden="true"
        style={{ filter: 'blur(12px)', WebkitFilter: 'blur(12px)' }}
      >
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/20 rounded-[20px]">
        <AnimatedUpgradeCTA
          feature={featureLabel}
          featureKey={feature}
          count={count}
        />
      </div>
    </div>
  );
}
