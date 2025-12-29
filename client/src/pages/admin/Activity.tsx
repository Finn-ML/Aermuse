import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Download, User, FileText, Settings, Shield, CreditCard, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string | null;
}

interface ActivityResponse {
  activities: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Action descriptions for display
const ACTION_LABELS: Record<string, string> = {
  user_create: 'Created user',
  user_update: 'Updated user',
  user_delete: 'Deleted user',
  user_role_change: 'Changed user role',
  user_subscription_change: 'Changed subscription',
  template_create: 'Created template',
  template_update: 'Updated template',
  template_delete: 'Deleted template',
  template_activate: 'Activated template',
  template_deactivate: 'Deactivated template',
  template_clone: 'Cloned template',
  contract_delete: 'Deleted contract',
  contract_update: 'Updated contract',
  settings_update: 'Updated settings',
  export_users: 'Exported users',
  export_contracts: 'Exported contracts',
  export_activity: 'Exported activity',
  login: 'Logged in',
  logout: 'Logged out',
};

export default function AdminActivity() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());
  if (actionFilter !== 'all') {
    // For action filter, we filter by prefix on the client side since our actions use underscores
  }
  if (entityFilter !== 'all') {
    queryParams.set('entityType', entityFilter);
  }

  const { data, isLoading, error } = useQuery<ActivityResponse>({
    queryKey: ['/api/admin/activity', page, entityFilter],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin/activity?${queryParams.toString()}`);
      return response.json();
    },
  });

  const activities = data?.activities || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  // Filter by action prefix on client side
  const filteredActivities = activities.filter(activity => {
    if (actionFilter === 'all') return true;
    return activity.action.startsWith(actionFilter);
  });

  const handleExport = () => {
    const csv = [
      ['ID', 'Admin', 'Email', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'Timestamp'],
      ...filteredActivities.map(a => [
        a.id,
        a.adminName || 'Unknown',
        a.adminEmail,
        a.action,
        a.entityType,
        a.entityId || '',
        a.details ? JSON.stringify(a.details) : '',
        a.ipAddress || '',
        a.createdAt || '',
      ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-activity-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith('user')) return <User className="h-4 w-4" />;
    if (action.startsWith('template') || action.startsWith('contract')) return <FileText className="h-4 w-4" />;
    if (action.startsWith('settings')) return <Settings className="h-4 w-4" />;
    if (action.startsWith('subscription')) return <CreditCard className="h-4 w-4" />;
    return <History className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-100 text-blue-700',
      template: 'bg-purple-100 text-purple-700',
      contract: 'bg-green-100 text-green-700',
      settings: 'bg-orange-100 text-orange-700',
      subscription: 'bg-pink-100 text-pink-700',
      export: 'bg-gray-100 text-gray-700',
    };

    const prefix = Object.keys(colors).find(p => action.startsWith(p));
    const colorClass = prefix ? colors[prefix] : 'bg-gray-100 text-gray-700';

    return (
      <Badge variant="outline" className={colorClass}>
        {ACTION_LABELS[action] || action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AdminLayout pageTitle="Activity Log">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Admin Activity Log</CardTitle>
              {total > 0 && (
                <p className="text-sm text-gray-500 mt-1">{total} total activities</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredActivities.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="template">Template Actions</SelectItem>
                <SelectItem value="contract">Contract Actions</SelectItem>
                <SelectItem value="settings">Settings Actions</SelectItem>
                <SelectItem value="export">Export Actions</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Failed to load activity logs. Please try again.
              </p>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {activities.length === 0 ? 'No activity records yet' : 'No matching activities found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivities.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gray-100 rounded">
                                {getActionIcon(activity.action)}
                              </div>
                              {getActionBadge(activity.action)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#660033] rounded-full flex items-center justify-center">
                                <Shield className="h-3 w-3 text-white" />
                              </div>
                              <div>
                                <span className="text-sm block">{activity.adminName || 'Admin'}</span>
                                <span className="text-xs text-gray-500">{activity.adminEmail}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {activity.entityType}
                              {activity.entityId && (
                                <span className="ml-1 text-gray-400">#{activity.entityId.slice(0, 8)}</span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {activity.details ? (
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                                {JSON.stringify(activity.details).slice(0, 50)}
                                {JSON.stringify(activity.details).length > 50 && '...'}
                              </code>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">
                            {activity.ipAddress || '-'}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                            {formatTimestamp(activity.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
