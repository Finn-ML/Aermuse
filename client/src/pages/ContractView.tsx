import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { ContractSummary } from '../components/contracts/ContractSummary';
import { KeyTermsCard } from '../components/contracts/KeyTermsCard';
import { AnalyzingState } from '../components/contracts/AnalyzingState';
import { useContractAnalysis } from '../hooks/useContractAnalysis';
import { Contract, ContractAnalysis } from '../types';
import { Button } from '../components/ui/button';

export default function ContractView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { analyze, isAnalyzing, error: analysisError, analysis } = useContractAnalysis();

  useEffect(() => {
    if (id) {
      fetchContract();
    }
  }, [id]);

  const fetchContract = async () => {
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
      setContract(data.contract);

      // Auto-analyze if has extracted text but no analysis yet
      if (data.contract.extractedText && !data.contract.aiAnalysis) {
        analyze(id!);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = () => {
    if (id) {
      analyze(id);
    }
  };

  const handleDownload = async () => {
    if (!contract?.filePath) return;

    try {
      const response = await fetch(`/api/contracts/${id}/download`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = contract.fileName || 'contract';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

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
                <Button variant="outline" size="sm" onClick={handleReanalyze}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-analyze
                </Button>
              )}
            </div>
          </div>

          {/* Analysis Metadata */}
          {displayAnalysis?.metadata && (
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              Analyzed {new Date(displayAnalysis.metadata.analyzedAt).toLocaleString()}
              {' '}&bull;{' '}
              {displayAnalysis.metadata.tokenCount.toLocaleString()} tokens
              {displayAnalysis.metadata.truncated && ' (truncated)'}
            </div>
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Disclaimer:</strong> This AI analysis is for informational purposes only
            and does not constitute legal advice. Always consult with a qualified attorney
            before signing any contract.
          </p>
        </div>

        {/* Analysis Content */}
        {isAnalyzing ? (
          <AnalyzingState />
        ) : analysisError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-medium">Analysis Failed</p>
            <p className="text-red-700 mt-1">{analysisError}</p>
            <Button
              onClick={handleReanalyze}
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

            {/* Key Terms */}
            <KeyTermsCard keyTerms={displayAnalysis.keyTerms} />

            {/* Red Flags and Risk Assessment will be added in Story 2.5 */}
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
            <Button onClick={handleReanalyze}>
              Analyze Contract
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
