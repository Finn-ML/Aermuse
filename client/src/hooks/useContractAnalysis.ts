import { useState, useCallback } from 'react';
import { ContractAnalysis, AnalysisUsage } from '../types';

interface UseContractAnalysisReturn {
  analyze: (contractId: string) => Promise<void>;
  isAnalyzing: boolean;
  error: string | null;
  analysis: ContractAnalysis | null;
  usage: AnalysisUsage | null;
  clearError: () => void;
}

export function useContractAnalysis(): UseContractAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [usage, setUsage] = useState<AnalysisUsage | null>(null);

  const analyze = useCallback(async (contractId: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/contracts/${contractId}/analyze`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
      setUsage(data.usage || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { analyze, isAnalyzing, error, analysis, usage, clearError };
}
