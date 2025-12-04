import { useAuth } from '@/lib/auth';

/**
 * Hook to check premium subscription status
 */
export function usePremium() {
  const { user, isLoading } = useAuth();

  const isPremium = user?.subscriptionStatus === 'active' ||
                    user?.subscriptionStatus === 'trialing';

  return {
    isPremium,
    user,
    isLoading,
    subscriptionStatus: user?.subscriptionStatus || 'none'
  };
}
