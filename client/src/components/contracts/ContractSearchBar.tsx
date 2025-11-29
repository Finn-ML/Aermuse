import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface ContractSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Search bar component for contracts with debounced input.
 * AC-1: Search input on contracts page
 * AC-5: Real-time search results (debounced 300ms)
 * AC-8: Clear search button
 */
export function ContractSearchBar({
  value,
  onChange,
  placeholder = 'Search contracts...'
}: ContractSearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced onChange - waits 300ms after user stops typing
  const debouncedOnChange = useCallback((newValue: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  }, [onChange]);

  // Update debounced value when input changes
  useEffect(() => {
    debouncedOnChange(inputValue);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputValue, debouncedOnChange]);

  // Sync external value changes (e.g., clear from parent)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleClear = () => {
    setInputValue('');
    onChange(''); // Immediate clear, no debounce
  };

  return (
    <div className="relative">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[rgba(102,0,51,0.4)]"
      />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-12 py-3 rounded-xl bg-[rgba(255,255,255,0.6)] border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] focus:outline-none text-[#660033] placeholder-[rgba(102,0,51,0.4)] font-medium transition-all"
        data-testid="contract-search-input"
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[rgba(102,0,51,0.1)] rounded-lg transition-colors"
          aria-label="Clear search"
          data-testid="contract-search-clear"
        >
          <X className="h-4 w-4 text-[rgba(102,0,51,0.5)]" />
        </button>
      )}
    </div>
  );
}
