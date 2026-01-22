import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { DollarSign, Music, Play, TrendingUp, Disc3, Loader2 } from 'lucide-react';

interface MusicSalesData {
  totalRevenue: number;
  totalSales: number;
  totalPlays: number;
  revenueThisMonth: number;
  salesThisMonth: number;
  topTracks: Array<{
    id: string;
    title: string;
    sales: number;
    plays: number;
    coverArtPath: string | null;
  }>;
}

interface MusicSalesMetricsProps {
  className?: string;
}

// Format currency from cents to display string
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(cents / 100);
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function MusicSalesMetrics({ className }: MusicSalesMetricsProps) {
  const { data, isLoading, error } = useQuery<MusicSalesData>({
    queryKey: ['/api/analytics/music-sales'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/analytics/music-sales');
      if (!res.ok) throw new Error('Failed to fetch music sales metrics');
      return res.json();
    },
  });

  // Don't render if loading or error or no data
  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-[#660033]" />
          <h3 className="text-base sm:text-lg font-bold">Music Sales</h3>
        </div>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-[#660033]" size={24} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  // Don't show if user has no music sales activity
  const hasActivity = data.totalRevenue > 0 || data.totalPlays > 0 || data.totalSales > 0;
  if (!hasActivity && data.topTracks.length === 0) {
    return null;
  }

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(data.totalRevenue),
      subtext: data.revenueThisMonth > 0 ? `+${formatCurrency(data.revenueThisMonth)} this month` : 'No sales this month',
      icon: DollarSign,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Tracks Sold',
      value: formatNumber(data.totalSales),
      subtext: data.salesThisMonth > 0 ? `+${data.salesThisMonth} this month` : 'No sales this month',
      icon: Disc3,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Total Plays',
      value: formatNumber(data.totalPlays),
      subtext: 'All time',
      icon: Play,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className={`rounded-[20px] p-5 sm:p-7 mb-6 sm:mb-8 ${className || ''}`} style={{ background: 'rgba(255, 255, 255, 0.6)' }}>
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Music className="w-5 h-5 text-[#660033]" />
        <h3 className="text-base sm:text-lg font-bold">Music Sales</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: 'rgba(255, 255, 255, 0.8)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[rgba(102,0,51,0.5)]">
                {stat.label}
              </span>
              <div className={`p-2 rounded-lg ${stat.iconBg} ${stat.iconColor}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#660033] mb-1">
              {stat.value}
            </div>
            <div className="text-[11px] sm:text-xs text-[rgba(102,0,51,0.6)] flex items-center gap-1">
              {stat.subtext.includes('+') && (
                <TrendingUp className="w-3 h-3 text-green-600" />
              )}
              {stat.subtext}
            </div>
          </div>
        ))}
      </div>

      {/* Top Tracks */}
      {data.topTracks.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[rgba(102,0,51,0.7)] mb-3">Top Selling Tracks</h4>
          <div className="space-y-2">
            {data.topTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/50"
                style={{ background: 'rgba(255, 255, 255, 0.4)' }}
              >
                <span className="text-sm font-bold text-[rgba(102,0,51,0.4)] w-5">
                  {index + 1}
                </span>
                {track.coverArtPath ? (
                  <img
                    src={`/api/tracks/${track.id}/cover/${encodeURIComponent(track.coverArtPath)}`}
                    alt={track.title}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[rgba(102,0,51,0.1)] flex items-center justify-center">
                    <Disc3 className="w-5 h-5 text-[rgba(102,0,51,0.4)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{track.title}</div>
                  <div className="text-[11px] text-[rgba(102,0,51,0.5)]">
                    {track.sales} {track.sales === 1 ? 'sale' : 'sales'} &bull; {formatNumber(track.plays)} plays
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MusicSalesMetrics;
