import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Shield, ShieldOff, Loader2, Download, Mail } from 'lucide-react';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';

type SafeUser = Omit<User, 'password'>;

export default function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ['/api/admin/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/users/${userId}`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Role updated successfully' });
      setRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: 'Failed to update role', variant: 'destructive' });
    },
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !search ||
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleExport = () => {
    const csv = [
      ['ID', 'Email', 'Name', 'Role', 'Subscription', 'Email Verified', 'Created At'],
      ...filteredUsers.map(u => [
        u.id,
        u.email,
        u.name,
        u.role || 'user',
        u.subscriptionStatus || 'none',
        u.emailVerified ? 'Yes' : 'No',
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout pageTitle="User Management">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">All Users ({filteredUsers.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Email Verified</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#660033] rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {user.avatarInitials || user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? (
                              <><Shield className="h-3 w-3 mr-1" /> Admin</>
                            ) : (
                              'User'
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.subscriptionStatus === 'active' ? 'default' : 'outline'}
                            className={user.subscriptionStatus === 'active' ? 'bg-green-600' : ''}
                          >
                            {user.subscriptionStatus || 'none'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.emailVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <Mail className="h-3 w-3 mr-1" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setRoleDialogOpen(true);
                            }}
                          >
                            {user.role === 'admin' ? (
                              <ShieldOff className="h-4 w-4 mr-1" />
                            ) : (
                              <Shield className="h-4 w-4 mr-1" />
                            )}
                            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </Button>
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

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              {selectedUser?.role === 'admin'
                ? `Remove admin privileges from ${selectedUser?.name}?`
                : `Grant admin privileges to ${selectedUser?.name}?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  updateRoleMutation.mutate({
                    userId: selectedUser.id,
                    role: selectedUser.role === 'admin' ? 'user' : 'admin',
                  });
                }
              }}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
