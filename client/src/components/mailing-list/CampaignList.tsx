import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Plus, Mail, Send, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { EmailCampaign } from '@shared/schema';

interface CampaignListProps {
  onSelectCampaign: (id: string) => void;
  onNewCampaign: () => void;
}

type FilterTab = 'all' | 'draft' | 'scheduled' | 'sent';

export function CampaignList({ onSelectCampaign, onNewCampaign }: CampaignListProps) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data: campaigns, isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/mailing-list/campaigns'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/mailing-list/campaigns');
      return res.json();
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Scheduled
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Sending
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'draft':
        return <Mail className="w-4 h-4 text-gray-400" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'sending':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'sent':
        return <Send className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Mail className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredCampaigns = (campaigns || []).filter((campaign) => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'sent', label: 'Sent' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#660033]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[rgba(102,0,51,0.03)] rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-[#660033] shadow-sm'
                  : 'text-[rgba(102,0,51,0.5)] hover:text-[rgba(102,0,51,0.7)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onNewCampaign}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#660033] text-white text-sm font-medium hover:bg-[#7a1a4a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-12 text-center">
          <Mail className="w-10 h-10 text-[rgba(102,0,51,0.2)] mx-auto mb-3" />
          <p className="text-[rgba(102,0,51,0.6)] text-sm">
            {filter === 'all' ? 'No campaigns yet.' : `No ${filter} campaigns.`}
          </p>
          {filter === 'all' && (
            <p className="text-[rgba(102,0,51,0.4)] text-xs mt-1">
              Create your first email campaign to engage your subscribers.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign.id)}
              className="w-full text-left bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-4 hover:border-[rgba(102,0,51,0.2)] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-[rgba(102,0,51,0.04)] group-hover:bg-[rgba(102,0,51,0.08)] transition-colors">
                    {getStatusIcon(campaign.status)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[rgba(102,0,51,0.9)] truncate">
                      {campaign.subject}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      {getStatusBadge(campaign.status)}
                      {campaign.recipientCount != null && campaign.status === 'sent' && (
                        <span className="text-xs text-[rgba(102,0,51,0.4)]">
                          {campaign.recipientCount} recipients
                        </span>
                      )}
                      {campaign.sentAt && (
                        <span className="text-xs text-[rgba(102,0,51,0.4)]">
                          Sent {format(new Date(campaign.sentAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                      {campaign.scheduledFor && campaign.status === 'scheduled' && (
                        <span className="text-xs text-blue-500">
                          Scheduled for {format(new Date(campaign.scheduledFor), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                      {campaign.status === 'draft' && campaign.updatedAt && (
                        <span className="text-xs text-[rgba(102,0,51,0.4)]">
                          Updated {format(new Date(campaign.updatedAt), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
