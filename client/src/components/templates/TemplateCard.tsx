/**
 * TemplateCard Component
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Card displaying template info with use button.
 */

import { FileText, ArrowRight } from 'lucide-react';
import type { ContractTemplate } from '@shared/schema';

interface Props {
  template: ContractTemplate;
  onSelect: (template: ContractTemplate) => void;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  artist: { bg: 'bg-[rgba(102,0,51,0.1)]', text: 'text-[#660033]' },
  licensing: { bg: 'bg-[rgba(59,130,246,0.1)]', text: 'text-[#3b82f6]' },
  touring: { bg: 'bg-[rgba(40,167,69,0.1)]', text: 'text-[#28a745]' },
  production: { bg: 'bg-[rgba(255,193,7,0.1)]', text: 'text-[#B8860B]' },
  business: { bg: 'bg-[rgba(102,102,102,0.1)]', text: 'text-[#666666]' },
};

export function TemplateCard({ template, onSelect }: Props) {
  const colors = categoryColors[template.category] || categoryColors.business;

  return (
    <div
      className="rounded-[20px] p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(102,0,51,0.08)] overflow-hidden"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
      data-testid={`template-card-${template.id}`}
    >
      <div className="flex items-start gap-3 sm:gap-4 mb-4">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <FileText size={18} className="sm:w-[22px] sm:h-[22px] text-[#F7E6CA]" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5">
            <h3 className="font-bold text-sm sm:text-[15px] text-[#660033] truncate">
              {template.name}
            </h3>
            <span
              className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.05em] w-fit flex-shrink-0 ${colors.bg} ${colors.text}`}
            >
              {template.category}
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-[rgba(102,0,51,0.6)] line-clamp-2 break-words">
            {template.description}
          </p>
        </div>
      </div>

      <button
        onClick={() => onSelect(template)}
        className="w-full flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-xs sm:text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
        data-testid={`use-template-${template.id}`}
      >
        <span>Use Template</span>
        <ArrowRight size={14} className="sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
