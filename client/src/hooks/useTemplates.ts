/**
 * useTemplates Hook
 * Epic 3: Contract Templates System - Story 3.7
 *
 * Data hook for fetching and filtering contract templates.
 * Enhanced with support for user templates (Alpha feature).
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { ContractTemplate } from '@shared/schema';

export type TemplateCategory = 'artist' | 'licensing' | 'touring' | 'production' | 'business';
export type TemplateCategoryWithUser = TemplateCategory | 'all' | 'my-templates';

interface UseTemplatesReturn {
  templates: ContractTemplate[];
  loading: boolean;
  error: string | null;
  category: TemplateCategoryWithUser;
  setCategory: (cat: TemplateCategoryWithUser) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => void;
}

interface TemplatesResponse {
  templates: ContractTemplate[];
}

export function useTemplates(): UseTemplatesReturn {
  const [category, setCategory] = useState<TemplateCategoryWithUser>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Build query key that includes filters
  const queryKey = useMemo(() => {
    // For user templates, use the user templates endpoint
    if (category === 'my-templates') {
      return '/api/user/templates';
    }

    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (searchQuery) params.set('search', searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/templates?${queryString}` : '/api/templates';
  }, [category, searchQuery]);

  const { data, isLoading, error, refetch } = useQuery<TemplatesResponse>({
    queryKey: [queryKey],
    staleTime: 30000, // 30 seconds
    retry: category === 'my-templates' ? false : 3, // Don't retry for user templates (403 for non-alpha)
  });

  // Filter user templates by search query (since server doesn't do it)
  const templates = useMemo(() => {
    const rawTemplates = data?.templates ?? [];
    if (category === 'my-templates' && searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return rawTemplates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        (t.description?.toLowerCase().includes(searchLower) ?? false)
      );
    }
    return rawTemplates;
  }, [data?.templates, category, searchQuery]);

  return {
    templates,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    refresh: () => refetch(),
  };
}
