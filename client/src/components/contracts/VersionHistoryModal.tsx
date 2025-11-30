import { useState, useRef } from 'react';
import { X, Upload, History, Download, Eye, FileText, Clock, Loader2, ChevronRight } from 'lucide-react';
import { ContractVersion, ContractAnalysis } from '../../types';

interface Props {
  contractId: string;
  contractName: string;
  currentFileName?: string;
  versions: ContractVersion[];
  isLoading: boolean;
  onClose: () => void;
  onUploadVersion: (file: File, notes: string) => Promise<void>;
  onViewVersion: (version: ContractVersion) => void;
}

export function VersionHistoryModal({
  contractId,
  contractName,
  currentFileName,
  versions,
  isLoading,
  onClose,
  onUploadVersion,
  onViewVersion,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotes, setUploadNotes] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShowUploadForm(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setShowUploadForm(true);
    }
  };

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      await onUploadVersion(selectedFile, uploadNotes);
      setSelectedFile(null);
      setUploadNotes('');
      setShowUploadForm(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const getRiskBadgeColor = (riskScore?: string) => {
    switch (riskScore) {
      case 'low':
        return 'bg-[rgba(212,175,55,0.15)] text-[#B8860B]';
      case 'medium':
        return 'bg-[rgba(139,0,69,0.12)] text-[#8B0045]';
      case 'high':
        return 'bg-[rgba(220,53,69,0.15)] text-[#dc3545]';
      default:
        return 'bg-[rgba(102,0,51,0.1)] text-[#660033]';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[24px] shadow-2xl"
        style={{ background: '#F7E6CA' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(102, 0, 51, 0.1)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              <History className="h-5 w-5 text-[#F7E6CA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#660033]">Version History</h2>
              <p className="text-sm text-[rgba(102,0,51,0.6)]">{contractName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[rgba(102,0,51,0.08)] transition-colors"
          >
            <X className="h-5 w-5 text-[#660033]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Upload New Version */}
          {!showUploadForm ? (
            <div
              className={`mb-6 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                dragActive
                  ? 'border-[#660033] bg-[rgba(102,0,51,0.08)]'
                  : 'border-[rgba(102,0,51,0.2)] hover:border-[rgba(102,0,51,0.4)] hover:bg-[rgba(102,0,51,0.04)]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-3 text-[rgba(102,0,51,0.4)]" />
                <p className="font-semibold text-[#660033] mb-1">Upload New Version</p>
                <p className="text-sm text-[rgba(102,0,51,0.5)]">
                  Drag & drop or click to select (PDF, DOC, DOCX)
                </p>
              </div>
            </div>
          ) : (
            <div
              className="mb-6 p-5 rounded-xl"
              style={{ background: 'rgba(255, 255, 255, 0.6)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(102,0,51,0.1)]">
                  <FileText className="h-5 w-5 text-[#660033]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#660033] truncate">{selectedFile?.name}</p>
                  <p className="text-sm text-[rgba(102,0,51,0.5)]">
                    {formatFileSize(selectedFile?.size)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setShowUploadForm(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[rgba(102,0,51,0.1)] transition-colors"
                >
                  <X className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
                </button>
              </div>

              <textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Add notes about this version (optional)"
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none resize-none text-sm"
                rows={2}
              />

              {uploadError && (
                <div className="mt-3 p-3 rounded-xl bg-[rgba(220,53,69,0.1)] border border-[rgba(220,53,69,0.2)]">
                  <p className="text-sm text-[#dc3545]">{uploadError}</p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setShowUploadForm(false);
                    setUploadNotes('');
                    setUploadError(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-[#660033] bg-[rgba(102,0,51,0.08)] hover:bg-[rgba(102,0,51,0.15)] transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-[#F7E6CA] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Version
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Current Version */}
          {currentFileName && (
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-3">
                Current Version
              </h3>
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(102,0,51,0.08) 0%, rgba(139,0,69,0.05) 100%)',
                  border: '1px solid rgba(102, 0, 51, 0.15)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                  >
                    <FileText className="h-5 w-5 text-[#F7E6CA]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#660033]">{currentFileName}</p>
                    <p className="text-xs text-[rgba(102,0,51,0.5)]">Latest version</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-[rgba(40,167,69,0.15)] text-[#28a745]">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Version History */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-[rgba(102,0,51,0.5)] mb-3">
              Previous Versions
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#660033]" />
              </div>
            ) : versions.length === 0 ? (
              <div
                className="p-8 rounded-xl text-center"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
              >
                <Clock className="h-10 w-10 mx-auto mb-3 text-[rgba(102,0,51,0.3)]" />
                <p className="text-[rgba(102,0,51,0.6)]">No previous versions</p>
                <p className="text-sm text-[rgba(102,0,51,0.4)] mt-1">
                  Upload a new version to start tracking changes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="p-4 rounded-xl transition-all hover:shadow-[0_4px_12px_rgba(102,0,51,0.08)]"
                    style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(102,0,51,0.08)]">
                        <FileText className="h-5 w-5 text-[#660033]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#660033]">
                            Version {version.versionNumber}
                          </span>
                          {version.aiRiskScore && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getRiskBadgeColor(
                                version.aiRiskScore
                              )}`}
                            >
                              {version.aiRiskScore} risk
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[rgba(102,0,51,0.5)] truncate">
                          {version.fileName || 'No filename'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[rgba(102,0,51,0.4)]">
                          <span>{formatDate(version.createdAt)}</span>
                          <span>{formatFileSize(version.fileSize)}</span>
                        </div>
                        {version.notes && (
                          <p className="mt-2 text-sm text-[rgba(102,0,51,0.7)] italic">
                            "{version.notes}"
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {version.aiAnalysis && (
                          <button
                            onClick={() => onViewVersion(version)}
                            className="p-2 rounded-lg bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                            title="View Analysis"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {version.filePath && (
                          <a
                            href={`/api/contracts/${version.contractId}/versions/${version.id}/download`}
                            className="p-2 rounded-lg bg-[rgba(102,0,51,0.08)] text-[#660033] hover:bg-[rgba(102,0,51,0.15)] transition-all"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
