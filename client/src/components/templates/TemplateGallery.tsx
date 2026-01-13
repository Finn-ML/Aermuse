/**
 * TemplateGallery Component
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Gallery view combining filter, search, and template grid.
 * Enhanced with user template support for Alpha users.
 */

import { useState } from 'react';
import { Search, FileText, Loader2, Bookmark } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { useUserTemplates } from '@/hooks/useUserTemplates';
import { usePremium } from '@/hooks/usePremium';
import { useAuth } from '@/lib/auth';
import { CategoryFilter } from './CategoryFilter';
import { TemplateCard } from './TemplateCard';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { EditTemplateModal } from './EditTemplateModal';
import { UserTemplateEditor } from './UserTemplateEditor';
import type { ContractTemplate } from '@shared/schema';

interface Props {
  onSelectTemplate: (template: ContractTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: Props) {
  const { user } = useAuth();
  const { isAlpha } = usePremium();
  const {
    templates,
    loading,
    error,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
  } = useTemplates();

  // Fetch user templates count for the category badge (Alpha only)
  const { templates: userTemplates } = useUserTemplates();

  // Modal state
  const [saveModalTemplate, setSaveModalTemplate] = useState<ContractTemplate | null>(null);
  const [editModalTemplate, setEditModalTemplate] = useState<ContractTemplate | null>(null);
  const [userEditorTemplate, setUserEditorTemplate] = useState<ContractTemplate | null>(null);

  const isMyTemplatesCategory = category === 'my-templates';

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden">
      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <CategoryFilter
          selected={category}
          onChange={setCategory}
          userTemplateCount={isAlpha ? userTemplates.length : 0}
        />

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
      {error && !loading && !isMyTemplatesCategory && (
        <div
          className="rounded-[20px] p-6 sm:p-12 text-center"
          style={{ background: 'rgba(220, 53, 69, 0.05)' }}
        >
          <p className="text-[#dc3545] text-sm sm:text-base">{error}</p>
        </div>
      )}

      {/* Empty State - My Templates */}
      {!loading && isMyTemplatesCategory && templates.length === 0 && (
        <div
          className="rounded-[20px] p-6 sm:p-12 text-center"
          style={{ background: 'rgba(255, 255, 255, 0.6)' }}
        >
          <Bookmark size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-[rgba(102,0,51,0.3)]" />
          <h3 className="text-base sm:text-lg font-bold text-[#660033] mb-2">No saved templates yet</h3>
          <p className="text-sm sm:text-base text-[rgba(102,0,51,0.6)] mb-4">
            {searchQuery
              ? 'No templates match your search'
              : 'Save any template to customize its title and description'}
          </p>
          <button
            onClick={() => setCategory('all')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
          >
            Browse All Templates
          </button>
        </div>
      )}

      {/* Empty State - Regular Templates */}
      {!loading && !error && !isMyTemplatesCategory && templates.length === 0 && (
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
      {!loading && templates.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
              onSaveAsTemplate={setSaveModalTemplate}
              onEditTemplate={(t) => {
                // ALPHA users get the advanced UserTemplateEditor
                // Non-ALPHA users (if any slipped through) get the simple EditTemplateModal
                if (isAlpha) {
                  setUserEditorTemplate(t);
                } else {
                  setEditModalTemplate(t);
                }
              }}
              isUserTemplate={isMyTemplatesCategory}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      {/* Save As Template Modal */}
      {saveModalTemplate && (
        <SaveAsTemplateModal
          template={saveModalTemplate}
          isOpen={!!saveModalTemplate}
          onClose={() => setSaveModalTemplate(null)}
          onSuccess={() => {
            setSaveModalTemplate(null);
            // If user is not already viewing their templates, switch to that view
            if (category !== 'my-templates') {
              setCategory('my-templates');
            }
          }}
          onCustomize={(newTemplate) => {
            // ALPHA user chose "Save & Customize" - open the UserTemplateEditor
            setSaveModalTemplate(null);
            setUserEditorTemplate(newTemplate);
            // Switch to my-templates view so they see their template after editing
            if (category !== 'my-templates') {
              setCategory('my-templates');
            }
          }}
        />
      )}

      {/* Edit Template Modal (fallback for non-ALPHA users) */}
      {editModalTemplate && (
        <EditTemplateModal
          template={editModalTemplate}
          isOpen={!!editModalTemplate}
          onClose={() => setEditModalTemplate(null)}
        />
      )}

      {/* User Template Editor (ALPHA users - advanced editing) */}
      {userEditorTemplate && (
        <UserTemplateEditor
          template={userEditorTemplate}
          isOpen={!!userEditorTemplate}
          onClose={() => setUserEditorTemplate(null)}
          onSuccess={() => {
            setUserEditorTemplate(null);
          }}
        />
      )}
    </div>
  );
}
