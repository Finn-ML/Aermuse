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
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <CategoryFilter selected={category} onChange={setCategory} />

        <div className="relative flex-1 max-w-xs">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgba(102,0,51,0.4)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm"
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
          className="rounded-[20px] p-12 text-center"
          style={{ background: 'rgba(220, 53, 69, 0.05)' }}
        >
          <p className="text-[#dc3545]">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && templates.length === 0 && (
        <div
          className="rounded-[20px] p-12 text-center"
          style={{ background: 'rgba(255, 255, 255, 0.6)' }}
        >
          <FileText size={48} className="mx-auto mb-4 text-[rgba(102,0,51,0.3)]" />
          <h3 className="text-lg font-bold text-[#660033] mb-2">No templates found</h3>
          <p className="text-[rgba(102,0,51,0.6)]">
            {searchQuery
              ? 'Try a different search term'
              : 'No templates available in this category'}
          </p>
        </div>
      )}

      {/* Template Grid */}
      {!loading && !error && templates.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
