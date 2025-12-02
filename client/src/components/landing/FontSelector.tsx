import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_FONTS } from "@shared/themes";

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
}

export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectedFont = SUPPORTED_FONTS.find(f => f.name === value) || SUPPORTED_FONTS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
        {label}
      </label>

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl bg-white border-2 border-[rgba(102,0,51,0.1)] hover:border-[#660033] focus:border-[#660033] outline-none text-left flex items-center justify-between transition-colors"
        data-testid={`font-selector-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span
          style={{ fontFamily: `"${selectedFont.name}", ${selectedFont.category}` }}
          className="text-sm"
        >
          {selectedFont.name}
        </span>
        <ChevronDown
          size={16}
          className={`text-[rgba(102,0,51,0.5)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-[rgba(102,0,51,0.1)] max-h-64 overflow-y-auto">
          {SUPPORTED_FONTS.map((font) => (
            <button
              key={font.name}
              type="button"
              onClick={() => {
                onChange(font.name);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-[rgba(102,0,51,0.05)] transition-colors first:rounded-t-xl last:rounded-b-xl ${
                font.name === value ? 'bg-[rgba(102,0,51,0.1)]' : ''
              }`}
              data-testid={`font-option-${font.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span
                style={{ fontFamily: `"${font.name}", ${font.category}` }}
                className="text-sm block"
              >
                {font.name}
              </span>
              <span className="text-xs text-[rgba(102,0,51,0.4)] mt-0.5 block">
                The quick brown fox jumps over the lazy dog
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
