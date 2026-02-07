import { useQuery } from '@tanstack/react-query';
import { DollarSign, Package, Truck, CheckCircle } from 'lucide-react';

interface MerchAnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  pendingShipment: number;
  delivered: number;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(102,0,51,0.08)' }}>
          <Icon size={20} className="text-[#660033]" />
        </div>
        <span className="text-sm font-medium text-[rgba(102,0,51,0.6)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#660033]">{value}</div>
    </div>
  );
}

export default function MerchAnalytics() {
  const { data: analytics, isLoading } = useQuery<MerchAnalyticsData>({
    queryKey: ['/api/merch/analytics'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(102,0,51,0.05)]" />
              <div className="h-4 w-24 rounded bg-[rgba(102,0,51,0.05)]" />
            </div>
            <div className="h-8 w-16 rounded bg-[rgba(102,0,51,0.05)]" />
          </div>
        ))}
      </div>
    );
  }

  const revenue = analytics?.totalRevenue ?? 0;
  const orders = analytics?.totalOrders ?? 0;
  const pending = analytics?.pendingShipment ?? 0;
  const delivered = analytics?.delivered ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={DollarSign} label="Total Revenue" value={`\u00A3${(revenue / 100).toFixed(2)}`} />
      <StatCard icon={Package} label="Total Orders" value={orders.toString()} />
      <StatCard icon={Truck} label="Pending Shipment" value={pending.toString()} />
      <StatCard icon={CheckCircle} label="Delivered" value={delivered.toString()} />
    </div>
  );
}
