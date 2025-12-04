import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Download, FileText, Sparkles, Shield, AlertTriangle, DollarSign, FileSearch, Clock, Calendar, History, Send, Lock } from 'lucide-react';
import { ContractSummary } from '../components/contracts/ContractSummary';
import { KeyTermsCard } from '../components/contracts/KeyTermsCard';
import { RedFlagsCard } from '../components/contracts/RedFlagsCard';
import { RiskScoreCard } from '../components/contracts/RiskScoreCard';
import { MissingClausesCard } from '../components/contracts/MissingClausesCard';
import { AnalyzingState } from '../components/contracts/AnalyzingState';
import { LegalDisclaimer } from '../components/contracts/LegalDisclaimer';
import { AnalysisMetadata } from '../components/contracts/AnalysisMetadata';
import { VersionHistoryModal } from '../components/contracts/VersionHistoryModal';
import { AddSignatoriesModal, SignatureStatusPanel } from '../components/signatures';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { useContractAnalysis } from '../hooks/useContractAnalysis';
import { usePremium } from '../hooks/usePremium';
import { Contract, ContractAnalysis, ContractVersion } from '../types';
import GrainOverlay from '../components/GrainOverlay';
import { useToast } from '../hooks/use-toast';

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showSignatureStatus, setShowSignatureStatus] = useState(false);
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<ContractVersion | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { analyze, isAnalyzing, error: analysisError, analysis } = useContractAnalysis();
  const { toast } = useToast();
  const { isPremium } = usePremium();
  const isMountedRef = useRef(true);

  const fetchContract = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/contracts/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contract not found');
        }
        throw new Error('Failed to load contract');
      }

      const data = await response.json();

      if (!isMountedRef.current) return;

      setContract(data.contract);

      // Only auto-analyze for premium users
      if (data.contract.extractedText && !data.contract.aiAnalysis && isPremium) {
        analyze(id);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setFetchError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        // Trigger animations after load
        setTimeout(() => setIsLoaded(true), 100);
      }
    }
  }, [id, analyze]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchContract();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchContract]);

  const fetchVersions = useCallback(async () => {
    if (!id) return;

    setVersionsLoading(true);
    try {
      const response = await fetch(`/api/contracts/${id}/versions`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to load versions');

      const data = await response.json();
      if (isMountedRef.current) {
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    } finally {
      if (isMountedRef.current) {
        setVersionsLoading(false);
      }
    }
  }, [id]);

  const handleOpenVersionModal = useCallback(() => {
    setShowVersionModal(true);
    fetchVersions();
  }, [fetchVersions]);

  const handleUploadVersion = useCallback(async (file: File, notes: string) => {
    if (!id) return;

    const formData = new FormData();
    formData.append('file', file);
    if (notes) {
      formData.append('notes', notes);
    }

    const response = await fetch(`/api/contracts/${id}/versions`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Server error. Please try again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    // Update contract with new data
    if (isMountedRef.current) {
      setContract(data.contract);
      fetchVersions();
      toast({
        title: 'New version uploaded',
        description: data.extraction.success
          ? 'Contract updated and ready for analysis.'
          : 'Contract updated but text extraction failed.',
      });
    }
  }, [id, fetchVersions, toast]);

  const handleViewVersion = useCallback((version: ContractVersion) => {
    setViewingVersion(version);
    setShowVersionModal(false);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!contract?.filePath) return;

    let url: string | null = null;
    let anchor: HTMLAnchorElement | null = null;

    try {
      const response = await fetch(`/api/contracts/${id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      if (!isMountedRef.current) return;

      const blob = await response.blob();
      url = window.URL.createObjectURL(blob);
      anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = contract.fileName || 'contract';
      document.body.appendChild(anchor);
      anchor.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      if (anchor && document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
    }
  }, [contract?.filePath, contract?.fileName, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center">
        <GrainOverlay />
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            <FileText size={32} className="text-[#F7E6CA]" />
          </div>
          <p className="text-[rgba(102,0,51,0.6)] font-medium">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !contract) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center">
        <GrainOverlay />
        <div className="text-center">
          <p className="text-[#dc3545] mb-4 font-medium">{fetchError || 'Contract not found'}</p>
          <button
            onClick={() => setLocation('/dashboard')}
            className="px-6 py-3 rounded-xl font-semibold text-[#F7E6CA] transition-all duration-300 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Use version's analysis when viewing a historical version, otherwise use current
  const displayAnalysis: ContractAnalysis | null = viewingVersion
    ? (viewingVersion.aiAnalysis as ContractAnalysis | null)
    : (analysis || contract.aiAnalysis || null);
  const redFlagCount = displayAnalysis?.redFlags?.length || 0;
  const keyTermCount = displayAnalysis?.keyTerms?.length || 0;
  const missingCount = displayAnalysis?.missingClauses?.length || 0;

  return (
    <div className="min-h-screen bg-[#F7E6CA] text-[#660033] overflow-x-hidden">
      <GrainOverlay />

      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => setLocation('/dashboard')}
          className={`flex items-center gap-2 text-[rgba(102,0,51,0.6)] hover:text-[#660033] mb-4 sm:mb-6 transition-all duration-500 group text-sm sm:text-base ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        {/* Header Section */}
        <div
          className={`rounded-xl sm:rounded-[20px] p-4 sm:p-6 mb-4 sm:mb-6 transition-all duration-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            transitionDelay: '100ms'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
              >
                <FileText size={20} className="sm:w-6 sm:h-6 text-[#F7E6CA]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">{contract.name}</h1>
                <div className="flex items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-[rgba(102,0,51,0.5)] flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {new Date(contract.createdAt).toLocaleDateString()}
                  </span>
                  {contract.fileName && (
                    <span className="hidden sm:inline">{contract.fileName} • {contract.fileType?.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              {contract.filePath && (
                <button
                  onClick={handleDownload}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[#660033] bg-[rgba(102,0,51,0.08)] hover:bg-[rgba(102,0,51,0.15)] transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              {contract.status === 'pending_signature' || contract.status === 'signed' ? (
                <button
                  onClick={() => setShowSignatureStatus(true)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[#F7E6CA] transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm hover:scale-105"
                  style={{
                    background: contract.status === 'signed'
                      ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                      : 'linear-gradient(135deg, #660033 0%, #8B0045 100%)'
                  }}
                >
                  {contract.status === 'signed' ? (
                    <>
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Signed - View Details</span>
                      <span className="sm:hidden">Signed</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">View Signature Status</span>
                      <span className="sm:hidden">Status</span>
                    </>
                  )}
                </button>
              ) : isPremium ? (
                <button
                  onClick={() => setShowSignatureModal(true)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[#F7E6CA] transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Request Signatures</span>
                  <span className="sm:hidden">Sign</span>
                </button>
              ) : (
                <button
                  onClick={() => setLocation('/pricing')}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-amber-700 bg-amber-100 transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm hover:bg-amber-200"
                  title="Upgrade to Premium for e-signing"
                >
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">E-Sign (Premium)</span>
                  <span className="sm:hidden">Premium</span>
                </button>
              )}
              <button
                onClick={handleOpenVersionModal}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[#660033] bg-[rgba(102,0,51,0.08)] hover:bg-[rgba(102,0,51,0.15)] transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Versions</span>
              </button>
            </div>
          </div>

          {/* Analysis Metadata */}
          {displayAnalysis?.metadata && (
            <div className="mt-4 pt-4 border-t border-[rgba(102,0,51,0.08)]">
              <AnalysisMetadata
                analyzedAt={displayAnalysis.metadata.analyzedAt}
                version={contract.analysisVersion || 1}
                modelVersion={displayAnalysis.metadata.modelVersion}
                processingTime={displayAnalysis.metadata.processingTime}
                tokenCount={displayAnalysis.metadata.tokenCount}
                truncated={displayAnalysis.metadata.truncated}
              />
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        {displayAnalysis && !isAnalyzing && (
          <div
            className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6 transition-all duration-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="rounded-xl sm:rounded-[16px] p-3 sm:p-5" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
                >
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-[#F7E6CA]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{displayAnalysis.riskAssessment?.overallScore || '--'}</div>
                  <div className="text-[10px] sm:text-xs text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Risk Score</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl sm:rounded-[16px] p-3 sm:p-5" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: redFlagCount > 0 ? 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)' : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' }}
                >
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{redFlagCount}</div>
                  <div className="text-[10px] sm:text-xs text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Red Flags</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl sm:rounded-[16px] p-3 sm:p-5" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' }}
                >
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{keyTermCount}</div>
                  <div className="text-[10px] sm:text-xs text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Key Terms</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl sm:rounded-[16px] p-3 sm:p-5" style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: missingCount > 0 ? 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)' : 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' }}
                >
                  <FileSearch className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold">{missingCount}</div>
                  <div className="text-[10px] sm:text-xs text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Missing</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legal Disclaimer */}
        {(displayAnalysis || isAnalyzing) && (
          <div
            className={`mb-6 transition-all duration-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <LegalDisclaimer />
          </div>
        )}

        {/* Analysis Content */}
        {isAnalyzing ? (
          <AnalyzingState />
        ) : analysisError ? (
          <div
            className="rounded-[20px] p-8"
            style={{
              background: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.2)'
            }}
          >
            <p className="text-[#dc3545] font-semibold text-lg">Analysis Failed</p>
            <p className="text-[rgba(220,53,69,0.8)] mt-2">{analysisError}</p>
            <button
              onClick={() => analyze(id!)}
              className="mt-4 px-6 py-3 rounded-xl font-semibold text-[#F7E6CA] transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              Try Again
            </button>
          </div>
        ) : displayAnalysis ? (
          <>
            {/* Dashboard Grid Layout - responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Row 1: Summary (left) + Red Flags (right) */}
              <div
                className={`transition-all duration-500 h-full ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '400ms' }}
              >
                <div className="h-full [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                  <ContractSummary analysis={displayAnalysis} />
                </div>
              </div>

              <div
                className={`transition-all duration-500 h-full ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '450ms' }}
              >
                <div className="h-full [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                  <RedFlagsCard redFlags={displayAnalysis.redFlags || []} />
                </div>
              </div>

              {/* Row 2: Risk Score (left) + Key Terms (right) */}
              {displayAnalysis.riskAssessment && (
                <div
                  className={`transition-all duration-500 h-full ${
                    isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '500ms' }}
                >
                  <div className="h-full [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                    <RiskScoreCard riskAssessment={displayAnalysis.riskAssessment} />
                  </div>
                </div>
              )}

              <div
                className={`transition-all duration-500 h-full ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '550ms' }}
              >
                <div className="h-full [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                  <KeyTermsCard keyTerms={displayAnalysis.keyTerms || []} />
                </div>
              </div>

              {/* Row 3: Missing Clauses spanning full width */}
              <div
                className={`lg:col-span-2 transition-all duration-500 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '600ms' }}
              >
                <MissingClausesCard missingClauses={displayAnalysis.missingClauses || []} />
              </div>
            </div>

            {/* Footer Disclaimer */}
            <div
              className={`mt-8 transition-all duration-500 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '700ms' }}
            >
              <LegalDisclaimer variant="footer" />
            </div>
          </>
        ) : !contract.extractedText ? (
          <div
            className={`rounded-[20px] p-12 text-center transition-all duration-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ background: 'rgba(255, 255, 255, 0.6)', transitionDelay: '400ms' }}
          >
            <FileText size={48} className="mx-auto mb-4 text-[rgba(102,0,51,0.3)]" />
            <p className="text-[rgba(102,0,51,0.7)] text-lg">
              No text could be extracted from this document.
            </p>
            <p className="text-[rgba(102,0,51,0.5)] mt-2">
              Please upload a text-based PDF or DOCX file for analysis.
            </p>
          </div>
        ) : isPremium ? (
          <div
            className={`rounded-[20px] p-12 text-center transition-all duration-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ background: 'rgba(255, 255, 255, 0.6)', transitionDelay: '400ms' }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              <Sparkles size={36} className="text-[#F7E6CA]" />
            </div>
            <p className="text-[rgba(102,0,51,0.7)] text-lg mb-6">
              This contract has not been analyzed yet.
            </p>
            <button
              onClick={() => analyze(id!)}
              className="px-8 py-4 rounded-xl font-semibold text-[#F7E6CA] transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
            >
              <Sparkles className="inline-block mr-2 h-5 w-5" />
              Analyze with AI
            </button>
          </div>
        ) : (
          <div
            className={`transition-all duration-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <UpgradePrompt
              feature="AI Contract Analysis"
              description="Get instant insights about risks, key terms, and missing clauses in your contracts."
              variant="card"
            />
          </div>
        )}
      </div>

      {/* Add Signatories Modal */}
      {contract && (
        <AddSignatoriesModal
          contract={contract}
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSuccess={(requestId) => {
            setShowSignatureModal(false);
            toast({
              title: "Signature Request Sent",
              description: "Emails have been sent to all signatories.",
            });
            // Refresh contract and show status
            fetchContract();
            setShowSignatureStatus(true);
          }}
        />
      )}

      {/* Signature Status Modal */}
      {showSignatureStatus && contract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <SignatureStatusPanel
              contractId={contract.id}
              onClose={() => setShowSignatureStatus(false)}
            />
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionModal && contract && (
        <VersionHistoryModal
          contractId={contract.id}
          contractName={contract.name}
          currentFileName={contract.fileName}
          versions={versions}
          isLoading={versionsLoading}
          onClose={() => setShowVersionModal(false)}
          onUploadVersion={handleUploadVersion}
          onViewVersion={handleViewVersion}
        />
      )}

      {/* Viewing Historical Version Banner */}
      {viewingVersion && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-2xl shadow-lg flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #660033 0%, #8B0045 100%)' }}
        >
          <div className="flex items-center gap-2 text-[#F7E6CA]">
            <History className="h-5 w-5" />
            <span className="font-semibold">Viewing Version {viewingVersion.versionNumber}</span>
          </div>
          <button
            onClick={() => setViewingVersion(null)}
            className="px-4 py-1.5 rounded-xl bg-[rgba(247,230,202,0.2)] text-[#F7E6CA] font-semibold text-sm hover:bg-[rgba(247,230,202,0.3)] transition-all"
          >
            Back to Current
          </button>
        </div>
      )}
    </div>
  );
}
