import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Truck, CheckCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { MerchOrder } from '@shared/schema';

type StatusFilter = 'all' | 'paid' | 'shipped' | 'delivered';

const statusBadgeStyles: Record<string, string> = {
  pending: 'bg-[rgba(255,193,7,0.15)] text-[#B8860B]',
  paid: 'bg-[rgba(40,167,69,0.15)] text-[#28a745]',
  shipped: 'bg-[rgba(0,123,255,0.15)] text-[#007bff]',
  delivered: 'bg-[rgba(40,167,69,0.15)] text-[#28a745]',
  refunded: 'bg-[rgba(220,53,69,0.15)] text-[#dc3545]',
  cancelled: 'bg-[rgba(108,117,125,0.15)] text-[#6c757d]',
};

const statusIcons: Record<string, typeof Package> = {
  pending: Clock,
  paid: Package,
  shipped: Truck,
  delivered: CheckCircle,
};

interface OrderWithItems extends MerchOrder {
  items?: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export default function OrderList() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['/api/merch/orders'],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest('PATCH', `/api/merch/orders/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merch/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merch/analytics'] });
      toast({ title: 'Order updated' });
      setEditingOrder(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update order.', variant: 'destructive' });
    },
  });

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'paid', label: 'Paid' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
  ];

  const handleUpdateOrder = (orderId: string) => {
    const data: Record<string, unknown> = {};
    if (trackingNumber) data.trackingNumber = trackingNumber;
    if (trackingUrl) data.trackingUrl = trackingUrl;
    if (updateStatus) data.status = updateStatus;
    updateOrderMutation.mutate({ id: orderId, data });
  };

  const startEditing = (order: OrderWithItems) => {
    setEditingOrder(order.id);
    setTrackingNumber(order.trackingNumber || '');
    setTrackingUrl(order.trackingUrl || '');
    setUpdateStatus(order.status);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl p-5 animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-[rgba(102,0,51,0.05)]" />
                <div className="h-3 w-48 rounded bg-[rgba(102,0,51,0.05)]" />
              </div>
              <div className="h-6 w-16 rounded-full bg-[rgba(102,0,51,0.05)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-2">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === tab.id
                ? 'bg-[#660033] text-[#F7E6CA]'
                : 'bg-white/40 text-[rgba(102,0,51,0.6)] hover:bg-white/60 hover:text-[#660033]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}>
          <Package size={40} className="mx-auto mb-3 text-[rgba(102,0,51,0.3)]" />
          <p className="text-[rgba(102,0,51,0.6)] font-medium">No orders found</p>
          <p className="text-sm text-[rgba(102,0,51,0.4)] mt-1">Orders will appear here when customers make purchases.</p>
        </div>
      ) : (
        filteredOrders.map(order => {
          const StatusIcon = statusIcons[order.status] || Clock;
          const isExpanded = expandedOrder === order.id;
          const isEditing = editingOrder === order.id;
          const shipping = order.shippingAddress as Record<string, string> | null;

          return (
            <div
              key={order.id}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.4)', border: '1px solid rgba(102,0,51,0.08)' }}
            >
              {/* Order header */}
              <div
                className="p-5 cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon size={16} className="text-[#660033] flex-shrink-0" />
                      <span className="text-sm font-bold text-[#660033] truncate">
                        {order.customerName || order.customerEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[rgba(102,0,51,0.5)]">
                      <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : ''}</span>
                      <span>{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                      <span className="font-semibold text-[#660033]">
                        {'\u00A3'}{((order.total ?? 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadgeStyles[order.status] || statusBadgeStyles.pending}`}>
                      {order.status}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-[rgba(102,0,51,0.4)]" /> : <ChevronDown size={16} className="text-[rgba(102,0,51,0.4)]" />}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(102,0,51,0.08)' }}>
                  {/* Order items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Items</p>
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="text-[#660033] font-medium">{item.productName}</span>
                            {item.variantName && (
                              <span className="text-[rgba(102,0,51,0.5)] ml-1">({item.variantName})</span>
                            )}
                            <span className="text-[rgba(102,0,51,0.5)] ml-1">x{item.quantity}</span>
                          </div>
                          <span className="text-[#660033] font-medium">{'\u00A3'}{(item.total / 100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shipping address */}
                  {shipping && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide mb-1">Shipping Address</p>
                      <p className="text-sm text-[#660033]">
                        {[shipping.line1, shipping.line2, shipping.city, shipping.postal_code, shipping.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Tracking info display */}
                  {order.trackingNumber && !isEditing && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide mb-1">Tracking</p>
                      <p className="text-sm text-[#660033]">
                        {order.trackingNumber}
                        {order.trackingUrl && (
                          <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-[#007bff] underline">
                            Track
                          </a>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Update form */}
                  {isEditing ? (
                    <div className="mt-4 space-y-3 p-4 rounded-lg" style={{ backgroundColor: 'rgba(102,0,51,0.03)' }}>
                      <p className="text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide">Update Order</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-[rgba(102,0,51,0.6)] mb-1 block">Tracking Number</label>
                          <Input
                            value={trackingNumber}
                            onChange={e => setTrackingNumber(e.target.value)}
                            placeholder="e.g. RM123456789GB"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[rgba(102,0,51,0.6)] mb-1 block">Tracking URL</label>
                          <Input
                            value={trackingUrl}
                            onChange={e => setTrackingUrl(e.target.value)}
                            placeholder="https://..."
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-[rgba(102,0,51,0.6)] mb-1 block">Status</label>
                        <Select value={updateStatus} onValueChange={setUpdateStatus}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateOrder(order.id)}
                          disabled={updateOrderMutation.isPending}
                          className="px-4 py-2 bg-[#660033] text-[#F7E6CA] rounded-lg text-sm font-medium hover:bg-[#800040] transition-colors disabled:opacity-50"
                        >
                          {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditingOrder(null)}
                          className="px-4 py-2 bg-white/40 text-[rgba(102,0,51,0.6)] rounded-lg text-sm font-medium hover:bg-white/60 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); startEditing(order); }}
                      className="mt-4 flex items-center gap-1.5 text-xs font-medium text-[#660033] hover:text-[#800040] transition-colors"
                    >
                      <RefreshCw size={14} />
                      Update Order
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
