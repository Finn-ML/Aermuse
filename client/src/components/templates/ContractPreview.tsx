/**
 * ContractPreview Component
 * Epic 3: Contract Templates System - Story 3.9
 *
 * Displays rendered contract in a professional format.
 */

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Send, Loader2, Printer } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { ContractTemplate } from '@shared/schema';
import type { TemplateFormData } from '@shared/types/templates';

interface Props {
  template: ContractTemplate;
  formData: TemplateFormData;
  onBack: () => void;
  onContractCreated: (contractId: string) => void;
}

export function ContractPreview({ template, formData, onBack, onContractCreated }: Props) {
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [renderedTitle, setRenderedTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rendered HTML on mount
  useEffect(() => {
    const renderTemplate = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('POST', `/api/templates/${template.id}/render`, { formData });
        const data = await response.json();
        setRenderedHtml(data.html);
        setRenderedTitle(data.title);
        setError(null);
      } catch (err) {
        setError('Failed to render contract');
        console.error('Render error:', err);
      } finally {
        setLoading(false);
      }
    };

    renderTemplate();
  }, [template.id, formData]);

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/contracts/from-template', {
        templateId: template.id,
        formData,
        title: renderedTitle,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Clear draft
      localStorage.removeItem(`template-draft-${template.id}`);
      onContractCreated(data.contract.id);
    },
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(renderedHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#660033]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-[20px] p-12 text-center"
        style={{ background: 'rgba(220, 53, 69, 0.05)' }}
      >
        <p className="text-[#dc3545]">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.6)] text-[#660033] hover:bg-[rgba(255,255,255,0.8)] transition-all"
            data-testid="button-back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#660033]">{renderedTitle}</h2>
            <p className="text-sm text-[rgba(102,0,51,0.6)]">Review your contract before saving</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,255,255,0.6)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(255,255,255,0.8)] transition-all"
            data-testid="button-edit"
          >
            <Edit2 size={16} />
            Edit
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,255,255,0.6)] text-[#660033] rounded-xl font-semibold text-sm hover:bg-[rgba(255,255,255,0.8)] transition-all"
            data-testid="button-print"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={() => createContractMutation.mutate()}
            disabled={createContractMutation.isPending}
            className="flex items-center gap-2 px-6 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold text-sm hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50"
            data-testid="button-create"
          >
            {createContractMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Creating...
              </>
            ) : (
              <>
                <Send size={18} />
                Create Contract
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {createContractMutation.isError && (
        <div
          className="rounded-xl p-4 text-sm text-[#dc3545]"
          style={{ background: 'rgba(220, 53, 69, 0.1)' }}
        >
          Failed to create contract. Please try again.
        </div>
      )}

      {/* Preview Container */}
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: 'rgba(102, 102, 102, 0.1)' }}
      >
        <div className="p-8">
          <div
            className="mx-auto shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
            style={{
              maxWidth: '850px',
              minHeight: '1100px',
              background: 'white',
            }}
          >
            <iframe
              srcDoc={renderedHtml}
              title={renderedTitle}
              className="w-full h-[1100px] border-0"
              sandbox="allow-same-origin"
              data-testid="contract-preview-iframe"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
