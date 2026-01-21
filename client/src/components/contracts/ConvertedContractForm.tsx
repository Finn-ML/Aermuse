/**
 * ConvertedContractForm Component
 * Displays AI-extracted contract fields for review and editing
 * before generating the final Aermuse-styled contract.
 */

import { useState, useCallback } from 'react';
import {
  FileText,
  Users,
  Calendar,
  DollarSign,
  Globe,
  Shield,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

// Types matching the backend ParsedContractFields
interface ParsedContractParty {
  name: string;
  role: 'artist' | 'label' | 'producer' | 'brand' | 'manager' | 'publisher' | 'other';
  email?: string;
  address?: string;
  company?: string;
}

interface ParsedContractDates {
  effectiveDate?: string;
  endDate?: string;
  deliveryDate?: string;
  milestones?: Array<{ description: string; date: string }>;
}

interface ParsedRoyaltySplit {
  party: string;
  percentage: number;
  type?: string;
}

interface ParsedFee {
  description: string;
  amount: number;
  currency?: string;
}

interface ParsedFinancialTerms {
  advanceAmount?: number;
  currency?: string;
  royaltySplits?: ParsedRoyaltySplit[];
  fees?: ParsedFee[];
  paymentSchedule?: string;
}

interface ParsedExclusivity {
  isExclusive: boolean;
  period?: string;
  scope?: string;
}

interface ParsedTermination {
  noticePeriod?: string;
  conditions?: string[];
}

interface ParsedAdditionalClause {
  title: string;
  content: string;
}

interface ParsedContractFields {
  contractType: 'collaboration' | 'licensing' | 'touring' | 'production' | 'business' | 'management' | 'publishing' | 'other';
  title: string;
  parties: ParsedContractParty[];
  projectDetails: {
    title?: string;
    description?: string;
    deliverables?: string[];
  };
  dates: ParsedContractDates;
  financialTerms: ParsedFinancialTerms;
  territory?: string;
  exclusivity?: ParsedExclusivity;
  termination?: ParsedTermination;
  additionalClauses?: ParsedAdditionalClause[];
  confidence: number;
}

interface Props {
  contractId: string;
  initialData: ParsedContractFields | null;
  onGenerate: () => void;
}

const CONTRACT_TYPES = [
  { value: 'collaboration', label: 'Collaboration Agreement' },
  { value: 'licensing', label: 'Licensing Agreement' },
  { value: 'touring', label: 'Touring Agreement' },
  { value: 'production', label: 'Production Agreement' },
  { value: 'business', label: 'Business Agreement' },
  { value: 'management', label: 'Management Agreement' },
  { value: 'publishing', label: 'Publishing Agreement' },
  { value: 'other', label: 'Other' },
];

const PARTY_ROLES = [
  { value: 'artist', label: 'Artist' },
  { value: 'label', label: 'Label' },
  { value: 'producer', label: 'Producer' },
  { value: 'brand', label: 'Brand' },
  { value: 'manager', label: 'Manager' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];

export function ConvertedContractForm({ contractId, initialData, onGenerate }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basics: true,
    parties: true,
    project: true,
    dates: true,
    financial: true,
    territory: false,
    termination: false,
    additional: false,
  });

  // Form state with defaults
  const [fields, setFields] = useState<ParsedContractFields>(() => ({
    contractType: initialData?.contractType || 'other',
    title: initialData?.title || '',
    parties: initialData?.parties?.length ? initialData.parties : [{ name: '', role: 'artist' }],
    projectDetails: initialData?.projectDetails || { title: '', description: '', deliverables: [] },
    dates: initialData?.dates || {},
    financialTerms: initialData?.financialTerms || { currency: 'USD' },
    territory: initialData?.territory || '',
    exclusivity: initialData?.exclusivity || { isExclusive: false },
    termination: initialData?.termination || { conditions: [] },
    additionalClauses: initialData?.additionalClauses || [],
    confidence: initialData?.confidence || 0,
  }));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Party management
  const addParty = () => {
    setFields(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', role: 'other' }],
    }));
  };

  const removeParty = (index: number) => {
    if (fields.parties.length <= 1) return;
    setFields(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index),
    }));
  };

  const updateParty = (index: number, field: keyof ParsedContractParty, value: string) => {
    setFields(prev => ({
      ...prev,
      parties: prev.parties.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  // Royalty split management
  const addRoyaltySplit = () => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        royaltySplits: [...(prev.financialTerms.royaltySplits || []), { party: '', percentage: 0 }],
      },
    }));
  };

  const removeRoyaltySplit = (index: number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        royaltySplits: (prev.financialTerms.royaltySplits || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateRoyaltySplit = (index: number, field: keyof ParsedRoyaltySplit, value: string | number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        royaltySplits: (prev.financialTerms.royaltySplits || []).map((s, i) =>
          i === index ? { ...s, [field]: value } : s
        ),
      },
    }));
  };

  // Fee management
  const addFee = () => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        fees: [...(prev.financialTerms.fees || []), { description: '', amount: 0 }],
      },
    }));
  };

  const removeFee = (index: number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        fees: (prev.financialTerms.fees || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateFee = (index: number, field: keyof ParsedFee, value: string | number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        fees: (prev.financialTerms.fees || []).map((f, i) =>
          i === index ? { ...f, [field]: value } : f
        ),
      },
    }));
  };

  // Additional clause management
  const addClause = () => {
    setFields(prev => ({
      ...prev,
      additionalClauses: [...(prev.additionalClauses || []), { title: '', content: '' }],
    }));
  };

  const removeClause = (index: number) => {
    setFields(prev => ({
      ...prev,
      additionalClauses: (prev.additionalClauses || []).filter((_, i) => i !== index),
    }));
  };

  const updateClause = (index: number, field: keyof ParsedAdditionalClause, value: string) => {
    setFields(prev => ({
      ...prev,
      additionalClauses: (prev.additionalClauses || []).map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  // Termination condition management
  const addTerminationCondition = () => {
    setFields(prev => ({
      ...prev,
      termination: {
        ...prev.termination,
        conditions: [...(prev.termination?.conditions || []), ''],
      },
    }));
  };

  const removeTerminationCondition = (index: number) => {
    setFields(prev => ({
      ...prev,
      termination: {
        ...prev.termination,
        conditions: (prev.termination?.conditions || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateTerminationCondition = (index: number, value: string) => {
    setFields(prev => ({
      ...prev,
      termination: {
        ...prev.termination,
        conditions: (prev.termination?.conditions || []).map((c, i) => (i === index ? value : c)),
      },
    }));
  };

  // Deliverables management
  const addDeliverable = () => {
    setFields(prev => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails,
        deliverables: [...(prev.projectDetails.deliverables || []), ''],
      },
    }));
  };

  const removeDeliverable = (index: number) => {
    setFields(prev => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails,
        deliverables: (prev.projectDetails.deliverables || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateDeliverable = (index: number, value: string) => {
    setFields(prev => ({
      ...prev,
      projectDetails: {
        ...prev.projectDetails,
        deliverables: (prev.projectDetails.deliverables || []).map((d, i) => (i === index ? value : d)),
      },
    }));
  };

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!fields.title.trim()) {
      toast({
        title: 'Missing Contract Title',
        description: 'Please provide a contract title.',
        variant: 'destructive',
      });
      return;
    }

    if (fields.parties.length === 0 || !fields.parties.some(p => p.name.trim())) {
      toast({
        title: 'Missing Parties',
        description: 'Please add at least one party with a name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/contracts/${contractId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate contract');
      }

      toast({
        title: 'Contract Generated',
        description: 'Your Aermuse contract has been created successfully.',
      });

      onGenerate();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate contract',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [contractId, fields, onGenerate, toast]);

  const SectionHeader = ({
    title,
    icon: Icon,
    section,
  }: {
    title: string;
    icon: typeof FileText;
    section: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-[rgba(102,0,51,0.03)] rounded-xl hover:bg-[rgba(102,0,51,0.05)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <Icon size={18} className="text-[#F7E6CA]" />
        </div>
        <span className="font-semibold text-[#660033]">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="h-5 w-5 text-[#660033]" />
      ) : (
        <ChevronDown className="h-5 w-5 text-[#660033]" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Confidence Indicator */}
      {initialData && initialData.confidence > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(102,0,51,0.03)] border border-[rgba(102,0,51,0.1)]">
          <Sparkles className="h-5 w-5 text-[#660033]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#660033]">
              AI Extraction Confidence: {initialData.confidence}%
            </p>
            <p className="text-xs text-[rgba(102,0,51,0.6)]">
              Review and edit the extracted fields below before generating your contract
            </p>
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Contract Basics" icon={FileText} section="basics" />
        {expandedSections.basics && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Contract Title *
              </label>
              <input
                type="text"
                value={fields.title}
                onChange={(e) => setFields(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter contract title"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent bg-white text-[#660033] placeholder:text-[rgba(102,0,51,0.4)]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Contract Type
              </label>
              <select
                value={fields.contractType}
                onChange={(e) => setFields(prev => ({ ...prev, contractType: e.target.value as ParsedContractFields['contractType'] }))}
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent bg-white text-[#660033]"
              >
                {CONTRACT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Parties Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Parties" icon={Users} section="parties" />
        {expandedSections.parties && (
          <div className="p-6 space-y-4">
            {fields.parties.map((party, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-[rgba(102,0,51,0.02)] border border-[rgba(102,0,51,0.08)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-[#660033]">Party {index + 1}</span>
                  </div>
                  {fields.parties.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParty(index)}
                      className="p-1.5 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={party.name}
                    onChange={(e) => updateParty(index, 'name', e.target.value)}
                    placeholder="Name *"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <select
                    value={party.role}
                    onChange={(e) => updateParty(index, 'role', e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  >
                    {PARTY_ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  <input
                    type="email"
                    value={party.email || ''}
                    onChange={(e) => updateParty(index, 'email', e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <input
                    type="text"
                    value={party.company || ''}
                    onChange={(e) => updateParty(index, 'company', e.target.value)}
                    placeholder="Company"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={party.address || ''}
                  onChange={(e) => updateParty(index, 'address', e.target.value)}
                  placeholder="Address"
                  className="mt-3 w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                />
              </div>
            ))}
            {fields.parties.length < 10 && (
              <button
                type="button"
                onClick={addParty}
                className="flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Party
              </button>
            )}
          </div>
        )}
      </div>

      {/* Project Details Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Project Details" icon={FileText} section="project" />
        {expandedSections.project && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={fields.projectDetails.title || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  projectDetails: { ...prev.projectDetails, title: e.target.value }
                }))}
                placeholder="Album, single, or project name"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Description
              </label>
              <textarea
                value={fields.projectDetails.description || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  projectDetails: { ...prev.projectDetails, description: e.target.value }
                }))}
                placeholder="Brief description of the project or agreement"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Deliverables
              </label>
              <div className="space-y-2">
                {(fields.projectDetails.deliverables || []).map((deliverable, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={deliverable}
                      onChange={(e) => updateDeliverable(index, e.target.value)}
                      placeholder="Deliverable item"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeDeliverable(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addDeliverable}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Deliverable
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dates Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Dates & Timeline" icon={Calendar} section="dates" />
        {expandedSections.dates && (
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-[#660033] mb-2">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={fields.dates.effectiveDate || ''}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    dates: { ...prev.dates, effectiveDate: e.target.value }
                  }))}
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#660033] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={fields.dates.endDate || ''}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    dates: { ...prev.dates, endDate: e.target.value }
                  }))}
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#660033] mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={fields.dates.deliveryDate || ''}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    dates: { ...prev.dates, deliveryDate: e.target.value }
                  }))}
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Terms Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Financial Terms" icon={DollarSign} section="financial" />
        {expandedSections.financial && (
          <div className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#660033] mb-2">
                  Advance Amount
                </label>
                <input
                  type="number"
                  value={fields.financialTerms.advanceAmount || ''}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    financialTerms: { ...prev.financialTerms, advanceAmount: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#660033] mb-2">
                  Currency
                </label>
                <select
                  value={fields.financialTerms.currency || 'USD'}
                  onChange={(e) => setFields(prev => ({
                    ...prev,
                    financialTerms: { ...prev.financialTerms, currency: e.target.value }
                  }))}
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Royalty Splits */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Royalty Splits
              </label>
              <div className="space-y-2">
                {(fields.financialTerms.royaltySplits || []).map((split, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={split.party}
                      onChange={(e) => updateRoyaltySplit(index, 'party', e.target.value)}
                      placeholder="Party name"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={split.percentage}
                        onChange={(e) => updateRoyaltySplit(index, 'percentage', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                      />
                      <span className="text-[#660033]">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRoyaltySplit(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRoyaltySplit}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Royalty Split
              </button>
            </div>

            {/* Fees */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Additional Fees
              </label>
              <div className="space-y-2">
                {(fields.financialTerms.fees || []).map((fee, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={fee.description}
                      onChange={(e) => updateFee(index, 'description', e.target.value)}
                      placeholder="Fee description"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <input
                      type="number"
                      value={fee.amount}
                      onChange={(e) => updateFee(index, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      className="w-28 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeFee(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addFee}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Fee
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Payment Schedule
              </label>
              <textarea
                value={fields.financialTerms.paymentSchedule || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  financialTerms: { ...prev.financialTerms, paymentSchedule: e.target.value }
                }))}
                placeholder="Describe the payment schedule"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Territory & Rights Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Territory & Rights" icon={Globe} section="territory" />
        {expandedSections.territory && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Territory
              </label>
              <input
                type="text"
                value={fields.territory || ''}
                onChange={(e) => setFields(prev => ({ ...prev, territory: e.target.value }))}
                placeholder="e.g., Worldwide, North America, etc."
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
              />
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(102,0,51,0.02)]">
              <input
                type="checkbox"
                id="exclusivity"
                checked={fields.exclusivity?.isExclusive || false}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  exclusivity: { ...prev.exclusivity, isExclusive: e.target.checked }
                }))}
                className="w-5 h-5 rounded border-[rgba(102,0,51,0.3)] text-[#660033] focus:ring-[#660033]"
              />
              <label htmlFor="exclusivity" className="font-medium text-[#660033]">
                Exclusive Agreement
              </label>
            </div>
            {fields.exclusivity?.isExclusive && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-[#660033] mb-2">
                    Exclusivity Period
                  </label>
                  <input
                    type="text"
                    value={fields.exclusivity?.period || ''}
                    onChange={(e) => setFields(prev => ({
                      ...prev,
                      exclusivity: { ...prev.exclusivity!, period: e.target.value }
                    }))}
                    placeholder="e.g., 2 years, duration of contract"
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#660033] mb-2">
                    Scope
                  </label>
                  <input
                    type="text"
                    value={fields.exclusivity?.scope || ''}
                    onChange={(e) => setFields(prev => ({
                      ...prev,
                      exclusivity: { ...prev.exclusivity!, scope: e.target.value }
                    }))}
                    placeholder="e.g., Recording rights, sync licensing"
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Termination Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Termination" icon={XCircle} section="termination" />
        {expandedSections.termination && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Notice Period
              </label>
              <input
                type="text"
                value={fields.termination?.noticePeriod || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  termination: { ...prev.termination, noticePeriod: e.target.value }
                }))}
                placeholder="e.g., 30 days, 60 days"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Termination Conditions
              </label>
              <div className="space-y-2">
                {(fields.termination?.conditions || []).map((condition, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={condition}
                      onChange={(e) => updateTerminationCondition(index, e.target.value)}
                      placeholder="Termination condition"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeTerminationCondition(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addTerminationCondition}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Condition
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Additional Clauses Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Additional Clauses" icon={Shield} section="additional" />
        {expandedSections.additional && (
          <div className="p-6 space-y-4">
            {(fields.additionalClauses || []).map((clause, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-[rgba(102,0,51,0.02)] border border-[rgba(102,0,51,0.08)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#660033]">Clause {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeClause(index)}
                    className="p-1.5 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  type="text"
                  value={clause.title}
                  onChange={(e) => updateClause(index, 'title', e.target.value)}
                  placeholder="Clause title"
                  className="w-full mb-2 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                />
                <textarea
                  value={clause.content}
                  onChange={(e) => updateClause(index, 'content', e.target.value)}
                  placeholder="Clause content"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm resize-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addClause}
              className="flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Add Clause
            </button>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-6 border-t border-[rgba(102,0,51,0.08)]">
        <div className="flex items-center gap-2 text-sm text-[rgba(102,0,51,0.6)]">
          <AlertCircle size={16} />
          <span>Review all fields before generating</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3 bg-[#660033] text-[#F7E6CA] rounded-xl font-semibold hover:shadow-[0_10px_30px_rgba(102,0,51,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate Contract
            </>
          )}
        </button>
      </div>
    </div>
  );
}
