/**
 * EditTemplateModal Component
 * Alpha Feature: User Custom Templates
 *
 * Modal for editing title and description of user's custom template.
 */

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useUpdateUserTemplate } from '@/hooks/useUserTemplates';
import { useToast } from '@/hooks/use-toast';
import type { ContractTemplate } from '@shared/schema';

interface Props {
  template: ContractTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (template: ContractTemplate) => void;
}

export function EditTemplateModal({ template, isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const { mutateAsync: updateTemplate, isPending } = useUpdateUserTemplate();
  const { toast } = useToast();

  // Reset form when template changes
  useEffect(() => {
    setName(template.name);
    setDescription(template.description || '');
  }, [template]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your template',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await updateTemplate({
        id: template.id,
        name: name.trim(),
        description: description.trim(),
      });

      toast({
        title: 'Template updated',
        description: 'Your template has been updated successfully',
      });

      onSuccess?.(result.template);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to update template',
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
          <h2 className="text-lg font-bold text-[#660033]">Edit Template</h2>
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
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name"
              className="w-full px-4 py-3 rounded-xl border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm transition-colors"
              autoFocus
            />
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-[rgba(102,0,51,0.1)] text-[#660033] font-semibold text-sm hover:bg-[rgba(102,0,51,0.05)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
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
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
