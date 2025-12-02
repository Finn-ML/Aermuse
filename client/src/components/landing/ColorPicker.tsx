import { useState, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/**
 * Validates hex color format (#RGB or #RRGGBB)
 */
function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
}

/**
 * Normalizes 3-char hex to 6-char hex
 */
function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync input with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let hex = e.target.value;

    // Auto-prepend # if missing
    if (hex && !hex.startsWith("#")) {
      hex = `#${hex}`;
    }

    setInputValue(hex);

    if (isValidHex(hex)) {
      onChange(normalizeHex(hex));
    }
  }

  function handleInputBlur() {
    // Revert to current value if invalid
    if (!isValidHex(inputValue)) {
      setInputValue(value);
    }
  }

  function handlePickerChange(color: string) {
    setInputValue(color);
    onChange(color);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-2">
        {label}
      </label>

      <div className="flex items-center gap-2">
        {/* Color swatch button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-lg border-2 border-[rgba(102,0,51,0.1)] hover:border-[#660033] transition-colors flex-shrink-0"
          style={{ backgroundColor: isValidHex(value) ? value : "#FFFFFF" }}
          aria-label={`Pick ${label} color`}
          data-testid={`color-swatch-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />

        {/* Hex input */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="#RRGGBB"
          className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-[rgba(102,0,51,0.1)] focus:border-[#660033] outline-none text-sm font-mono uppercase"
          data-testid={`color-input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>

      {/* Color picker popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 p-3 bg-white rounded-xl shadow-lg border border-[rgba(102,0,51,0.1)]">
          <HexColorPicker
            color={isValidHex(value) ? value : "#FFFFFF"}
            onChange={handlePickerChange}
          />
        </div>
      )}
    </div>
  );
}

export { isValidHex, normalizeHex };
