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
import { Loader2, Download, User, FileText, Settings, Shield, CreditCard, History } from 'lucide-react';

interface AdminActivity {
  id: string;
  adminId: string;
  adminName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export default function AdminActivity() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  // Activity log endpoint not implemented yet
  const { data: activities = [], isLoading } = useQuery<AdminActivity[]>({
    queryKey: ['/api/admin/activity'],
    enabled: false, // Disable until API is implemented
  });

  // Mock data for demonstration
  const mockActivities: AdminActivity[] = [
    {
      id: '1',
      adminId: 'admin-1',
      adminName: 'Admin User',
      action: 'user.role_change',
      entityType: 'user',
      entityId: 'user-123',
      details: { oldRole: 'user', newRole: 'admin' },
      ipAddress: '192.168.1.1',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      adminId: 'admin-1',
      adminName: 'Admin User',
      action: 'template.update',
      entityType: 'template',
      entityId: 'template-456',
      details: { name: 'Artist Agreement' },
      ipAddress: '192.168.1.1',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      adminId: 'admin-1',
      adminName: 'Admin User',
      action: 'settings.update',
      entityType: 'setting',
      details: { key: 'platform.maintenance_mode', value: false },
      ipAddress: '192.168.1.1',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  const displayActivities = activities.length > 0 ? activities : mockActivities;

  const filteredActivities = displayActivities.filter(activity => {
    const matchesAction = actionFilter === 'all' || activity.action.startsWith(actionFilter);
    const matchesEntity = entityFilter === 'all' || activity.entityType === entityFilter;
    return matchesAction && matchesEntity;
  });

  const handleExport = () => {
    const csv = [
      ['ID', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Timestamp'],
      ...filteredActivities.map(a => [
        a.id,
        a.adminName || a.adminId,
        a.action,
        a.entityType,
        a.entityId || '',
        a.ipAddress || '',
        a.createdAt,
      ])
    ].map(row => row.join(',')).join('\n');

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
      'user.': 'bg-blue-100 text-blue-700',
      'template.': 'bg-purple-100 text-purple-700',
      'contract.': 'bg-green-100 text-green-700',
      'settings.': 'bg-orange-100 text-orange-700',
      'subscription.': 'bg-pink-100 text-pink-700',
      'export.': 'bg-gray-100 text-gray-700',
    };

    const prefix = Object.keys(colors).find(p => action.startsWith(p.replace('.', '')));
    const colorClass = prefix ? colors[prefix] : 'bg-gray-100 text-gray-700';

    return (
      <Badge variant="outline" className={colorClass}>
        {action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
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
            <CardTitle className="text-lg">Admin Activity Log</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user">User Actions</SelectItem>
                <SelectItem value="template">Template Actions</SelectItem>
                <SelectItem value="contract">Contract Actions</SelectItem>
                <SelectItem value="settings">Settings Actions</SelectItem>
                <SelectItem value="subscription">Subscription Actions</SelectItem>
                <SelectItem value="export">Export Actions</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
                <SelectItem value="setting">Settings</SelectItem>
                <SelectItem value="export">Exports</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info Notice */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Activity logging requires database schema updates.
              Displaying sample data for demonstration.
            </p>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
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
                        No activity records found
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
                            <span className="text-sm">{activity.adminName || 'Admin'}</span>
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
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
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
                        <TableCell className="text-gray-500 text-sm">
                          {formatTimestamp(activity.createdAt)}
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
