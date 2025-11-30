import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Feature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: Feature[];
  buttonText: string;
  buttonVariant: 'default' | 'secondary';
  onButtonClick: () => void;
  disabled?: boolean;
  current?: boolean;
  highlighted?: boolean;
  badge?: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant,
  onButtonClick,
  disabled,
  current,
  highlighted,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={`
        relative rounded-2xl p-8 bg-white
        ${highlighted
          ? 'shadow-xl ring-2 ring-[#660033]'
          : 'shadow-lg border border-gray-200'
        }
      `}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-[#660033] text-[#F7E6CA] px-4 py-1 rounded-full text-sm font-medium">
            {badge}
          </span>
        </div>
      )}

      {current && (
        <div className="absolute top-4 right-4">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
            Current Plan
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-500">/{period}</span>
        </div>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>

      <ul className="space-y-4 mb-8">
        {features.map((feature) => (
          <li key={feature.name} className="flex items-start gap-3">
            {feature.included ? (
              <Check
                className={`h-5 w-5 flex-shrink-0 ${
                  feature.highlight ? 'text-[#660033]' : 'text-green-500'
                }`}
              />
            ) : (
              <X className="h-5 w-5 flex-shrink-0 text-gray-300" />
            )}
            <span
              className={`${
                feature.included
                  ? feature.highlight
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-700'
                  : 'text-gray-400'
              }`}
            >
              {feature.name}
            </span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onButtonClick}
        disabled={disabled}
        variant={buttonVariant}
        className={`w-full py-3 ${
          buttonVariant === 'default'
            ? 'bg-[#660033] hover:bg-[#4a0024] text-white'
            : ''
        }`}
        size="lg"
      >
        {buttonText}
      </Button>
    </div>
  );
}
