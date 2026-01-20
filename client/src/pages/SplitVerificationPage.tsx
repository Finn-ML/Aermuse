import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Music,
  User,
  Percent,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

interface SplitVerificationData {
  id: string;
  trackTitle: string;
  artistName: string;
  collaboratorName: string;
  collaboratorEmail: string;
  collaboratorRole: string;
  splitPercentage: number;
  deadline: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  isExistingUser: boolean;
  hasStripeConnect: boolean;
}

export default function SplitVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const {
    data: splitData,
    isLoading,
    error,
    refetch,
  } = useQuery<SplitVerificationData>({
    queryKey: ['split-verification', token],
    queryFn: async () => {
      const response = await fetch(`/api/splits/verify/${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load verification');
      }
      return response.json();
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async (createAccount?: { name: string; password: string }) => {
      const response = await fetch(`/api/splits/verify/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ createAccount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept split');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Split Verified!',
        description: 'You will receive your royalties when the track is sold.',
      });
      refetch();

      if (data.needsStripeConnect) {
        toast({
          title: 'Set up payouts',
          description:
            'Connect your Stripe account to receive direct payouts.',
        });
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('requiresAuth')) {
        setShowCreateAccount(true);
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/splits/verify/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject split');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Split Declined',
        description: 'The artist has been notified.',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAccept = () => {
    if (showCreateAccount) {
      if (!accountName.trim() || !accountPassword.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter your name and password',
          variant: 'destructive',
        });
        return;
      }
      if (accountPassword.length < 8) {
        toast({
          title: 'Error',
          description: 'Password must be at least 8 characters',
          variant: 'destructive',
        });
        return;
      }
      acceptMutation.mutate({ name: accountName, password: accountPassword });
    } else {
      acceptMutation.mutate(undefined);
    }
  };

  const handleReject = () => {
    rejectMutation.mutate(rejectReason);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days, ${hours} hours`;
    return `${hours} hours`;
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7E6CA] to-[#FDF8F0]">
        <Loader2 className="h-8 w-8 animate-spin text-[#660033]" />
      </div>
    );
  }

  if (error || !splitData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7E6CA] to-[#FDF8F0] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-2" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              {(error as Error)?.message ||
                'This verification link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired =
    splitData.status === 'expired' ||
    new Date(splitData.deadline) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7E6CA] to-[#FDF8F0] p-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="inline-block bg-gradient-to-r from-[#660033] to-[#8B0045] text-[#F7E6CA] px-8 py-3 rounded-full text-2xl font-bold tracking-widest lowercase">
            aermuse
          </span>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <Music className="h-12 w-12 mx-auto text-[#660033] mb-2" />
            <CardTitle className="text-2xl">Collaboration Split</CardTitle>
            <CardDescription>
              You've been added as a collaborator
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Track Info */}
            <div className="bg-[#660033]/5 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Track</p>
              <p className="text-xl font-bold text-[#660033]">
                "{splitData.trackTitle}"
              </p>
              <p className="text-muted-foreground">by {splitData.artistName}</p>
            </div>

            {/* Split Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <User className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Your Role</p>
                <p className="font-semibold capitalize">
                  {splitData.collaboratorRole}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-center">
                <Percent className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-sm text-muted-foreground">Your Split</p>
                <p className="text-2xl font-bold text-green-600">
                  {splitData.splitPercentage}%
                </p>
              </div>
            </div>

            {/* Status-specific content */}
            {splitData.status === 'verified' && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-green-800 dark:text-green-200">
                  You've verified this split!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You'll receive {splitData.splitPercentage}% of royalties when
                  the track is sold.
                </p>
                {!splitData.hasStripeConnect && (
                  <Button
                    className="mt-4"
                    onClick={() => navigate('/dashboard?tab=settings')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Set Up Payouts
                  </Button>
                )}
              </div>
            )}

            {splitData.status === 'rejected' && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-center">
                <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
                <p className="font-semibold text-red-800 dark:text-red-200">
                  You declined this split
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  The artist has been notified.
                </p>
              </div>
            )}

            {splitData.status === 'expired' && (
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  Verification deadline passed
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Contact the artist if you'd like to be added to future releases.
                </p>
              </div>
            )}

            {splitData.status === 'pending' && !isExpired && (
              <>
                {/* Deadline Warning */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800 dark:text-amber-200">
                      Time Remaining
                    </span>
                  </div>
                  <p className="text-amber-700 dark:text-amber-300">
                    {getTimeRemaining(splitData.deadline)}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Deadline: {formatDate(splitData.deadline)}
                  </p>
                </div>

                {/* Create Account Form */}
                {showCreateAccount && !user && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Create a free account to accept this split and receive
                      royalties.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter your name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Create Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your email: {splitData.collaboratorEmail}
                    </p>
                  </div>
                )}

                {/* Reject Form */}
                {showRejectForm && (
                  <div className="space-y-4 p-4 border border-red-200 dark:border-red-900 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Please let the artist know why you're declining (optional).
                    </p>
                    <Textarea
                      placeholder="Reason for declining..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {!showRejectForm ? (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                    <Button
                      className="flex-1 bg-[#660033] hover:bg-[#4A0026]"
                      onClick={handleAccept}
                      disabled={acceptMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      {showCreateAccount ? 'Create Account & Accept' : 'Accept Split'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowRejectForm(false)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                      disabled={rejectMutation.isPending}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Confirm Decline
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Powered by{' '}
          <a href="/" className="text-[#660033] font-semibold hover:underline">
            Aermuse
          </a>
        </p>
      </div>
    </div>
  );
}
