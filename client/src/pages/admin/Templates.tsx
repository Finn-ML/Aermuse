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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreVertical, Loader2, Eye, EyeOff, Copy, Pencil, FileEdit } from 'lucide-react';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ContractTemplate } from '@shared/schema';

export default function AdminTemplates() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);

  const { data, isLoading } = useQuery<{ templates: ContractTemplate[] }>({
    queryKey: ['/api/admin/templates'],
  });

  const templates = data?.templates || [];

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (isActive) {
        const res = await apiRequest('DELETE', `/api/admin/templates/${id}`);
        return res.json();
      } else {
        const res = await apiRequest('POST', `/api/admin/templates/${id}/activate`);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      toast({ title: 'Template status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update template', variant: 'destructive' });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/admin/templates/${id}/clone`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/templates'] });
      toast({ title: 'Template cloned successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to clone template', variant: 'destructive' });
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    return !search ||
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description?.toLowerCase().includes(search.toLowerCase()) ||
      template.category.toLowerCase().includes(search.toLowerCase());
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      artist: 'bg-purple-100 text-purple-700',
      licensing: 'bg-blue-100 text-blue-700',
      touring: 'bg-green-100 text-green-700',
      production: 'bg-orange-100 text-orange-700',
      business: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout pageTitle="Template Management">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Contract Templates ({templates.length})</CardTitle>
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 max-w-md"
            />
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
                    <TableHead>Template</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No templates found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded">
                              <FileEdit className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">{template.name}</p>
                              {template.description && (
                                <p className="text-sm text-gray-500 line-clamp-1 max-w-xs">
                                  {template.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={template.isActive ? 'default' : 'secondary'}
                            className={template.isActive ? 'bg-green-600' : ''}
                          >
                            {template.isActive ? (
                              <><Eye className="h-3 w-3 mr-1" /> Active</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" /> Inactive</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          v{template.version || 1}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Template
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => cloneMutation.mutate(template.id)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Clone Template
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleActiveMutation.mutate({
                                  id: template.id,
                                  isActive: template.isActive ?? true,
                                })}
                              >
                                {template.isActive ? (
                                  <><EyeOff className="h-4 w-4 mr-2" /> Deactivate</>
                                ) : (
                                  <><Eye className="h-4 w-4 mr-2" /> Activate</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
