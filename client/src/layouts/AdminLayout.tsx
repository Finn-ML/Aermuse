import { Redirect } from 'wouter';
import { useAuth } from '../lib/auth';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminHeader } from '../components/admin/AdminHeader';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AdminLayout({ children, pageTitle }: AdminLayoutProps) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#660033]" />
      </div>
    );
  }

  // Redirect non-authenticated users to login
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Redirect non-admins to regular dashboard
  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content area */}
      <div className="lg:pl-64">
        <AdminHeader pageTitle={pageTitle} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
