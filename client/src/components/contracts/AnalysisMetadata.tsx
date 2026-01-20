import { Clock, RefreshCw } from 'lucide-react';

interface Props {
  analyzedAt: string;
  version: number;
  truncated?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'unknown';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates
  if (diffMs < 0) {
    return 'just now';
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AnalysisMetadata({
  analyzedAt,
  version,
  truncated,
}: Props) {
  const timeAgo = formatTimeAgo(analyzedAt);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
      <div className="flex items-center gap-1">
        <Clock className="h-4 w-4" />
        <span>Analyzed {timeAgo}</span>
      </div>

      <div className="flex items-center gap-1">
        <RefreshCw className="h-4 w-4" />
        <span>Version {version}</span>
      </div>

      {truncated && (
        <span className="text-amber-600 text-xs">(truncated)</span>
      )}
    </div>
  );
}
