import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Download, Music, Clock, CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

interface Purchase {
  id: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  coverArtPath?: string | null;
  amountPaidCents: number;
  currency: string;
  downloadToken: string;
  downloadCount: number;
  maxDownloads: number;
  downloadExpiresAt: string | null;
  status: string;
  createdAt: string;
  canDownload: boolean;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
}

export default function MyPurchases() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  // Get token from URL if present (for email link access)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenParam = urlParams.get('token');

  const { data: purchases, isLoading, error } = useQuery<Purchase[]>({
    queryKey: ['my-purchases', user?.email, tokenParam],
    queryFn: async () => {
      let url = '/api/purchases';
      if (tokenParam) {
        url += `?token=${encodeURIComponent(tokenParam)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your purchases');
        }
        throw new Error('Failed to load purchases');
      }
      return response.json();
    },
    enabled: !!user || !!tokenParam,
  });

  const handleDownload = (downloadToken: string) => {
    window.location.href = `/api/downloads/${downloadToken}`;
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#660033]" />
      </div>
    );
  }

  // Not authenticated and no token
  if (!user && !tokenParam) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 text-[#660033]" />
          <h1 className="text-2xl font-bold text-[#660033] mb-4">
            View Your Purchases
          </h1>
          <p className="text-gray-600 mb-6">
            Sign in to view your purchase history and download your tracks.
          </p>
          <Button
            onClick={() => setLocation('/auth')}
            className="w-full"
            style={{ backgroundColor: '#660033' }}
          >
            Sign In
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Check your email for download links if you purchased as a guest.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-[#660033] mb-4">
            Oops!
          </h1>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button
            onClick={() => setLocation('/')}
            variant="outline"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // No purchases
  if (!purchases || purchases.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7E6CA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-[#660033] opacity-50" />
          <h1 className="text-2xl font-bold text-[#660033] mb-4">
            No Purchases Yet
          </h1>
          <p className="text-gray-600 mb-6">
            You haven't purchased any tracks yet. Explore artist pages to discover amazing music!
          </p>
          <Button
            onClick={() => setLocation('/')}
            style={{ backgroundColor: '#660033' }}
          >
            Explore Music
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7E6CA]">
      {/* Header */}
      <header className="bg-[#660033] text-[#F7E6CA] py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">My Purchases</h1>
          <p className="opacity-80 text-sm">
            {purchases.length} {purchases.length === 1 ? 'track' : 'tracks'} purchased
          </p>
        </div>
      </header>

      {/* Purchases List */}
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {purchases.map((purchase) => (
          <div
            key={purchase.id}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              {/* Cover Art */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#660033]/10 flex-shrink-0">
                {purchase.coverArtPath ? (
                  <img
                    src={`/api/tracks/${purchase.trackId}/cover/${encodeURIComponent(purchase.coverArtPath)}`}
                    alt={purchase.trackTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-[#660033]/50" />
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#660033] truncate">
                  {purchase.trackTitle}
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {purchase.artistName}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{formatPrice(purchase.amountPaidCents, purchase.currency)}</span>
                  <span>•</span>
                  <span>{formatDate(purchase.createdAt)}</span>
                </div>
              </div>

              {/* Download Section */}
              <div className="flex-shrink-0 text-right">
                {purchase.canDownload ? (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleDownload(purchase.downloadToken)}
                      size="sm"
                      className="gap-2"
                      style={{ backgroundColor: '#660033' }}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <p className="text-xs text-gray-500">
                      {purchase.downloadCount}/{purchase.maxDownloads} downloads used
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {purchase.status !== 'completed' ? (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Pending</span>
                      </div>
                    ) : purchase.downloadCount >= purchase.maxDownloads ? (
                      <div className="flex items-center gap-1 text-red-500">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">Limit reached</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Expired</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expiry Info */}
            {purchase.downloadExpiresAt && purchase.canDownload && (
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires: {formatDate(purchase.downloadExpiresAt)}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Consumer Rights Notice */}
        <div className="bg-white/50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed">
          <p className="font-medium mb-2">Consumer Rights Notice</p>
          <p>
            By completing your purchase, you acknowledged waiving your 14-day cancellation right
            for immediate access to digital content under the Consumer Contracts Regulations 2013.
            This does not affect your statutory rights if the product is faulty.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-sm text-[#660033]/60">
          Powered by <a href="/" className="hover:underline">AERMUSE</a>
          <span className="mx-2">•</span>
          <a href="/privacy" className="hover:underline">Privacy</a>
        </p>
      </footer>
    </div>
  );
}
