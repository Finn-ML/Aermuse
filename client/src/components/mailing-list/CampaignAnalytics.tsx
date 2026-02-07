import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Loader2,
  Users,
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { EmailCampaign } from '@shared/schema';

interface CampaignAnalyticsProps {
  campaignId: string;
  onBack: () => void;
}

interface AnalyticsData {
  recipientCount: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  linkClicks: { url: string; clicks: number }[];
}

export function CampaignAnalytics({ campaignId, onBack }: CampaignAnalyticsProps) {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/mailing-list/campaigns', campaignId, 'analytics'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/mailing-list/campaigns/${campaignId}/analytics`);
      return res.json();
    },
  });

  const { data: campaign, isLoading: loadingCampaign } = useQuery<EmailCampaign>({
    queryKey: ['/api/mailing-list/campaigns', campaignId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/mailing-list/campaigns/${campaignId}`);
      return res.json();
    },
  });

  const isLoading = loadingAnalytics || loadingCampaign;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#660033]" />
      </div>
    );
  }

  const rate = (numerator: number, denominator: number) => {
    if (denominator === 0) return '0';
    return ((numerator / denominator) * 100).toFixed(1);
  };

  const stats = analytics || { recipientCount: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, linkClicks: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-[rgba(102,0,51,0.6)] hover:bg-[rgba(102,0,51,0.05)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-[rgba(102,0,51,0.9)]">Campaign Analytics</h2>
          {campaign && (
            <p className="text-sm text-[rgba(102,0,51,0.5)] mt-0.5">{campaign.subject}</p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-[#660033]" />}
          iconBg="bg-[rgba(102,0,51,0.05)]"
          label="Recipients"
          value={stats.recipientCount}
        />
        <StatCard
          icon={<Send className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Delivered"
          value={stats.delivered}
          subtext={stats.recipientCount > 0 ? `${rate(stats.delivered, stats.recipientCount)}%` : undefined}
        />
        <StatCard
          icon={<Eye className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-50"
          label="Opened"
          value={stats.opened}
          subtext={stats.delivered > 0 ? `${rate(stats.opened, stats.delivered)}% rate` : undefined}
        />
        <StatCard
          icon={<MousePointerClick className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50"
          label="Clicked"
          value={stats.clicked}
          subtext={stats.delivered > 0 ? `${rate(stats.clicked, stats.delivered)}% rate` : undefined}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          iconBg="bg-red-50"
          label="Bounced"
          value={stats.bounced}
          subtext={stats.recipientCount > 0 ? `${rate(stats.bounced, stats.recipientCount)}%` : undefined}
        />
      </div>

      {/* Link Clicks Breakdown */}
      {stats.linkClicks.length > 0 && (
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[rgba(102,0,51,0.08)]">
            <h3 className="text-sm font-medium text-[rgba(102,0,51,0.8)]">Link Click Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(102,0,51,0.06)]">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    URL
                  </th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.linkClicks.map((link, i) => (
                  <tr
                    key={i}
                    className="border-b border-[rgba(102,0,51,0.04)] hover:bg-[rgba(102,0,51,0.02)] transition-colors last:border-b-0"
                  >
                    <td className="px-5 py-3 text-sm text-[rgba(102,0,51,0.7)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-[rgba(102,0,51,0.3)]" />
                        <span className="truncate max-w-[400px]">{link.url}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-[rgba(102,0,51,0.8)] text-right">
                      {link.clicks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.linkClicks.length === 0 && (
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-8 text-center">
          <MousePointerClick className="w-8 h-8 text-[rgba(102,0,51,0.15)] mx-auto mb-2" />
          <p className="text-sm text-[rgba(102,0,51,0.5)]">No link clicks recorded yet.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-xs text-[rgba(102,0,51,0.5)]">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-semibold text-[rgba(102,0,51,0.9)]">{value}</p>
            {subtext && (
              <span className="text-xs text-[rgba(102,0,51,0.4)]">{subtext}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
