import { useState } from 'react';
import { Filter, X, ChevronDown, Calendar } from 'lucide-react';

export interface FilterState {
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

interface ContractFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'sync', label: 'Sync' },
  { value: 'management', label: 'Management' },
  { value: 'production', label: 'Production' },
  { value: 'other', label: 'Other' },
];

/**
 * Collapsible filter panel for contracts.
 * AC-1: Filter by status
 * AC-2: Filter by type
 * AC-3: Filter by date range
 * AC-5: Clear all filters button
 * AC-7: Filter count indicator
 */
export function ContractFilters({ filters, onChange }: ContractFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = [
    filters.status,
    filters.type,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const handleClearAll = () => {
    onChange({ status: '', type: '', dateFrom: '', dateTo: '' });
  };

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{ background: 'rgba(255, 255, 255, 0.6)', border: '2px solid rgba(102, 0, 51, 0.1)' }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[rgba(102,0,51,0.03)] transition-colors"
        data-testid="filter-toggle"
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-[rgba(102,0,51,0.5)]" />
          <span className="font-semibold text-[#660033]">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span
              className="bg-[#660033] text-[#F7E6CA] text-xs px-2.5 py-1 rounded-full font-bold"
              data-testid="filter-count"
            >
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-[rgba(102,0,51,0.5)] transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Filter Panel */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-[rgba(102,0,51,0.1)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] focus:outline-none text-[#660033] font-medium transition-colors"
                data-testid="filter-status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] focus:outline-none text-[#660033] font-medium transition-colors"
                data-testid="filter-type"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                Created From
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(102,0,51,0.4)]" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleChange('dateFrom', e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] focus:outline-none text-[#660033] font-medium transition-colors"
                  data-testid="filter-date-from"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-semibold text-[rgba(102,0,51,0.7)] mb-2">
                Created To
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(102,0,51,0.4)]" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleChange('dateTo', e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] focus:outline-none text-[#660033] font-medium transition-colors"
                  data-testid="filter-date-to"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-5 pt-5 border-t border-[rgba(102,0,51,0.1)] flex justify-end">
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 text-sm font-semibold text-[rgba(102,0,51,0.6)] hover:text-[#660033] transition-colors"
                data-testid="clear-all-filters"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { STATUS_OPTIONS, TYPE_OPTIONS };
