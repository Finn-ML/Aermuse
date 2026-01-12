/**
 * TemplateCard Component
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Card displaying template info with use button.
 * Enhanced with save/edit/delete for Alpha users.
 */

import { useState } from 'react';
import { FileText, ArrowRight, Bookmark, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { useDeleteUserTemplate } from '@/hooks/useUserTemplates';
import { useToast } from '@/hooks/use-toast';
import type { ContractTemplate } from '@shared/schema';

interface Props {
  template: ContractTemplate;
  onSelect: (template: ContractTemplate) => void;
  onSaveAsTemplate?: (template: ContractTemplate) => void;
  onEditTemplate?: (template: ContractTemplate) => void;
  isUserTemplate?: boolean;
  currentUserId?: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  artist: { bg: 'bg-[rgba(102,0,51,0.1)]', text: 'text-[#660033]' },
  licensing: { bg: 'bg-[rgba(59,130,246,0.1)]', text: 'text-[#3b82f6]' },
  touring: { bg: 'bg-[rgba(40,167,69,0.1)]', text: 'text-[#28a745]' },
  production: { bg: 'bg-[rgba(255,193,7,0.1)]', text: 'text-[#B8860B]' },
  business: { bg: 'bg-[rgba(102,102,102,0.1)]', text: 'text-[#666666]' },
};

export function TemplateCard({
  template,
  onSelect,
  onSaveAsTemplate,
  onEditTemplate,
  isUserTemplate = false,
  currentUserId
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isAlpha } = usePremium();
  const { mutateAsync: deleteTemplate, isPending: isDeleting } = useDeleteUserTemplate();
  const { toast } = useToast();

  const colors = categoryColors[template.category] || categoryColors.business;
  const isOwnTemplate = isUserTemplate || (currentUserId && template.createdBy === currentUserId);

  const handleDelete = async () => {
    try {
      await deleteTemplate(template.id);
      toast({
        title: 'Template deleted',
        description: 'Your template has been removed',
      });
      setShowDeleteConfirm(false);
      setShowMenu(false);
    } catch (error: any) {
      toast({
        title: 'Failed to delete',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      className="rounded-[20px] p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(102,0,51,0.08)] relative"
      style={{ background: 'rgba(255, 255, 255, 0.6)' }}
      data-testid={`template-card-${template.id}`}
    >
      <div className="flex items-start gap-3 sm:gap-4 mb-4">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isOwnTemplate
            ? 'linear-gradient(135deg, #8B0045 0%, #A80055 100%)'
            : 'linear-gradient(135deg, #660033 0%, #8B0045 100%)'
          }}
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

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onSelect(template)}
          className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-xs sm:text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all"
          data-testid={`use-template-${template.id}`}
        >
          <span>Use Template</span>
          <ArrowRight size={14} className="sm:w-4 sm:h-4" />
        </button>

        {/* Menu button for Alpha users */}
        {isAlpha && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 sm:p-3 rounded-xl border-2 border-[rgba(102,0,51,0.1)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              data-testid={`template-menu-${template.id}`}
            >
              <MoreVertical size={16} className="text-[#660033]" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white shadow-xl border border-[rgba(102,0,51,0.1)] z-20 overflow-hidden">
                  {!isOwnTemplate && (
                    <button
                      onClick={() => {
                        onSaveAsTemplate?.(template);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#660033] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
                    >
                      <Bookmark size={16} />
                      <span>Save as My Template</span>
                    </button>
                  )}
                  {isOwnTemplate && (
                    <>
                      <button
                        onClick={() => {
                          onEditTemplate?.(template);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#660033] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
                      >
                        <Pencil size={16} />
                        <span>Edit Template</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                        <span>Delete Template</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-[#660033] mb-2">Delete Template?</h3>
            <p className="text-sm text-[rgba(102,0,51,0.6)] mb-6">
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[rgba(102,0,51,0.1)] text-[#660033] font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
