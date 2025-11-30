import { useState, useCallback } from 'react';

interface SignatoryInput {
  name: string;
  email: string;
}

interface CreateSignatureRequestInput {
  contractId: string;
  signatories: SignatoryInput[];
  message?: string;
  expiresAt?: string;
}

interface SignatoryResponse {
  id: string;
  name: string;
  email: string;
  status: 'waiting' | 'pending' | 'signed';
  signingUrl: string | null;
  signingOrder: number;
}

interface SignatureRequestResponse {
  id: string;
  contractId: string;
  status: string;
  signingOrder: string;
  message: string | null;
  expiresAt: string | null;
  createdAt: string;
  signatories: SignatoryResponse[];
}

interface UseSignatureRequestReturn {
  createRequest: (data: CreateSignatureRequestInput) => Promise<SignatureRequestResponse>;
  getRequest: (requestId: string) => Promise<SignatureRequestResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useSignatureRequest(): UseSignatureRequestReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(async (data: CreateSignatureRequestInput): Promise<SignatureRequestResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/signatures/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create signature request');
      }

      return result.signatureRequest;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRequest = useCallback(async (requestId: string): Promise<SignatureRequestResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/signatures/request/${requestId}`, {
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch signature request');
      }

      return result.signatureRequest;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { createRequest, getRequest, isLoading, error, clearError };
}
