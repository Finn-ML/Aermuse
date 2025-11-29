/**
 * CategoryFilter Component
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Filter tabs for template categories.
 */

import type { TemplateCategory } from '@/hooks/useTemplates';

interface Props {
  selected: TemplateCategory | 'all';
  onChange: (category: TemplateCategory | 'all') => void;
}

const categories: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Templates' },
  { value: 'artist', label: 'Artist' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'touring', label: 'Touring' },
  { value: 'production', label: 'Production' },
];

export function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
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
