import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, CreditCard, TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalUsers: number;
  activeSubscribers: number;
  totalContracts: number;
  adminCount: number;
  newUsersThisMonth?: number;
  newContractsThisMonth?: number;
}

export default function AdminOverview() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/overview'],
  });

  return (
    <AdminLayout pageTitle="Dashboard Overview">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-red-700">Failed to load dashboard data</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers}
          icon={Users}
          loading={isLoading}
          trend={stats?.newUsersThisMonth ? { value: stats.newUsersThisMonth, label: 'this month' } : undefined}
        />
        <StatCard
          title="Active Subscribers"
          value={stats?.activeSubscribers}
          icon={CreditCard}
          loading={isLoading}
          iconColor="text-green-600"
        />
        <StatCard
          title="Total Contracts"
          value={stats?.totalContracts}
          icon={FileText}
          loading={isLoading}
          trend={stats?.newContractsThisMonth ? { value: stats.newContractsThisMonth, label: 'this month' } : undefined}
        />
        <StatCard
          title="Admin Users"
          value={stats?.adminCount}
          icon={Activity}
          loading={isLoading}
          iconColor="text-purple-600"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <QuickLink href="/admin/users" label="Manage Users" description="View and edit user accounts" />
              <QuickLink href="/admin/templates" label="Manage Templates" description="Create and edit contract templates" />
              <QuickLink href="/admin/subscriptions" label="View Subscriptions" description="Monitor subscription metrics" />
              <QuickLink href="/admin/settings" label="System Settings" description="Configure platform settings" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Activity log will display here once admin actions are tracked.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  title: string;
  value?: number;
  icon: React.ElementType;
  loading?: boolean;
  trend?: { value: number; label: string };
  iconColor?: string;
}

function StatCard({ title, value, icon: Icon, loading, trend, iconColor = 'text-[#660033]' }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value?.toLocaleString() ?? 0}</p>
            )}
            {trend && !loading && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {trend.value > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={trend.value > 0 ? 'text-green-600' : 'text-red-600'}>
                  +{trend.value}
                </span>
                <span>{trend.label}</span>
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-gray-100 ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickLinkProps {
  href: string;
  label: string;
  description: string;
}

function QuickLink({ href, label, description }: QuickLinkProps) {
  return (
    <a
      href={href}
      className="block p-3 rounded-lg border border-gray-200 hover:border-[#660033] hover:bg-[#660033]/5 transition-colors"
    >
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </a>
  );
}
