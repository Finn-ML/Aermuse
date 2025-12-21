/**
 * TemplateGallery Component
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Gallery view combining filter, search, and template grid.
 */

import { Search, FileText, Loader2 } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { CategoryFilter } from './CategoryFilter';
import { TemplateCard } from './TemplateCard';
import type { ContractTemplate } from '@shared/schema';

interface Props {
  onSelectTemplate: (template: ContractTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: Props) {
  const {
    templates,
    loading,
    error,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
  } = useTemplates();

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden">
      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <CategoryFilter selected={category} onChange={setCategory} />

        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="sm:w-[18px] sm:h-[18px] absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm"
            data-testid="search-templates"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#660033]" size={32} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          className="rounded-[20px] p-6 sm:p-12 text-center"
          style={{ background: 'rgba(220, 53, 69, 0.05)' }}
        >
          <p className="text-[#dc3545] text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && templates.length === 0 && (
        <div
          className="rounded-[20px] p-6 sm:p-12 text-center"
          style={{ background: 'rgba(255, 255, 255, 0.6)' }}
        >
          <FileText size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-[rgba(102,0,51,0.3)]" />
          <h3 className="text-base sm:text-lg font-bold text-[#660033] mb-2">No templates found</h3>
          <p className="text-sm sm:text-base text-[rgba(102,0,51,0.6)]">
            {searchQuery
              ? 'Try a different search term'
              : 'No templates available in this category'}
          </p>
        </div>
      )}

      {/* Template Grid */}
      {!loading && !error && templates.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
