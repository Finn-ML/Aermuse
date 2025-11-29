import { X } from 'lucide-react';
import type { FilterState } from './ContractFilters';

interface ActiveFiltersProps {
  filters: FilterState;
  searchQuery: string;
  onChange: (filters: FilterState) => void;
  onSearchClear: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
  expired: 'Expired',
};

const TYPE_LABELS: Record<string, string> = {
  publishing: 'Publishing',
  licensing: 'Licensing',
  distribution: 'Distribution',
  sync: 'Sync',
  management: 'Management',
  production: 'Production',
  other: 'Other',
};

/**
 * Shows active filters as removable pills.
 * AC-4: Shows combined filters
 * AC-5: Individual filter removal
 */
export function ActiveFilters({ filters, searchQuery, onChange, onSearchClear }: ActiveFiltersProps) {
  const pills: { key: string; label: string; onRemove: () => void }[] = [];

  if (searchQuery) {
    pills.push({
      key: 'search',
      label: `Search: "${searchQuery}"`,
      onRemove: onSearchClear,
    });
  }

  if (filters.status) {
    pills.push({
      key: 'status',
      label: `Status: ${STATUS_LABELS[filters.status] || filters.status}`,
      onRemove: () => onChange({ ...filters, status: '' }),
    });
  }

  if (filters.type) {
    pills.push({
      key: 'type',
      label: `Type: ${TYPE_LABELS[filters.type] || filters.type}`,
      onRemove: () => onChange({ ...filters, type: '' }),
    });
  }

  if (filters.dateFrom) {
    pills.push({
      key: 'dateFrom',
      label: `From: ${filters.dateFrom}`,
      onRemove: () => onChange({ ...filters, dateFrom: '' }),
    });
  }

  if (filters.dateTo) {
    pills.push({
      key: 'dateTo',
      label: `To: ${filters.dateTo}`,
      onRemove: () => onChange({ ...filters, dateTo: '' }),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" data-testid="active-filters">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[rgba(102,0,51,0.1)] text-[#660033] text-sm font-medium rounded-full"
        >
          {pill.label}
          <button
            onClick={pill.onRemove}
            className="hover:bg-[rgba(102,0,51,0.15)] rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${pill.label} filter`}
            data-testid={`remove-filter-${pill.key}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
