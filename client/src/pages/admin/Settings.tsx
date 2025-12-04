import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SystemSettings {
  'ai.daily_limit_free'?: number;
  'ai.daily_limit_premium'?: number;
  'signature.default_expiry_days'?: number;
  'email.notifications_enabled'?: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    'ai.daily_limit_free': 0,
    'ai.daily_limit_premium': 100,
    'signature.default_expiry_days': 30,
    'email.notifications_enabled': true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current settings from API
  const { data, isLoading, error } = useQuery<SystemSettings>({
    queryKey: ['/api/admin/settings'],
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (data) {
      setSettings(data);
      setHasChanges(false);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: SystemSettings) => {
      const res = await apiRequest('PUT', '/api/admin/settings', newSettings);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({ title: 'Settings saved successfully' });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save settings',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    },
  });

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="System Settings">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="System Settings">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">Failed to load settings</p>
                <p className="text-sm text-red-700 mt-1">
                  Please refresh the page or try again later.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="System Settings">
      <div className="max-w-3xl space-y-6">
        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Settings</CardTitle>
            <CardDescription>Configure daily AI analysis limits per user type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-free">Free User Daily Limit</Label>
                <Input
                  id="ai-free"
                  type="number"
                  min="0"
                  value={settings['ai.daily_limit_free'] ?? 0}
                  onChange={(e) => updateSetting('ai.daily_limit_free', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500">
                  Set to 0 to disable AI for free users
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-premium">Premium User Daily Limit</Label>
                <Input
                  id="ai-premium"
                  type="number"
                  min="0"
                  value={settings['ai.daily_limit_premium'] ?? 100}
                  onChange={(e) => updateSetting('ai.daily_limit_premium', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-gray-500">
                  Premium subscribers' daily analysis limit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* E-Signature Settings */}
        <Card>
          <CardHeader>
            <CardTitle>E-Signature Settings</CardTitle>
            <CardDescription>Configure signature request defaults</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="signature-expiry">Default Signature Expiry (days)</Label>
              <Input
                id="signature-expiry"
                type="number"
                min="1"
                value={settings['signature.default_expiry_days'] ?? 30}
                onChange={(e) => updateSetting('signature.default_expiry_days', parseInt(e.target.value) || 30)}
              />
              <p className="text-sm text-gray-500">
                Default number of days before signature requests expire
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
            <CardDescription>Configure email notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Send email notifications for important events
                </p>
              </div>
              <Switch
                checked={settings['email.notifications_enabled'] ?? true}
                onCheckedChange={(checked) => updateSetting('email.notifications_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>

        {/* Success indicator */}
        {!hasChanges && data && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">Settings synced</p>
                  <p className="text-sm text-green-700 mt-1">
                    All settings are saved and will take effect immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
