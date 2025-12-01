import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SystemSettings {
  'platform.name'?: string;
  'platform.maintenance_mode'?: boolean;
  'subscription.trial_days'?: number;
  'ai.daily_limit_free'?: number;
  'ai.daily_limit_premium'?: number;
  'signature.default_expiry_days'?: number;
  'email.notifications_enabled'?: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    'platform.name': 'Aermuse',
    'platform.maintenance_mode': false,
    'subscription.trial_days': 0,
    'ai.daily_limit_free': 0,
    'ai.daily_limit_premium': 100,
    'signature.default_expiry_days': 30,
    'email.notifications_enabled': true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { isLoading, error } = useQuery<SystemSettings>({
    queryKey: ['/api/admin/settings'],
    enabled: false, // Settings endpoint not implemented yet
  });

  const saveMutation = useMutation({
    mutationFn: async (newSettings: SystemSettings) => {
      // Settings endpoint not implemented yet
      // const res = await apiRequest('PUT', '/api/admin/settings', newSettings);
      // return res.json();
      return Promise.resolve(newSettings);
    },
    onSuccess: () => {
      toast({ title: 'Settings saved successfully' });
      setHasChanges(false);
    },
    onError: () => {
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    },
  });

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <AdminLayout pageTitle="System Settings">
      <div className="max-w-3xl space-y-6">
        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Settings</CardTitle>
            <CardDescription>General platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={settings['platform.name'] || ''}
                onChange={(e) => updateSetting('platform.name', e.target.value)}
                placeholder="Aermuse"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-500">
                  When enabled, only admins can access the platform
                </p>
              </div>
              <Switch
                checked={settings['platform.maintenance_mode'] || false}
                onCheckedChange={(checked) => updateSetting('platform.maintenance_mode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Subscription Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Settings</CardTitle>
            <CardDescription>Configure subscription and billing options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="trial-days">Trial Period (days)</Label>
              <Input
                id="trial-days"
                type="number"
                min="0"
                value={settings['subscription.trial_days'] || 0}
                onChange={(e) => updateSetting('subscription.trial_days', parseInt(e.target.value) || 0)}
              />
              <p className="text-sm text-gray-500">
                Number of days for free trial (0 = no trial)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Settings</CardTitle>
            <CardDescription>Configure AI usage limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-free">Free User Daily Limit</Label>
                <Input
                  id="ai-free"
                  type="number"
                  min="0"
                  value={settings['ai.daily_limit_free'] || 0}
                  onChange={(e) => updateSetting('ai.daily_limit_free', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-premium">Premium User Daily Limit</Label>
                <Input
                  id="ai-premium"
                  type="number"
                  min="0"
                  value={settings['ai.daily_limit_premium'] || 0}
                  onChange={(e) => updateSetting('ai.daily_limit_premium', parseInt(e.target.value) || 0)}
                />
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
                value={settings['signature.default_expiry_days'] || 30}
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
                checked={settings['email.notifications_enabled'] || false}
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

        {/* Info Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">Settings Storage</p>
                <p className="text-sm text-blue-700 mt-1">
                  System settings will be stored in the database once the settings API endpoint is implemented.
                  Currently, settings are stored in application memory only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
