import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, Loader2, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Contract, User } from '@shared/schema';

interface ContractWithUser extends Contract {
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export default function AdminContracts() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: contracts = [], isLoading } = useQuery<ContractWithUser[]>({
    queryKey: ['/api/admin/contracts'],
  });

  // Filter contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !search ||
      contract.name.toLowerCase().includes(search.toLowerCase()) ||
      contract.partnerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = typeFilter === 'all' || contract.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique types for filter
  const types = Array.from(new Set(contracts.map(c => c.type)));

  const handleExport = () => {
    const csv = [
      ['ID', 'Name', 'Type', 'Status', 'Partner', 'Risk Score', 'Has Analysis', 'Created At'],
      ...filteredContracts.map(c => [
        c.id,
        c.name,
        c.type,
        c.status,
        c.partnerName || '',
        c.aiRiskScore || '',
        c.aiAnalysis ? 'Yes' : 'No',
        c.createdAt ? new Date(c.createdAt).toISOString() : '',
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; className?: string }> = {
      active: { variant: 'default', className: 'bg-green-600' },
      completed: { variant: 'default', className: 'bg-blue-600' },
      pending: { variant: 'secondary' },
      draft: { variant: 'outline' },
      analyzed: { variant: 'default', className: 'bg-purple-600' },
      uploaded: { variant: 'secondary' },
    };
    const config = variants[status] || { variant: 'outline' as const };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  const getRiskBadge = (risk?: string | null) => {
    if (!risk) return <span className="text-gray-400">-</span>;
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700',
    };
    return (
      <Badge variant="outline" className={colors[risk] || ''}>
        {risk === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
        {risk === 'low' && <CheckCircle className="h-3 w-3 mr-1" />}
        {risk}
      </Badge>
    );
  };

  return (
    <AdminLayout pageTitle="Contract Overview">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">All Contracts ({filteredContracts.length})</CardTitle>
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
                placeholder="Search by name or partner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="analyzed">Analyzed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
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
                    <TableHead>Contract</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No contracts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded">
                              <FileText className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">{contract.name}</p>
                              {contract.partnerName && (
                                <p className="text-sm text-gray-500">{contract.partnerName}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{contract.type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        <TableCell>{getRiskBadge(contract.aiRiskScore)}</TableCell>
                        <TableCell className="text-gray-500">
                          {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : '-'}
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
