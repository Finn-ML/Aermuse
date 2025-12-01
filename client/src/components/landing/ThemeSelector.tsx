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

          return (
            <button
              key={theme.id}
              onClick={() => onThemeSelect(theme)}
              className={`
                relative text-left p-4 rounded-lg border-2 transition-all
                hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isSelected
                  ? 'border-[#660033] ring-2 ring-[#660033]/20'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-[#660033] text-white rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Color swatches */}
              <div className="flex gap-1 mb-3">
                <div
                  className="w-6 h-6 rounded-full border border-gray-200"
                  style={{ backgroundColor: theme.primaryColor }}
                  title="Primary"
                />
                <div
                  className="w-6 h-6 rounded-full border border-gray-200"
                  style={{ backgroundColor: theme.secondaryColor }}
                  title="Secondary"
                />
                <div
                  className="w-6 h-6 rounded-full border border-gray-200"
                  style={{ backgroundColor: theme.accentColor }}
                  title="Accent"
                />
              </div>

              {/* Theme name and description */}
              <h3 className="font-semibold text-gray-900 text-sm">
                {theme.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {theme.description}
              </p>

              {/* Sample button preview */}
              <div
                className={`
                  mt-3 px-3 py-1.5 text-xs font-medium text-center
                  ${theme.buttonStyle === 'pill' ? 'rounded-full' : ''}
                  ${theme.buttonStyle === 'rounded' ? 'rounded-md' : ''}
                  ${theme.buttonStyle === 'square' ? 'rounded-none' : ''}
                  ${theme.buttonStyle === 'outline' ? 'bg-transparent border-2' : ''}
                  ${theme.buttonStyle === 'shadow' ? 'rounded-md shadow-md' : ''}
                  ${theme.buttonStyle === 'filled' ? 'rounded-md' : ''}
                `}
                style={{
                  backgroundColor: theme.buttonStyle === 'outline' ? 'transparent' : theme.secondaryColor,
                  color: theme.buttonStyle === 'outline' ? theme.secondaryColor : theme.primaryColor,
                  borderColor: theme.buttonStyle === 'outline' ? theme.secondaryColor : 'transparent',
                }}
              >
                Sample Button
              </div>

              {/* Font name */}
              <p className="text-xs text-gray-400 mt-2">
                {theme.headingFont}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
