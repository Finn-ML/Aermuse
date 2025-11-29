import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { ContractSummary } from '../components/contracts/ContractSummary';
import { KeyTermsCard } from '../components/contracts/KeyTermsCard';
import { RedFlagsCard } from '../components/contracts/RedFlagsCard';
import { RiskScoreCard } from '../components/contracts/RiskScoreCard';
import { MissingClausesCard } from '../components/contracts/MissingClausesCard';
import { AnalyzingState } from '../components/contracts/AnalyzingState';
import { LegalDisclaimer } from '../components/contracts/LegalDisclaimer';
import { AnalysisMetadata } from '../components/contracts/AnalysisMetadata';
import { ReanalyzeConfirmModal } from '../components/contracts/ReanalyzeConfirmModal';
import { useContractAnalysis } from '../hooks/useContractAnalysis';
import { Contract, ContractAnalysis } from '../types';
import { Button } from '../components/ui/button';

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const { analyze, isAnalyzing, error: analysisError, analysis } = useContractAnalysis();
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

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      setContract(data.contract);

      // Auto-analyze if has extracted text but no analysis yet
      if (data.contract.extractedText && !data.contract.aiAnalysis) {
        analyze(id);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setFetchError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
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

  const handleReanalyze = () => {
    setShowReanalyzeModal(false);
    if (id) {
      analyze(id);
    }
  };

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

      // Check if component unmounted during fetch
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
      // Clean up
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading contract...</div>
      </div>
    );
  }

  if (fetchError || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{fetchError || 'Contract not found'}</p>
          <Button onClick={() => setLocation('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Use fresh analysis if available, otherwise use stored analysis
  const displayAnalysis: ContractAnalysis | null = analysis || contract.aiAnalysis || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Back Button */}
        <button
          onClick={() => setLocation('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Contract Header */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contract.name}</h1>
              <p className="text-gray-500 mt-1">
                Uploaded {new Date(contract.createdAt).toLocaleDateString()}
              </p>
              {contract.fileName && (
                <p className="text-sm text-gray-400 mt-1">{contract.fileName}</p>
              )}
            </div>
            <div className="flex gap-2">
              {contract.filePath && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {displayAnalysis && !isAnalyzing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReanalyzeModal(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-analyze
                </Button>
              )}
            </div>
          </div>

          {/* Analysis Metadata */}
          {displayAnalysis?.metadata && (
            <div className="mt-4 pt-4 border-t">
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

        {/* Legal Disclaimer */}
        {(displayAnalysis || isAnalyzing) && (
          <LegalDisclaimer className="mb-6" />
        )}

        {/* Analysis Content */}
        {isAnalyzing ? (
          <AnalyzingState />
        ) : analysisError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-medium">Analysis Failed</p>
            <p className="text-red-700 mt-1">{analysisError}</p>
            <Button
              onClick={() => analyze(id!)}
              variant="outline"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : displayAnalysis ? (
          <div className="space-y-6">
            {/* Summary */}
            <ContractSummary analysis={displayAnalysis} />

            {/* Risk Score - Prominent position */}
            {displayAnalysis.riskAssessment && (
              <RiskScoreCard riskAssessment={displayAnalysis.riskAssessment} />
            )}

            {/* Red Flags */}
            <RedFlagsCard redFlags={displayAnalysis.redFlags || []} />

            {/* Key Terms */}
            <KeyTermsCard keyTerms={displayAnalysis.keyTerms || []} />

            {/* Missing Clauses */}
            <MissingClausesCard missingClauses={displayAnalysis.missingClauses || []} />

            {/* Footer Disclaimer */}
            <LegalDisclaimer variant="footer" />
          </div>
        ) : !contract.extractedText ? (
          <div className="bg-gray-50 rounded-lg border p-8 text-center">
            <p className="text-gray-600">
              No text could be extracted from this document.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Please upload a text-based PDF or DOCX file for analysis.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg border p-8 text-center">
            <p className="text-gray-600 mb-4">
              This contract has not been analyzed yet.
            </p>
            <Button onClick={() => analyze(id!)}>Analyze Contract</Button>
          </div>
        )}
      </div>

      {/* Re-analyze Confirmation Modal */}
      {showReanalyzeModal && (
        <ReanalyzeConfirmModal
          onConfirm={handleReanalyze}
          onCancel={() => setShowReanalyzeModal(false)}
        />
      )}
    </div>
  );
}
