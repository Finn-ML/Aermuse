import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, CheckCircle, AlertCircle, Upload, FileText, Trash2 } from 'lucide-react';

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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['.pdf', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

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

  // Epic 13: Contract upload state
  const [includeContract, setIncludeContract] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Invalid file type. Accepted: ${ALLOWED_FILE_TYPES.join(', ')}`;
    }

    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setContractFile(null);
    } else {
      setFileError(null);
      setContractFile(file);
    }
  }, [validateFile]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Remove selected file
  const removeFile = useCallback(() => {
    setContractFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
      let response: Response;

      // Epic 13: Use FormData if contract file is included
      if (includeContract && contractFile) {
        const formDataObj = new FormData();
        formDataObj.append('proposalData', JSON.stringify({
          landingPageId,
          ...formData,
        }));
        formDataObj.append('contractFile', contractFile);

        response = await fetch('/api/proposals', {
          method: 'POST',
          body: formDataObj,
          // Don't set Content-Type header - browser will set it with boundary for multipart
        });
      } else {
        // Standard JSON request for proposals without contracts
        response = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            landingPageId,
            ...formData,
          }),
        });
      }

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
    // Epic 13: Reset contract state
    setIncludeContract(false);
    setContractFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Success state
  if (submitStatus === 'success') {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {contractFile ? 'Proposal with Contract Sent!' : 'Proposal Sent!'}
          </h2>
          <p className="text-gray-600 mb-6">
            Your proposal{contractFile ? ' and contract' : ''} has been sent to {artistName}. They'll receive a notification
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
      </div>,
      document.body
    );
  }

  return createPortal(
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

          {/* Epic 13: Contract Upload Section */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeContract}
                onChange={(e) => {
                  setIncludeContract(e.target.checked);
                  if (!e.target.checked) {
                    removeFile();
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 focus:ring-2"
                style={{ accentColor: primaryColor }}
              />
              <span className="text-sm font-medium text-gray-700">
                Include a contract with this proposal
              </span>
            </label>

            {includeContract && (
              <div className="mt-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(',')}
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!contractFile ? (
                  /* Drop zone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-blue-400 bg-blue-50'
                        : fileError
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-700">
                      {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX up to 10MB
                    </p>
                  </div>
                ) : (
                  /* File preview */
                  <div className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 bg-gray-50">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <FileText className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contractFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(contractFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* File error */}
                {fileError && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {fileError}
                  </p>
                )}
              </div>
            )}
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
            By submitting, you agree to our <a href="/terms" target="_blank" className="underline hover:text-gray-700">Terms of Service</a> and <a href="/privacy" target="_blank" className="underline hover:text-gray-700">Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
}
