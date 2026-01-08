/**
 * useUserTemplates Hook
 * Alpha Feature: User Custom Templates
 *
 * Data hook for fetching and managing user's custom contract templates.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ContractTemplate } from '@shared/schema';

interface UserTemplatesResponse {
  templates: ContractTemplate[];
}

interface CreateTemplateParams {
  sourceTemplateId: string;
  name: string;
  description?: string;
}

interface UpdateTemplateParams {
  id: string;
  name?: string;
  description?: string;
}

export function useUserTemplates() {
  const { data, isLoading, error, refetch } = useQuery<UserTemplatesResponse>({
    queryKey: ['/api/user/templates'],
    staleTime: 30000, // 30 seconds
    retry: false, // Don't retry on 403 (non-alpha users)
  });

  return {
    templates: data?.templates ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refresh: () => refetch(),
  };
}

export function useCreateUserTemplate() {
  return useMutation({
    mutationFn: async (params: CreateTemplateParams) => {
      const res = await apiRequest('POST', '/api/user/templates', params);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/templates'] });
    },
  });
}

export function useUpdateUserTemplate() {
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTemplateParams) => {
      const res = await apiRequest('PUT', `/api/user/templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/templates'] });
    },
  });
}

export function useDeleteUserTemplate() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/user/templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/templates'] });
    },
  });
}
