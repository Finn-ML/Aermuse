import { useState } from 'react';
import { SubscriberList } from './SubscriberList';
import { CampaignList } from './CampaignList';
import { CampaignComposer } from './CampaignComposer';
import { CampaignAnalytics } from './CampaignAnalytics';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { EmailCampaign } from '@shared/schema';

type View = 'subscribers' | 'campaigns' | 'composer' | 'analytics';

export function MailingListContent() {
  const [view, setView] = useState<View>('subscribers');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Prefetch campaigns data to know status when a campaign is selected
  const { data: campaigns } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/mailing-list/campaigns'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/mailing-list/campaigns');
      return res.json();
    },
  });

  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    const campaign = campaigns?.find((c) => c.id === id);
    if (campaign?.status === 'sent') {
      setView('analytics');
    } else {
      setView('composer');
    }
  };

  const handleNewCampaign = () => {
    setSelectedCampaignId(null);
    setView('composer');
  };

  const handleBackToCampaigns = () => {
    setSelectedCampaignId(null);
    setView('campaigns');
  };

  // Show tabs only when on subscribers or campaigns list view
  const showTabs = view === 'subscribers' || view === 'campaigns';
  const activeTab = view === 'subscribers' ? 'subscribers' : 'campaigns';

  return (
    <div>
      {showTabs && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('subscribers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'subscribers'
                ? 'bg-[#660033] text-white'
                : 'bg-[rgba(102,0,51,0.05)] text-[rgba(102,0,51,0.7)] hover:bg-[rgba(102,0,51,0.1)]'
            }`}
          >
            Subscribers
          </button>
          <button
            onClick={() => setView('campaigns')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'campaigns'
                ? 'bg-[#660033] text-white'
                : 'bg-[rgba(102,0,51,0.05)] text-[rgba(102,0,51,0.7)] hover:bg-[rgba(102,0,51,0.1)]'
            }`}
          >
            Campaigns
          </button>
        </div>
      )}

      {view === 'subscribers' && <SubscriberList />}

      {view === 'campaigns' && (
        <CampaignList
          onSelectCampaign={handleSelectCampaign}
          onNewCampaign={handleNewCampaign}
        />
      )}

      {view === 'composer' && (
        <CampaignComposer
          campaignId={selectedCampaignId ?? undefined}
          onBack={handleBackToCampaigns}
        />
      )}

      {view === 'analytics' && selectedCampaignId && (
        <CampaignAnalytics
          campaignId={selectedCampaignId}
          onBack={handleBackToCampaigns}
        />
      )}
    </div>
  );
}
