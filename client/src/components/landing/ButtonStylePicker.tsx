import type { ButtonStyle } from "@shared/themes";

interface ButtonStyleOption {
  id: ButtonStyle;
  name: string;
  description: string;
}

const BUTTON_STYLES: ButtonStyleOption[] = [
  { id: 'rounded', name: 'Rounded', description: 'Subtle rounded corners' },
  { id: 'pill', name: 'Pill', description: 'Fully rounded ends' },
  { id: 'square', name: 'Square', description: 'Sharp corners' },
  { id: 'outline', name: 'Outline', description: 'Transparent with border' },
  { id: 'filled', name: 'Filled', description: 'Solid background' },
  { id: 'shadow', name: 'Shadow', description: 'Elevated with shadow' },
];

interface ButtonStylePickerProps {
  value: ButtonStyle;
  onChange: (style: ButtonStyle) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

function getPreviewClasses(style: ButtonStyle): string {
  const base = 'w-full py-2 px-4 text-center text-sm font-semibold transition-all';

  switch (style) {
    case 'pill':
      return `${base} rounded-full`;
    case 'square':
      return `${base} rounded-none`;
    case 'outline':
      return `${base} rounded-lg bg-transparent border-2`;
    case 'shadow':
      return `${base} rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.25)]`;
    case 'filled':
    case 'rounded':
    default:
      return `${base} rounded-lg`;
  }
}

export function ButtonStylePicker({
  value,
  onChange,
  primaryColor = '#660033',
  secondaryColor = '#F7E6CA',
}: ButtonStylePickerProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[rgba(102,0,51,0.5)] mb-4">
        Button Style
      </label>

      <div className="grid grid-cols-3 gap-3">
        {BUTTON_STYLES.map((style) => {
          const isSelected = value === style.id;
          const isOutline = style.id === 'outline';

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-[#660033] bg-[rgba(102,0,51,0.05)]'
                  : 'border-[rgba(102,0,51,0.1)] hover:border-[rgba(102,0,51,0.3)]'
              }`}
              data-testid={`button-style-${style.id}`}
            >
              {/* Preview button */}
              <div
                className={getPreviewClasses(style.id)}
                style={{
                  backgroundColor: isOutline ? 'transparent' : primaryColor,
                  color: isOutline ? primaryColor : secondaryColor,
                  borderColor: isOutline ? primaryColor : 'transparent',
                }}
              >
                Link
              </div>

              {/* Label */}
              <p className="text-xs font-semibold mt-2 text-center">{style.name}</p>
              <p className="text-[10px] text-[rgba(102,0,51,0.5)] text-center">{style.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { BUTTON_STYLES };
