/**
 * useTemplates Hook
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Data hook for fetching and filtering contract templates.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ContractTemplate } from '@shared/schema';

export type TemplateCategory = 'artist' | 'licensing' | 'touring' | 'production' | 'business';

interface UseTemplatesReturn {
  templates: ContractTemplate[];
  loading: boolean;
  error: string | null;
  category: TemplateCategory | 'all';
  setCategory: (cat: TemplateCategory | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => void;
}

interface TemplatesResponse {
  templates: ContractTemplate[];
}

export function useTemplates(): UseTemplatesReturn {
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Build query key that includes filters
  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (searchQuery) params.set('search', searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/templates?${queryString}` : '/api/templates';
  }, [category, searchQuery]);

  const { data, isLoading, error, refetch } = useQuery<TemplatesResponse>({
    queryKey: [queryKey],
    staleTime: 30000, // 30 seconds
  });

  return {
    templates: data?.templates ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    refresh: () => refetch(),
  };
}
