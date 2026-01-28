import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';

/**
 * Redirect page for /contracts route.
 * - Authenticated users are redirected to /dashboard?tab=contracts
 * - Unauthenticated users are redirected to /auth
 */
export default function Contracts() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        setLocation('/dashboard?tab=contracts');
      } else {
        setLocation('/auth');
      }
    }
  }, [user, isLoading, setLocation]);

  // Show nothing while determining auth state and redirecting
  return null;
}
