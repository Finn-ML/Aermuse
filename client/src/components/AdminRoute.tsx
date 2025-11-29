import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '../lib/auth';
import { Loader2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

/**
 * Route wrapper that requires admin role.
 * Redirects to dashboard if user is not admin.
 */
export function AdminRoute({ children }: Props) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7E6CA]">
        <Loader2 className="animate-spin text-[#660033]" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Redirect to="/dashboard" replace />;
  }

  return <>{children}</>;
}
