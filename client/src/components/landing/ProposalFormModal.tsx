import { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface ProposalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  landingPageId: string;
  artistName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const PROPOSAL_TYPES = [
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'booking', label: 'Booking' },
  { value: 'recording', label: 'Recording' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'other', label: 'Other' },
] as const;

const MAX_MESSAGE_LENGTH = 1000;

export function ProposalFormModal({
  isOpen,
  onClose,
  landingPageId,
  artistName,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
}: ProposalFormModalProps) {
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    senderCompany: '',
    proposalType: 'collaboration' as string,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.senderName.trim()) {
      newErrors.senderName = 'Name is required';
    }

    if (!formData.senderEmail.trim()) {
      newErrors.senderEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.senderEmail)) {
      newErrors.senderEmail = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length > MAX_MESSAGE_LENGTH) {
      newErrors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landingPageId,
          ...formData,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to submit proposal');
        setSubmitStatus('error');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      senderName: '',
      senderEmail: '',
      senderCompany: '',
      proposalType: 'collaboration',
      message: '',
    });
    setErrors({});
    setSubmitStatus('idle');
    setErrorMessage('');
    onClose();
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Sent!</h2>
          <p className="text-gray-600 mb-6">
            Your proposal has been sent to {artistName}. They'll receive a notification
            and can respond to you directly.
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-2 font-medium rounded-lg transition-colors"
            style={{ backgroundColor: primaryColor, color: secondaryColor }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Send Proposal to {artistName}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error banner */}
          {submitStatus === 'error' && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.senderName}
              onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.senderName ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              placeholder="John Smith"
            />
            {errors.senderName && (
              <p className="mt-1 text-sm text-red-500">{errors.senderName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.senderEmail}
              onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.senderEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              placeholder="john@example.com"
            />
            {errors.senderEmail && (
              <p className="mt-1 text-sm text-red-500">{errors.senderEmail}</p>
            )}
          </div>

          {/* Company (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company / Organization
            </label>
            <input
              type="text"
              value={formData.senderCompany}
              onChange={(e) => setFormData({ ...formData, senderCompany: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              placeholder="Acme Records (optional)"
            />
          </div>

          {/* Proposal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proposal Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.proposalType}
              onChange={(e) => setFormData({ ...formData, proposalType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            >
              {PROPOSAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              placeholder="Describe your proposal..."
            />
            <div className="flex justify-between mt-1">
              {errors.message ? (
                <p className="text-sm text-red-500">{errors.message}</p>
              ) : (
                <span />
              )}
              <span
                className={`text-sm ${
                  formData.message.length > MAX_MESSAGE_LENGTH
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {formData.message.length}/{MAX_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: primaryColor, color: secondaryColor }}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Proposal
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By submitting, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
}
