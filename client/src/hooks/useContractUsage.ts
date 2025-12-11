import { useQuery } from '@tanstack/react-query';

interface ContractUsage {
  current: number;
  limit: number | null;
  isLimited: boolean;
  tier: string;
}

export function useContractUsage() {
  const { data, isLoading, refetch } = useQuery<ContractUsage>({
    queryKey: ['contract-usage'],
    queryFn: async () => {
      const res = await fetch('/api/contracts/usage', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch contract usage');
      return res.json();
    },
    staleTime: 30000, // Consider fresh for 30 seconds
  });

  const isNearLimit = data?.isLimited && data.current >= 8;
  const isAtLimit = data?.isLimited && data.limit !== null && data.current >= data.limit;

  return {
    current: data?.current || 0,
    limit: data?.limit ?? null,
    isLimited: data?.isLimited || false,
    tier: data?.tier || 'free',
    isNearLimit: isNearLimit || false,
    isAtLimit: isAtLimit || false,
    isLoading,
    refetch,
  };
}
