import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import type { MailingListSubscriber } from '@shared/schema';

interface SubscribersResponse {
  subscribers: MailingListSubscriber[];
  counts: {
    total: number;
    active: number;
    unsubscribed: number;
  };
}

export function SubscriberList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<SubscribersResponse>({
    queryKey: ['/api/mailing-list/subscribers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/mailing-list/subscribers');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/mailing-list/subscribers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mailing-list/subscribers'] });
      toast({ title: 'Subscriber removed', description: 'The subscriber has been removed from your list.' });
      setConfirmDeleteId(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to remove subscriber. Please try again.' });
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'unsubscribed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Unsubscribed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#660033]" />
      </div>
    );
  }

  const subscribers = data?.subscribers || [];
  const counts = data?.counts || { total: 0, active: 0, unsubscribed: 0 };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(102,0,51,0.05)]">
              <Users className="w-5 h-5 text-[#660033]" />
            </div>
            <div>
              <p className="text-sm text-[rgba(102,0,51,0.5)]">Total Subscribers</p>
              <p className="text-2xl font-semibold text-[rgba(102,0,51,0.9)]">{counts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[rgba(102,0,51,0.5)]">Active</p>
              <p className="text-2xl font-semibold text-[rgba(102,0,51,0.9)]">{counts.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50">
              <UserX className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-[rgba(102,0,51,0.5)]">Unsubscribed</p>
              <p className="text-2xl font-semibold text-[rgba(102,0,51,0.9)]">{counts.unsubscribed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribers Table */}
      {subscribers.length === 0 ? (
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] p-12 text-center">
          <Users className="w-10 h-10 text-[rgba(102,0,51,0.2)] mx-auto mb-3" />
          <p className="text-[rgba(102,0,51,0.6)] text-sm">No subscribers yet.</p>
          <p className="text-[rgba(102,0,51,0.4)] text-xs mt-1">
            Share your page to start building your mailing list.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[rgba(102,0,51,0.1)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(102,0,51,0.08)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    Subscribed
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-[rgba(102,0,51,0.5)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className="border-b border-[rgba(102,0,51,0.04)] hover:bg-[rgba(102,0,51,0.02)] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm text-[rgba(102,0,51,0.8)]">
                      {subscriber.email}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[rgba(102,0,51,0.6)]">
                      {subscriber.name || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      {getStatusBadge(subscriber.status)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[rgba(102,0,51,0.5)]">
                      {subscriber.subscribedAt
                        ? format(new Date(subscriber.subscribedAt), 'MMM d, yyyy')
                        : subscriber.createdAt
                          ? format(new Date(subscriber.createdAt), 'MMM d, yyyy')
                          : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {confirmDeleteId === subscriber.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => deleteMutation.mutate(subscriber.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs px-2.5 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? 'Removing...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(subscriber.id)}
                          className="p-1.5 rounded-md text-[rgba(102,0,51,0.3)] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Remove subscriber"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
