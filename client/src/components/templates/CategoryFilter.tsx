/**
 * CategoryFilter Component
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Filter tabs for template categories.
 * Enhanced with "My Templates" tab for Alpha users.
 */

import { User } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import type { TemplateCategory } from '@/hooks/useTemplates';

interface Props {
  selected: TemplateCategory | 'all' | 'my-templates';
  onChange: (category: TemplateCategory | 'all' | 'my-templates') => void;
  userTemplateCount?: number;
}

const categories: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Templates' },
  { value: 'artist', label: 'Artist' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'touring', label: 'Touring' },
  { value: 'production', label: 'Production' },
];

export function CategoryFilter({ selected, onChange, userTemplateCount = 0 }: Props) {
  const { isAlpha } = usePremium();

  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
      {/* My Templates tab - shown first for Alpha users */}
      {isAlpha && (
        <button
          onClick={() => onChange('my-templates')}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
            selected === 'my-templates'
              ? 'bg-[#660033] text-[#F7E6CA]'
              : 'bg-[rgba(255,255,255,0.6)] text-[rgba(102,0,51,0.7)] hover:bg-[rgba(255,255,255,0.8)]'
          }`}
          data-testid="category-my-templates"
        >
          <User size={14} />
          <span>My Templates</span>
          {userTemplateCount > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              selected === 'my-templates'
                ? 'bg-[rgba(247,230,202,0.2)] text-[#F7E6CA]'
                : 'bg-[rgba(102,0,51,0.1)] text-[#660033]'
            }`}>
              {userTemplateCount}
            </span>
          )}
        </button>
      )}

      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
            selected === cat.value
              ? 'bg-[#660033] text-[#F7E6CA]'
              : 'bg-[rgba(255,255,255,0.6)] text-[rgba(102,0,51,0.7)] hover:bg-[rgba(255,255,255,0.8)]'
          }`}
          data-testid={`category-${cat.value}`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
