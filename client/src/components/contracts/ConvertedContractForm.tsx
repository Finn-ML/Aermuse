/**
 * ConvertedContractForm Component
 * Displays AI-extracted contract fields for review and editing
 * before generating the final Aermuse-styled contract.
 *
 * Now supports flexible structure that adapts to ANY contract type.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  Users,
  Calendar,
  DollarSign,
  Shield,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck,
  Edit3,
  List,
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

// Flexible types matching the backend ParsedContractFields
interface ParsedContractParty {
  name: string;
  role: string; // Flexible - any role
  email?: string;
  phone?: string;
  address?: string;
  postcode?: string;
  company?: string;
  vatNumber?: string;
  otherFields?: Record<string, string>;
}

interface ParsedFillableField {
  section: string;
  label: string;
  type: 'text' | 'date' | 'time' | 'currency' | 'number' | 'yes_no' | 'select' | 'textarea';
  value?: string | number | boolean | null;
  options?: string[];
  required?: boolean;
}

interface ParsedContractDates {
  effectiveDate?: string;
  endDate?: string;
  otherDates?: Array<{ label: string; value: string }>;
}

interface ParsedFee {
  label: string;
  amount: number;
  currency?: string;
}

interface ParsedExpense {
  type: string;
  covered: boolean;
  details?: string;
}

interface ParsedRoyalty {
  party: string;
  percentage: number;
}

interface ParsedFinancialTerms {
  fees?: ParsedFee[];
  expenses?: ParsedExpense[];
  paymentTerms?: string;
  latePaymentTerms?: string;
  royalties?: ParsedRoyalty[];
}

interface ParsedCancellationTier {
  notice: string;
  refundPercent: number;
}

interface ParsedCancellationPolicy {
  description?: string;
  tiers?: ParsedCancellationTier[];
}

interface ParsedTermCondition {
  number: string;
  title: string;
  content: string;
}

interface ParsedContractFields {
  contractType: string;
  title: string;
  isTemplate?: boolean;
  parties: ParsedContractParty[];
  fillableFields?: ParsedFillableField[];
  dates: ParsedContractDates;
  financialTerms: ParsedFinancialTerms;
  cancellationPolicy?: ParsedCancellationPolicy;
  termsAndConditions?: ParsedTermCondition[];
  additionalSections?: Record<string, any>;
  confidence: number;
  // Legacy fields
  projectDetails?: {
    title?: string;
    description?: string;
    deliverables?: string[];
  };
  territory?: string;
  exclusivity?: {
    isExclusive: boolean;
    period?: string;
    scope?: string;
  };
  termination?: {
    noticePeriod?: string;
    conditions?: string[];
  };
  additionalClauses?: Array<{ title: string; content: string }>;
}

interface Props {
  contractId: string;
  initialData: ParsedContractFields | null;
  onGenerate: () => void;
}

const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD'];

export function ConvertedContractForm({ contractId, initialData, onGenerate }: Props) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

  // Debug: Log initialData when component mounts
  console.log('[ConvertedContractForm] Received initialData:', {
    hasData: !!initialData,
    contractType: initialData?.contractType,
    title: initialData?.title,
    partiesCount: initialData?.parties?.length,
    termsCount: initialData?.termsAndConditions?.length,
    confidence: initialData?.confidence,
    fullData: initialData,
  });

  // Check if fields need extraction (no meaningful data)
  const needsExtraction = !initialData || (
    !initialData.title &&
    (!initialData.parties || initialData.parties.length === 0) &&
    (!initialData.termsAndConditions || initialData.termsAndConditions.length === 0)
  );

  // Handler to re-parse contract with AI
  const handleReparse = async () => {
    setIsReparsing(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/reparse`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.error('[ConvertedContractForm] Non-JSON response:', response.status, contentType);
        throw new Error(`Server error (${response.status}). Please try again.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract fields');
      }

      toast({
        title: 'Fields Extracted',
        description: `AI extracted contract details with ${data.parsedFields?.confidence || 0}% confidence.`,
      });

      // Trigger refresh of the contract data
      onGenerate();
    } catch (error: any) {
      console.error('[ConvertedContractForm] Reparse error:', error);
      toast({
        title: 'Extraction Failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsReparsing(false);
    }
  };

  // Auto-expand sections that have data
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    basics: true,
    parties: true,
    fillableFields: (initialData?.fillableFields?.length || 0) > 0,
    dates: true,
    financial: Boolean(
      initialData?.financialTerms?.fees?.length ||
      initialData?.financialTerms?.expenses?.length ||
      initialData?.financialTerms?.royalties?.length ||
      initialData?.financialTerms?.paymentTerms
    ),
    cancellation: Boolean(
      initialData?.cancellationPolicy?.description ||
      initialData?.cancellationPolicy?.tiers?.length
    ),
    terms: (initialData?.termsAndConditions?.length || 0) > 0,
    additional: (initialData?.additionalClauses?.length || 0) > 0,
  }));

  // Form state with defaults
  const [fields, setFields] = useState<ParsedContractFields>(() => ({
    contractType: initialData?.contractType || 'Contract',
    title: initialData?.title || '',
    isTemplate: initialData?.isTemplate || false,
    parties: initialData?.parties?.length ? initialData.parties : [{ name: '', role: 'Party' }],
    fillableFields: initialData?.fillableFields || [],
    dates: initialData?.dates || {},
    financialTerms: initialData?.financialTerms || {},
    cancellationPolicy: initialData?.cancellationPolicy || undefined,
    termsAndConditions: initialData?.termsAndConditions || [],
    additionalSections: initialData?.additionalSections || undefined,
    confidence: initialData?.confidence || 0,
    projectDetails: initialData?.projectDetails || { title: '', description: '', deliverables: [] },
    territory: initialData?.territory || '',
    exclusivity: initialData?.exclusivity || { isExclusive: false },
    termination: initialData?.termination || { conditions: [] },
    additionalClauses: initialData?.additionalClauses || [],
  }));

  // Group fillable fields by section, excluding party-related fields (handled in Parties section)
  const fillableFieldsBySection = useMemo(() => {
    const grouped: Record<string, ParsedFillableField[]> = {};

    // Keywords that indicate party-related fields (case-insensitive)
    const partyKeywords = ['party', 'parties', 'artist', 'promoter', 'client', 'vendor', 'contractor', 'company', 'signatory', 'signatories'];

    const isPartyField = (field: ParsedFillableField): boolean => {
      const sectionLower = (field.section || '').toLowerCase();
      const labelLower = (field.label || '').toLowerCase();

      // Check if section or label contains party-related keywords
      return partyKeywords.some(keyword =>
        sectionLower.includes(keyword) || labelLower.includes(keyword)
      );
    };

    (fields.fillableFields || []).forEach(field => {
      // Skip party-related fields - they're handled in the Parties section
      if (isPartyField(field)) return;

      const section = field.section || 'General';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(field);
    });
    return grouped;
  }, [fields.fillableFields]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Party management - flexible roles
  const addParty = () => {
    setFields(prev => ({
      ...prev,
      parties: [...prev.parties, { name: '', role: 'Party' }],
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

  // Fillable field management
  const updateFillableField = (index: number, value: string | number | boolean) => {
    setFields(prev => ({
      ...prev,
      fillableFields: (prev.fillableFields || []).map((f, i) =>
        i === index ? { ...f, value } : f
      ),
    }));
  };

  // Fee management
  const addFee = () => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        fees: [...(prev.financialTerms.fees || []), { label: '', amount: 0, currency: 'GBP' }],
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

  // Expense management
  const addExpense = () => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        expenses: [...(prev.financialTerms.expenses || []), { type: '', covered: false, details: '' }],
      },
    }));
  };

  const removeExpense = (index: number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        expenses: (prev.financialTerms.expenses || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateExpense = (index: number, field: keyof ParsedExpense, value: string | boolean) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        expenses: (prev.financialTerms.expenses || []).map((e, i) =>
          i === index ? { ...e, [field]: value } : e
        ),
      },
    }));
  };

  // Royalty management
  const addRoyalty = () => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        royalties: [...(prev.financialTerms.royalties || []), { party: '', percentage: 0 }],
      },
    }));
  };

  const removeRoyalty = (index: number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        royalties: (prev.financialTerms.royalties || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateRoyalty = (index: number, field: keyof ParsedRoyalty, value: string | number) => {
    setFields(prev => ({
      ...prev,
      financialTerms: {
        ...prev.financialTerms,
        royalties: (prev.financialTerms.royalties || []).map((r, i) =>
          i === index ? { ...r, [field]: value } : r
        ),
      },
    }));
  };

  // Cancellation tier management
  const addCancellationTier = () => {
    setFields(prev => ({
      ...prev,
      cancellationPolicy: {
        ...prev.cancellationPolicy,
        tiers: [...(prev.cancellationPolicy?.tiers || []), { notice: '', refundPercent: 100 }],
      },
    }));
  };

  const removeCancellationTier = (index: number) => {
    setFields(prev => ({
      ...prev,
      cancellationPolicy: {
        ...prev.cancellationPolicy,
        tiers: (prev.cancellationPolicy?.tiers || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateCancellationTier = (index: number, field: keyof ParsedCancellationTier, value: string | number) => {
    setFields(prev => ({
      ...prev,
      cancellationPolicy: {
        ...prev.cancellationPolicy,
        tiers: (prev.cancellationPolicy?.tiers || []).map((t, i) =>
          i === index ? { ...t, [field]: value } : t
        ),
      },
    }));
  };

  // Terms and conditions management
  const addTermCondition = () => {
    const nextNumber = String((fields.termsAndConditions?.length || 0) + 1);
    setFields(prev => ({
      ...prev,
      termsAndConditions: [...(prev.termsAndConditions || []), { number: nextNumber, title: '', content: '' }],
    }));
  };

  const removeTermCondition = (index: number) => {
    setFields(prev => ({
      ...prev,
      termsAndConditions: (prev.termsAndConditions || []).filter((_, i) => i !== index),
    }));
  };

  const updateTermCondition = (index: number, field: keyof ParsedTermCondition, value: string) => {
    setFields(prev => ({
      ...prev,
      termsAndConditions: (prev.termsAndConditions || []).map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  // Other dates management
  const addOtherDate = () => {
    setFields(prev => ({
      ...prev,
      dates: {
        ...prev.dates,
        otherDates: [...(prev.dates.otherDates || []), { label: '', value: '' }],
      },
    }));
  };

  const removeOtherDate = (index: number) => {
    setFields(prev => ({
      ...prev,
      dates: {
        ...prev.dates,
        otherDates: (prev.dates.otherDates || []).filter((_, i) => i !== index),
      },
    }));
  };

  const updateOtherDate = (index: number, field: 'label' | 'value', value: string) => {
    setFields(prev => ({
      ...prev,
      dates: {
        ...prev.dates,
        otherDates: (prev.dates.otherDates || []).map((d, i) =>
          i === index ? { ...d, [field]: value } : d
        ),
      },
    }));
  };

  // Additional clause management (legacy)
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

  const updateClause = (index: number, field: 'title' | 'content', value: string) => {
    setFields(prev => ({
      ...prev,
      additionalClauses: (prev.additionalClauses || []).map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
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

  // Render a fillable field based on its type
  const renderFillableFieldInput = (field: ParsedFillableField, fieldIndex: number) => {
    const baseClass = "w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm";

    switch (field.type) {
      case 'date':
        return (
          <input
            type="date"
            value={field.value as string || ''}
            onChange={(e) => updateFillableField(fieldIndex, e.target.value)}
            className={baseClass}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            value={field.value as string || ''}
            onChange={(e) => updateFillableField(fieldIndex, e.target.value)}
            className={baseClass}
          />
        );
      case 'currency':
      case 'number':
        return (
          <input
            type="number"
            value={field.value as number || ''}
            onChange={(e) => updateFillableField(fieldIndex, parseFloat(e.target.value) || 0)}
            className={baseClass}
            step={field.type === 'currency' ? '0.01' : '1'}
          />
        );
      case 'yes_no':
        return (
          <select
            value={field.value === true ? 'yes' : field.value === false ? 'no' : ''}
            onChange={(e) => updateFillableField(fieldIndex, e.target.value === 'yes')}
            className={baseClass}
          >
            <option value="">Select...</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        );
      case 'select':
        return (
          <select
            value={field.value as string || ''}
            onChange={(e) => updateFillableField(fieldIndex, e.target.value)}
            className={baseClass}
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            value={field.value as string || ''}
            onChange={(e) => updateFillableField(fieldIndex, e.target.value)}
            className={`${baseClass} resize-none`}
            rows={3}
          />
        );
      default:
        return (
          <input
            type="text"
            value={field.value as string || ''}
            onChange={(e) => updateFillableField(fieldIndex, e.target.value)}
            className={baseClass}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    section,
    count,
  }: {
    title: string;
    icon: typeof FileText;
    section: string;
    count?: number;
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
        {count !== undefined && count > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[rgba(102,0,51,0.1)] text-[#660033]">
            {count}
          </span>
        )}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="h-5 w-5 text-[#660033]" />
      ) : (
        <ChevronDown className="h-5 w-5 text-[#660033]" />
      )}
    </button>
  );

  // Check if there are non-party fillable fields to display
  const nonPartyFillableFieldsCount = Object.values(fillableFieldsBySection).reduce(
    (sum, sectionFields) => sum + sectionFields.length, 0
  );
  const hasFillableFields = nonPartyFillableFieldsCount > 0;

  return (
    <div className="space-y-6">
      {/* No Data Alert - Show re-parse option */}
      {needsExtraction && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              No contract details extracted
            </p>
            <p className="text-xs text-amber-600">
              Click the button to use AI to extract fields from the contract, or fill in the details manually below.
            </p>
          </div>
          <button
            onClick={handleReparse}
            disabled={isReparsing}
            className="flex items-center gap-2 px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {isReparsing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Extract Fields with AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Confidence Indicator */}
      {initialData && initialData.confidence > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(102,0,51,0.03)] border border-[rgba(102,0,51,0.1)]">
          <Sparkles className="h-5 w-5 text-[#660033]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#660033]">
              AI Extraction Confidence: {initialData.confidence}%
              {fields.isTemplate && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[rgba(102,0,51,0.1)] text-[#660033]">
                  Template
                </span>
              )}
            </p>
            <p className="text-xs text-[rgba(102,0,51,0.6)]">
              {hasFillableFields
                ? 'Fill in the blank fields below to complete your contract'
                : 'Review and edit the extracted fields before generating your contract'}
            </p>
          </div>
          <button
            onClick={handleReparse}
            disabled={isReparsing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-[rgba(102,0,51,0.1)] text-[#660033] rounded-lg font-medium hover:bg-[rgba(102,0,51,0.2)] transition-all disabled:opacity-50"
          >
            {isReparsing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Re-extracting...
              </>
            ) : (
              <>
                <Edit3 size={14} />
                Re-extract
              </>
            )}
          </button>
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
              <input
                type="text"
                value={fields.contractType}
                onChange={(e) => setFields(prev => ({ ...prev, contractType: e.target.value }))}
                placeholder="e.g., Performance Agreement, Licensing Agreement"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] focus:border-transparent bg-white text-[#660033] placeholder:text-[rgba(102,0,51,0.4)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Parties Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Parties" icon={Users} section="parties" count={fields.parties.length} />
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
                    <span className="text-sm font-medium text-[#660033]">{party.role || 'Party'}</span>
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
                  <input
                    type="text"
                    value={party.role}
                    onChange={(e) => updateParty(index, 'role', e.target.value)}
                    placeholder="Role (e.g., Artist, Promoter)"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <input
                    type="email"
                    value={party.email || ''}
                    onChange={(e) => updateParty(index, 'email', e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <input
                    type="tel"
                    value={party.phone || ''}
                    onChange={(e) => updateParty(index, 'phone', e.target.value)}
                    placeholder="Phone"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <input
                    type="text"
                    value={party.company || ''}
                    onChange={(e) => updateParty(index, 'company', e.target.value)}
                    placeholder="Company"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <input
                    type="text"
                    value={party.vatNumber || ''}
                    onChange={(e) => updateParty(index, 'vatNumber', e.target.value)}
                    placeholder="VAT Number"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={party.address || ''}
                    onChange={(e) => updateParty(index, 'address', e.target.value)}
                    placeholder="Address"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                  <input
                    type="text"
                    value={party.postcode || ''}
                    onChange={(e) => updateParty(index, 'postcode', e.target.value)}
                    placeholder="Postcode"
                    className="px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                  />
                </div>
                {/* Render any additional fields from otherFields */}
                {party.otherFields && Object.keys(party.otherFields).length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {Object.entries(party.otherFields).map(([fieldKey, fieldValue]) => (
                      <div key={fieldKey}>
                        <label className="block text-xs text-[rgba(102,0,51,0.6)] mb-1">{fieldKey}</label>
                        <input
                          type="text"
                          value={fieldValue || ''}
                          onChange={(e) => {
                            setFields(prev => ({
                              ...prev,
                              parties: prev.parties.map((p, i) =>
                                i === index
                                  ? { ...p, otherFields: { ...p.otherFields, [fieldKey]: e.target.value } }
                                  : p
                              ),
                            }));
                          }}
                          placeholder={`Enter ${fieldKey.toLowerCase()}`}
                          className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Fillable Fields Section - Only show if template has fillable fields */}
      {hasFillableFields && (
        <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
          <SectionHeader
            title="Fields to Complete"
            icon={Edit3}
            section="fillableFields"
            count={nonPartyFillableFieldsCount}
          />
          {expandedSections.fillableFields && (
            <div className="p-6 space-y-6">
              {Object.entries(fillableFieldsBySection).map(([sectionName, sectionFields]) => (
                <div key={sectionName}>
                  <h4 className="text-sm font-semibold text-[#660033] mb-3 flex items-center gap-2">
                    <FileCheck size={14} />
                    {sectionName}
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-[rgba(102,0,51,0.1)]">
                    {sectionFields.map((field) => {
                      // Find the original index in the flat array
                      const fieldIndex = (fields.fillableFields || []).findIndex(
                        f => f.section === field.section && f.label === field.label
                      );
                      return (
                        <div key={`${field.section}-${field.label}`} className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <label className="text-sm text-[#660033] min-w-[180px] flex items-center gap-1">
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className="flex-1">
                            {renderFillableFieldInput(field, fieldIndex)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dates Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Dates & Timeline" icon={Calendar} section="dates" />
        {expandedSections.dates && (
          <div className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            {/* Other Dates */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Additional Dates
              </label>
              <div className="space-y-2">
                {(fields.dates.otherDates || []).map((otherDate, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={otherDate.label}
                      onChange={(e) => updateOtherDate(index, 'label', e.target.value)}
                      placeholder="Label (e.g., Performance Date)"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <input
                      type="text"
                      value={otherDate.value}
                      onChange={(e) => updateOtherDate(index, 'value', e.target.value)}
                      placeholder="Date/Time"
                      className="w-40 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeOtherDate(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOtherDate}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Date
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Financial Terms Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader title="Financial Terms" icon={DollarSign} section="financial" />
        {expandedSections.financial && (
          <div className="p-6 space-y-6">
            {/* Fees */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Fees
              </label>
              <div className="space-y-2">
                {(fields.financialTerms.fees || []).map((fee, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={fee.label}
                      onChange={(e) => updateFee(index, 'label', e.target.value)}
                      placeholder="Fee description"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <select
                      value={fee.currency || 'GBP'}
                      onChange={(e) => updateFee(index, 'currency', e.target.value)}
                      className="w-20 px-2 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    >
                      {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={fee.amount}
                      onChange={(e) => updateFee(index, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      step="0.01"
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

            {/* Expenses */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Expenses
              </label>
              <div className="space-y-2">
                {(fields.financialTerms.expenses || []).map((expense, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={expense.type}
                      onChange={(e) => updateExpense(index, 'type', e.target.value)}
                      placeholder="Expense type (e.g., Travel)"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm text-[#660033]">
                      <input
                        type="checkbox"
                        checked={expense.covered}
                        onChange={(e) => updateExpense(index, 'covered', e.target.checked)}
                        className="w-4 h-4 rounded border-[rgba(102,0,51,0.3)] text-[#660033] focus:ring-[#660033]"
                      />
                      Covered
                    </label>
                    <input
                      type="text"
                      value={expense.details || ''}
                      onChange={(e) => updateExpense(index, 'details', e.target.value)}
                      placeholder="Details"
                      className="w-32 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeExpense(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExpense}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Expense
              </button>
            </div>

            {/* Royalties */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Royalty Splits
              </label>
              <div className="space-y-2">
                {(fields.financialTerms.royalties || []).map((royalty, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={royalty.party}
                      onChange={(e) => updateRoyalty(index, 'party', e.target.value)}
                      placeholder="Party name"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={royalty.percentage}
                        onChange={(e) => updateRoyalty(index, 'percentage', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                      />
                      <span className="text-[#660033]">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRoyalty(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRoyalty}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Royalty Split
              </button>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Payment Terms
              </label>
              <textarea
                value={fields.financialTerms.paymentTerms || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  financialTerms: { ...prev.financialTerms, paymentTerms: e.target.value }
                }))}
                placeholder="Describe the payment schedule and terms"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] resize-none"
              />
            </div>

            {/* Late Payment Terms */}
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Late Payment Terms
              </label>
              <input
                type="text"
                value={fields.financialTerms.latePaymentTerms || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  financialTerms: { ...prev.financialTerms, latePaymentTerms: e.target.value }
                }))}
                placeholder="e.g., 2% interest per month on overdue amounts"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Policy Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader
          title="Cancellation Policy"
          icon={Clock}
          section="cancellation"
          count={fields.cancellationPolicy?.tiers?.length || 0}
        />
        {expandedSections.cancellation && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Policy Description
              </label>
              <textarea
                value={fields.cancellationPolicy?.description || ''}
                onChange={(e) => setFields(prev => ({
                  ...prev,
                  cancellationPolicy: { ...prev.cancellationPolicy, description: e.target.value }
                }))}
                placeholder="General cancellation policy description"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#660033] mb-2">
                Cancellation Tiers
              </label>
              <div className="space-y-2">
                {(fields.cancellationPolicy?.tiers || []).map((tier, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={tier.notice}
                      onChange={(e) => updateCancellationTier(index, 'notice', e.target.value)}
                      placeholder="Notice period (e.g., 14 days)"
                      className="flex-1 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tier.refundPercent}
                        onChange={(e) => updateCancellationTier(index, 'refundPercent', parseFloat(e.target.value) || 0)}
                        placeholder="100"
                        min="0"
                        max="100"
                        className="w-20 px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm"
                      />
                      <span className="text-[#660033] text-sm">% refund</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCancellationTier(index)}
                      className="p-2 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCancellationTier}
                className="mt-2 flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Add Cancellation Tier
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terms & Conditions Section */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader
          title="Terms & Conditions"
          icon={List}
          section="terms"
          count={fields.termsAndConditions?.length || 0}
        />
        {expandedSections.terms && (
          <div className="p-6 space-y-4">
            {(fields.termsAndConditions || []).map((term, index) => (
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
                      {term.number || index + 1}
                    </span>
                    <input
                      type="text"
                      value={term.title}
                      onChange={(e) => updateTermCondition(index, 'title', e.target.value)}
                      placeholder="Term title"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTermCondition(index)}
                    className="p-1.5 text-[rgba(102,0,51,0.4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  value={term.content}
                  onChange={(e) => updateTermCondition(index, 'content', e.target.value)}
                  placeholder="Term content..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[rgba(102,0,51,0.15)] focus:outline-none focus:ring-2 focus:ring-[#660033] bg-white text-[#660033] text-sm resize-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addTermCondition}
              className="flex items-center gap-2 text-[#660033] hover:text-[#8B0045] font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Add Term/Condition
            </button>
          </div>
        )}
      </div>

      {/* Additional Clauses Section (Legacy) */}
      <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
        <SectionHeader
          title="Additional Clauses"
          icon={Shield}
          section="additional"
          count={fields.additionalClauses?.length || 0}
        />
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
