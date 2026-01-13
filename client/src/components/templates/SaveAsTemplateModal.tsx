/**
 * SaveAsTemplateModal Component
 * Alpha Feature: User Custom Templates
 *
 * Modal for saving an existing template as user's own custom template
 * with editable title and description.
 * ALPHA users can also "Save & Customize" to open the advanced editor.
 */

import { useState } from 'react';
import { X, Save, Loader2, Settings } from 'lucide-react';
import { useCreateUserTemplate } from '@/hooks/useUserTemplates';
import { usePremium } from '@/hooks/usePremium';
import { useToast } from '@/hooks/use-toast';
import type { ContractTemplate } from '@shared/schema';

interface Props {
  template: ContractTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (template: ContractTemplate) => void;
  onCustomize?: (template: ContractTemplate) => void; // Called when ALPHA user wants to customize
}

export function SaveAsTemplateModal({ template, isOpen, onClose, onSuccess, onCustomize }: Props) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [customizeAfterSave, setCustomizeAfterSave] = useState(false);
  const { mutateAsync: createTemplate, isPending } = useCreateUserTemplate();
  const { isAlpha } = usePremium();
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent, shouldCustomize: boolean = false) => {
    e.preventDefault();

    // Clear previous error
    setNameError(null);

    if (!name.trim()) {
      setNameError('Template name is required');
      return;
    }

    try {
      const result = await createTemplate({
        sourceTemplateId: template.id,
        name: name.trim(),
        description: description.trim(),
      });

      if (shouldCustomize && onCustomize) {
        // User wants to customize after saving
        toast({
          title: 'Template saved',
          description: 'Opening editor to customize your template...',
        });
        onClose();
        onCustomize(result.template);
      } else {
        toast({
          title: 'Template saved',
          description: 'Your custom template has been created successfully',
        });
        onSuccess?.(result.template);
        onClose();
      }
    } catch (error: any) {
      toast({
        title: 'Failed to save template',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(102,0,51,0.1)]">
          <h2 className="text-lg font-bold text-[#660033]">Save as My Template</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[rgba(102,0,51,0.05)] transition-colors"
          >
            <X size={20} className="text-[rgba(102,0,51,0.5)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#660033] mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Enter template name"
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none text-sm transition-colors ${
                nameError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[rgba(102,0,51,0.1)] focus:border-[#660033]'
              }`}
              autoFocus
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-500">{nameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#660033] mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm transition-colors resize-none"
            />
          </div>

          <p className="text-xs text-[rgba(102,0,51,0.5)]">
            This will create a copy of the template that you can customize. The original template will remain unchanged.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-[rgba(102,0,51,0.1)] text-[#660033] font-semibold text-sm hover:bg-[rgba(102,0,51,0.05)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#660033] text-[#F7E6CA] font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>

            {/* Save & Customize option for ALPHA users */}
            {isAlpha && onCustomize && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#660033] text-[#660033] font-semibold text-sm hover:bg-[rgba(102,0,51,0.05)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings size={16} />
                <span>Save & Customize Content</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
