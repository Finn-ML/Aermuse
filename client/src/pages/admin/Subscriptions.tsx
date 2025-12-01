import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, TrendingUp, Users, PoundSterling, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { User } from '@shared/schema';

type SafeUser = Omit<User, 'password'>;

export default function AdminSubscriptions() {
  const { data: users = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ['/api/admin/users'],
  });

  // Calculate subscription metrics
  const activeSubscribers = users.filter(u => u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trialing');
  const cancellingSubscribers = users.filter(u => u.subscriptionCancelAtPeriodEnd);
  const trialingUsers = users.filter(u => u.subscriptionStatus === 'trialing');
  const pastDueUsers = users.filter(u => u.subscriptionStatus === 'past_due');

  // Calculate MRR (Monthly Recurring Revenue) - £9/month per active subscriber
  const mrr = activeSubscribers.length * 9;

  // Group subscribers by month joined (simplified)
  const subscribersByStatus: Record<string, number> = users.reduce((acc, user) => {
    const status = user.subscriptionStatus || 'none';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusBadge = (status: string | null, cancelAtEnd?: boolean | null) => {
    if (cancelAtEnd) {
      return <Badge variant="outline" className="text-orange-600 border-orange-200">Cancelling</Badge>;
    }
    const variants: Record<string, { className: string; icon?: React.ReactNode }> = {
      active: { className: 'bg-green-600', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      trialing: { className: 'bg-blue-600', icon: <Clock className="h-3 w-3 mr-1" /> },
      past_due: { className: 'bg-red-600', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      canceled: { className: 'bg-gray-400' },
      none: { className: '' },
    };
    const config = variants[status || 'none'] || variants.none;
    if (!status || status === 'none') {
      return <span className="text-gray-400">-</span>;
    }
    return (
      <Badge variant="default" className={config.className}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  return (
    <AdminLayout pageTitle="Subscription Metrics">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Active Subscribers"
          value={activeSubscribers.length}
          icon={Users}
          loading={isLoading}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Monthly Revenue"
          value={`£${mrr}`}
          icon={PoundSterling}
          loading={isLoading}
          iconColor="text-[#660033]"
        />
        <MetricCard
          title="Trialing"
          value={trialingUsers.length}
          icon={Clock}
          loading={isLoading}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Past Due"
          value={pastDueUsers.length}
          icon={AlertCircle}
          loading={isLoading}
          iconColor="text-red-600"
        />
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(subscribersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#660033] rounded-full"
                        style={{ width: `${(count / users.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Cancelling Soon</CardTitle>
          </CardHeader>
          <CardContent>
            {cancellingSubscribers.length === 0 ? (
              <p className="text-sm text-gray-500">No subscriptions set to cancel</p>
            ) : (
              <div className="space-y-3">
                {cancellingSubscribers.slice(0, 5).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center">
                        <span className="text-orange-700 text-sm font-medium">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Ends</p>
                      <p className="text-sm font-medium">
                        {user.subscriptionCurrentPeriodEnd
                          ? new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString()
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscriber List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stripe Customer</TableHead>
                    <TableHead>Current Period End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSubscribers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No active subscribers
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeSubscribers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#660033] rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {user.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.subscriptionStatus, user.subscriptionCancelAtPeriodEnd)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-500">
                          {user.stripeCustomerId || '-'}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {user.subscriptionCurrentPeriodEnd
                            ? new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  loading?: boolean;
  iconColor?: string;
}

function MetricCard({ title, value, icon: Icon, loading, iconColor = 'text-[#660033]' }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {loading ? (
              <div className="h-8 w-20 bg-gray-100 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
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
