import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

// Minimal track type needed for this component
interface TrackLike {
  id: string;
  title?: string;
}

// Minimal split type needed for this component
interface TrackSplitLike {
  id: string;
  trackId?: string;
  collaboratorName: string;
  collaboratorEmail: string;
  collaboratorRole?: string | null;
  splitPercentage: number;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  verificationDeadline?: Date | string | null;
  rejectionReason?: string | null;
}

interface SplitVerificationStatusProps {
  track: TrackLike;
  splits: TrackSplitLike[];
  ownerSplitPercentage: number;
  autoPublishAt?: Date | string | null;
  onEditSplits?: () => void;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: 'Pending',
  },
  verified: {
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    label: 'Verified',
  },
  rejected: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    label: 'Rejected',
  },
  expired: {
    icon: AlertTriangle,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    label: 'Expired',
  },
};

export function SplitVerificationStatus({
  track,
  splits,
  ownerSplitPercentage,
  autoPublishAt,
  onEditSplits,
}: SplitVerificationStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resendMutation = useMutation({
    mutationFn: async (splitId: string) => {
      const response = await fetch(
        `/api/tracks/${track.id}/splits/${splitId}/resend`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend verification');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Email sent',
        description: 'Verification email has been resent.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSplitMutation = useMutation({
    mutationFn: async (splitId: string) => {
      const response = await fetch(
        `/api/tracks/${track.id}/splits/${splitId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete split');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Split removed',
        description: 'The collaborator has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['track-splits', track.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pendingCount = splits.filter((s) => s.status === 'pending').length;
  const verifiedCount = splits.filter((s) => s.status === 'verified').length;
  const rejectedCount = splits.filter((s) => s.status === 'rejected').length;
  const expiredCount = splits.filter((s) => s.status === 'expired').length;

  const allVerifiedOrExpired = splits.every(
    (s) => s.status === 'verified' || s.status === 'expired'
  );

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  const getTimeRemaining = (deadline: Date | string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  if (splits.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">No Collaborators</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          You keep 100% of the royalties. Add collaborators to share splits.
        </p>
        {onEditSplits && (
          <Button variant="outline" size="sm" onClick={onEditSplits}>
            Add Collaborators
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-medium">Split Verification</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20">
              {pendingCount} pending
            </Badge>
          )}
          {verifiedCount > 0 && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20">
              {verifiedCount} verified
            </Badge>
          )}
          {rejectedCount > 0 && (
            <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20">
              {rejectedCount} rejected
            </Badge>
          )}
        </div>
      </div>

      {/* Auto-publish countdown */}
      {autoPublishAt && !allVerifiedOrExpired && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <Clock className="h-4 w-4 inline mr-1" />
            <strong>Auto-ready:</strong> {getTimeRemaining(autoPublishAt)}
            <span className="block text-xs mt-1 opacity-75">
              Track can be published once all splits are verified or deadline passes.
            </span>
          </p>
        </div>
      )}

      {/* Status message */}
      {allVerifiedOrExpired && (
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            <CheckCircle2 className="h-4 w-4 inline mr-1" />
            <strong>Ready to publish!</strong> All splits are verified or expired.
          </p>
        </div>
      )}

      {rejectedCount > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            <XCircle className="h-4 w-4 inline mr-1" />
            <strong>Action required:</strong> {rejectedCount} collaborator(s) rejected their
            split. Please update or remove them.
          </p>
        </div>
      )}

      {/* Owner's Split */}
      <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
        <div>
          <span className="font-medium">You (uploader)</span>
          <span className="text-sm text-muted-foreground ml-2">Owner</span>
        </div>
        <span className="font-bold text-lg">{ownerSplitPercentage}%</span>
      </div>

      {/* Collaborator Splits */}
      <div className="space-y-2">
        {splits.map((split) => {
          const config = STATUS_CONFIG[split.status as keyof typeof STATUS_CONFIG];
          const StatusIcon = config.icon;

          return (
            <div
              key={split.id}
              className="p-3 border rounded-lg flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {split.collaboratorName}
                  </span>
                  <Badge className={config.color} variant="secondary">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {split.collaboratorEmail}
                  {split.collaboratorRole && (
                    <span className="ml-2 opacity-75">
                      ({split.collaboratorRole})
                    </span>
                  )}
                </div>
                {split.status === 'pending' && split.verificationDeadline && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Deadline: {formatDate(split.verificationDeadline)}
                  </div>
                )}
                {split.status === 'rejected' && split.rejectionReason && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Reason: {split.rejectionReason}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 ml-4">
                <span className="font-bold text-lg">{split.splitPercentage}%</span>

                <TooltipProvider>
                  {split.status === 'pending' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resendMutation.mutate(split.id)}
                          disabled={resendMutation.isPending}
                        >
                          {resendMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Resend verification email</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSplitMutation.mutate(split.id)}
                        disabled={deleteSplitMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleteSplitMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove collaborator</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Button */}
      {onEditSplits && (
        <Button variant="outline" className="w-full" onClick={onEditSplits}>
          Edit Splits
        </Button>
      )}
    </div>
  );
}
