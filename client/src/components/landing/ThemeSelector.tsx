import { useQuery } from '@tanstack/react-query';
import { Check, Palette } from 'lucide-react';
import type { ThemePreset } from '@shared/themes';

interface ThemeSelectorProps {
  selectedThemeId?: string | null;
  onThemeSelect: (theme: ThemePreset) => void;
}

export function ThemeSelector({ selectedThemeId, onThemeSelect }: ThemeSelectorProps) {
  const { data: themes, isLoading, error } = useQuery<ThemePreset[]>({
    queryKey: ['/api/themes'],
    queryFn: async () => {
      const res = await fetch('/api/themes');
      if (!res.ok) throw new Error('Failed to fetch themes');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load themes. Please try again.
      </div>
    );
  }

  if (!themes || themes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Palette className="h-12 w-12 mx-auto mb-2 opacity-50" />
        No themes available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Palette className="h-4 w-4" />
        <span>Choose a theme to style your page</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const isSelected = selectedThemeId === theme.id;
          // Solid and gradient backgrounds render as-is; image/video presets
          // fall back to the primary color for the swatch
          const previewBackground =
            theme.backgroundType === 'solid' || theme.backgroundType === 'gradient'
              ? { background: theme.backgroundValue }
              : { background: theme.primaryColor };
          const buttonRadius =
            theme.buttonStyle === 'pill'
              ? 'rounded-full'
              : theme.buttonStyle === 'square'
                ? 'rounded-none'
                : 'rounded-md';

          return (
            <button
              key={theme.id}
              onClick={() => onThemeSelect(theme)}
              className={`
                relative text-left rounded-lg border-2 transition-all overflow-hidden
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isSelected
                  ? 'border-[#660033] ring-2 ring-[#660033]/20'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 z-10 bg-[#660033] text-white rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Miniature page preview in the theme's own colors */}
              <div
                className="px-3 pt-4 pb-3 flex flex-col items-center gap-2"
                style={previewBackground}
              >
                {/* Avatar dot with accent ring */}
                <div
                  className="w-8 h-8 rounded-full border-2"
                  style={{
                    borderColor: theme.accentColor,
                    backgroundColor: `${theme.accentColor}30`,
                    boxShadow: `0 0 10px ${theme.accentColor}50`,
                  }}
                />
                {/* Artist name in the heading font */}
                <span
                  className="text-sm font-bold leading-none"
                  style={{
                    color: theme.textColor,
                    fontFamily: `"${theme.headingFont}", system-ui, sans-serif`,
                  }}
                >
                  Artist Name
                </span>
                {/* Sample link button, styled like the real page */}
                <div
                  className={`w-full max-w-[9rem] px-3 py-1.5 text-[11px] font-semibold text-center ${buttonRadius} ${
                    theme.buttonStyle === 'outline' ? 'border-2' : ''
                  } ${theme.buttonStyle === 'shadow' ? 'shadow-md' : ''}`}
                  style={{
                    backgroundColor: theme.buttonStyle === 'outline' ? 'transparent' : theme.secondaryColor,
                    color: theme.buttonStyle === 'outline' ? theme.secondaryColor : theme.primaryColor,
                    borderColor: theme.buttonStyle === 'outline' ? theme.secondaryColor : 'transparent',
                    fontFamily: `"${theme.bodyFont}", system-ui, sans-serif`,
                  }}
                >
                  Listen Now
                </div>
              </div>

              {/* Theme details */}
              <div className="p-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {theme.name}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <span
                      className="w-3 h-3 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.secondaryColor }}
                      title="Buttons"
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-gray-200"
                      style={{ backgroundColor: theme.accentColor }}
                      title="Accent"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {theme.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {theme.headingFont} · {theme.bodyFont}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
