import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';

export type SortField = 'updatedAt' | 'createdAt' | 'name' | 'status' | 'type';
export type SortOrder = 'asc' | 'desc';

interface SortOption {
  field: SortField;
  label: string;
  defaultOrder: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'updatedAt', label: 'Last Updated', defaultOrder: 'desc' },
  { field: 'createdAt', label: 'Date Created', defaultOrder: 'desc' },
  { field: 'name', label: 'Name', defaultOrder: 'asc' },
  { field: 'status', label: 'Status', defaultOrder: 'asc' },
  { field: 'type', label: 'Type', defaultOrder: 'asc' },
];

interface ContractSortDropdownProps {
  sortField: SortField;
  sortOrder: SortOrder;
  onChange: (field: SortField, order: SortOrder) => void;
}

/**
 * Dropdown for sorting contracts.
 * AC-1 through AC-8: All sort criteria and features
 */
export function ContractSortDropdown({ sortField, sortOrder, onChange }: ContractSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = SORT_OPTIONS.find((opt) => opt.field === sortField);
  const SortIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown;

  const handleSelect = (option: SortOption) => {
    if (option.field === sortField) {
      // Toggle order if same field (AC-6)
      onChange(option.field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Use default order for new field
      onChange(option.field, option.defaultOrder);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] hover:border-[#660033] transition-all"
        data-testid="sort-dropdown-trigger"
      >
        <ArrowUpDown className="h-4 w-4 text-[#660033]" />
        <span className="text-sm font-medium text-[#660033]">
          {currentOption?.label || 'Sort'}
        </span>
        <SortIcon className="h-3 w-3 text-[rgba(102,0,51,0.5)]" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[rgba(102,0,51,0.1)] py-2 z-20"
          data-testid="sort-dropdown-menu"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.field === sortField;
            return (
              <button
                key={option.field}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  isSelected
                    ? 'text-[#660033] font-medium bg-[rgba(102,0,51,0.05)]'
                    : 'text-[rgba(102,0,51,0.8)] hover:bg-[rgba(102,0,51,0.05)]'
                }`}
                data-testid={`sort-option-${option.field}`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <SortIcon className="h-3 w-3" />
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
