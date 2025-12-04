import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_FONTS } from "@shared/themes";

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
}

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  'sans-serif': 'Sans Serif',
  'serif': 'Serif',
  'display': 'Display',
  'cursive': 'Script',
  'handwriting': 'Handwriting',
  'monospace': 'Monospace',
};

export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group fonts by category
  const fontsByCategory = useMemo(() => {
    const groups: Record<string, typeof SUPPORTED_FONTS> = {};
    SUPPORTED_FONTS.forEach(font => {
      const cat = font.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(font);
    });
    return groups;
  }, []);

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

      {/* Dropdown options grouped by category */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-[rgba(102,0,51,0.1)] max-h-72 overflow-y-auto">
          {Object.entries(fontsByCategory).map(([category, fonts], catIndex) => (
            <div key={category}>
              {/* Category header */}
              <div className="px-3 py-1.5 bg-[rgba(102,0,51,0.03)] text-xs font-semibold text-[rgba(102,0,51,0.5)] uppercase tracking-wide sticky top-0">
                {CATEGORY_LABELS[category] || category}
              </div>
              {/* Fonts in category */}
              {fonts.map((font, fontIndex) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => {
                    onChange(font.name);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-[rgba(102,0,51,0.05)] transition-colors ${
                    font.name === value ? 'bg-[rgba(102,0,51,0.1)]' : ''
                  } ${catIndex === Object.keys(fontsByCategory).length - 1 && fontIndex === fonts.length - 1 ? 'rounded-b-xl' : ''}`}
                  data-testid={`font-option-${font.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span
                    style={{ fontFamily: `"${font.name}", ${font.category}` }}
                    className="text-sm block"
                  >
                    {font.name}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
