import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Users, Zap, TrendingUp } from 'lucide-react';
import type { User, Contract, ContractTemplate } from '@shared/schema';

type SafeUser = Omit<User, 'password'>;

export default function AdminAnalytics() {
  const { data: users = [], isLoading: usersLoading } = useQuery<SafeUser[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ['/api/admin/contracts'],
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery<{ templates: ContractTemplate[] }>({
    queryKey: ['/api/admin/templates'],
  });

  const templates = templatesData?.templates || [];
  const isLoading = usersLoading || contractsLoading || templatesLoading;

  // Calculate analytics
  const totalAnalyzed = contracts.filter(c => c.aiAnalysis).length;
  const analysisRate = contracts.length > 0 ? Math.round((totalAnalyzed / contracts.length) * 100) : 0;

  // Contracts by type
  const contractsByType = contracts.reduce((acc, contract) => {
    acc[contract.type] = (acc[contract.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Template usage
  const templateUsage = contracts.reduce((acc, contract) => {
    if (contract.templateId) {
      acc[contract.templateId] = (acc[contract.templateId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Risk score distribution
  const riskDistribution = contracts.reduce((acc, contract) => {
    const risk = contract.aiRiskScore || 'not_analyzed';
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // User activity by month (simplified)
  const usersThisMonth = users.filter(u => {
    if (!u.createdAt) return false;
    const date = new Date(u.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const contractsThisMonth = contracts.filter(c => {
    if (!c.createdAt) return false;
    const date = new Date(c.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <AdminLayout pageTitle="Platform Analytics">
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                    <p className="text-xs text-green-600 mt-1">+{usersThisMonth} this month</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Contracts</p>
                    <p className="text-2xl font-bold">{contracts.length}</p>
                    <p className="text-xs text-green-600 mt-1">+{contractsThisMonth} this month</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">AI Analyses</p>
                    <p className="text-2xl font-bold">{totalAnalyzed}</p>
                    <p className="text-xs text-gray-500 mt-1">{analysisRate}% of contracts</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Templates</p>
                    <p className="text-2xl font-bold">{templates.filter(t => t.isActive).length}</p>
                    <p className="text-xs text-gray-500 mt-1">of {templates.length} total</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Contracts by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contracts by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(contractsByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#660033] rounded-full"
                              style={{ width: `${(count / contracts.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  {Object.keys(contractsByType).length === 0 && (
                    <p className="text-sm text-gray-500">No contracts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Risk Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['low', 'medium', 'high', 'not_analyzed'].map(risk => {
                    const count = riskDistribution[risk] || 0;
                    const colors: Record<string, string> = {
                      low: 'bg-green-500',
                      medium: 'bg-yellow-500',
                      high: 'bg-red-500',
                      not_analyzed: 'bg-gray-300',
                    };
                    return (
                      <div key={risk} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{risk.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[risk]} rounded-full`}
                              style={{ width: contracts.length > 0 ? `${(count / contracts.length) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Template Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => {
                  const usage = templateUsage[template.id] || 0;
                  return (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{template.name}</p>
                        <span className="text-2xl font-bold text-[#660033]">{usage}</span>
                      </div>
                      <p className="text-xs text-gray-500">contracts created</p>
                    </div>
                  );
                })}
                {templates.length === 0 && (
                  <p className="text-sm text-gray-500 col-span-full">No templates available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
