// Theme Presets for Landing Page Customization (Epic 9)

export type ButtonStyle = 'rounded' | 'pill' | 'square' | 'outline' | 'filled' | 'shadow';
export type BackgroundType = 'solid' | 'gradient' | 'image' | 'video';
export type BackgroundOverlay = 'none' | 'dark' | 'light';
export type GradientDirection = 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-bottom-left';

export interface GradientConfig {
  color1: string;
  color2: string;
  direction: GradientDirection;
}

export const GRADIENT_DIRECTIONS: { id: GradientDirection; name: string; angle: string }[] = [
  { id: 'to-right', name: 'Left to Right', angle: '90deg' },
  { id: 'to-bottom', name: 'Top to Bottom', angle: '180deg' },
  { id: 'to-bottom-right', name: 'Diagonal Right', angle: '135deg' },
  { id: 'to-bottom-left', name: 'Diagonal Left', angle: '225deg' },
];

export function generateGradientCSS(config: GradientConfig): string {
  const direction = GRADIENT_DIRECTIONS.find(d => d.id === config.direction);
  const angle = direction?.angle || '180deg';
  return `linear-gradient(${angle}, ${config.color1} 0%, ${config.color2} 100%)`;
}

export function parseGradientCSS(css: string): GradientConfig | null {
  const match = css.match(/linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{6})\s*0%,\s*(#[0-9a-fA-F]{6})\s*100%\)/);
  if (!match) return null;

  const angle = match[1];
  const color1 = match[2];
  const color2 = match[3];

  const direction = GRADIENT_DIRECTIONS.find(d => d.angle === `${angle}deg`);

  return {
    color1,
    color2,
    direction: direction?.id || 'to-bottom',
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  buttonStyle: ButtonStyle;
  backgroundType: BackgroundType;
  backgroundValue: string;
  backgroundOverlay: BackgroundOverlay;
}

// Color roles on the public artist page:
// - primaryColor: button TEXT, modal panels, page fallback background
// - secondaryColor: button BACKGROUND, prices/accents, social icons
// - accentColor: avatar ring + glow, decorative dots
// - textColor: page copy
// Every preset keeps text-vs-background and button text-vs-fill at WCAG AA
// (4.5:1) — enforced by shared/__tests__/themes.test.ts.
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark-stage',
    name: 'Dark Stage',
    description: 'Bold and dramatic for performers',
    primaryColor: '#141425',
    secondaryColor: '#e94560',
    accentColor: '#ffd700',
    textColor: '#ffffff',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    buttonStyle: 'filled',
    backgroundType: 'solid',
    backgroundValue: '#0f0f1a',
    backgroundOverlay: 'none',
  },
  {
    id: 'midnight-luxe',
    name: 'Midnight Luxe',
    description: 'Champagne gold on deep ink',
    primaryColor: '#10131F',
    secondaryColor: '#E3C588',
    accentColor: '#C9A961',
    textColor: '#F2ECDF',
    headingFont: 'Fraunces',
    bodyFont: 'Manrope',
    buttonStyle: 'pill',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #0B0E1A 0%, #1C2340 100%)',
    backgroundOverlay: 'none',
  },
  {
    id: 'sunset-tour',
    name: 'Sunset Tour',
    description: 'Warm dusk gradient with peach glow',
    primaryColor: '#2A1038',
    secondaryColor: '#FFC599',
    accentColor: '#FF8E5A',
    textColor: '#FFF1E4',
    headingFont: 'Sora',
    bodyFont: 'Inter',
    buttonStyle: 'pill',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #241332 0%, #9C2F5F 100%)',
    backgroundOverlay: 'none',
  },
  {
    id: 'violet-haze',
    name: 'Violet Haze',
    description: 'Dreamy purple for late-night sounds',
    primaryColor: '#1B1030',
    secondaryColor: '#CDB6FA',
    accentColor: '#F0A8FC',
    textColor: '#F3EFFF',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    buttonStyle: 'rounded',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #140B26 0%, #45217A 100%)',
    backgroundOverlay: 'none',
  },
  {
    id: 'ocean-drive',
    name: 'Ocean Drive',
    description: 'Cool aqua depths, crisp and modern',
    primaryColor: '#04222E',
    secondaryColor: '#9BEBDC',
    accentColor: '#4FC3E8',
    textColor: '#E9FBFF',
    headingFont: 'Outfit',
    bodyFont: 'Figtree',
    buttonStyle: 'pill',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #041C29 0%, #0B5E70 100%)',
    backgroundOverlay: 'none',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Sunlit cream with espresso contrast',
    primaryColor: '#FFF6EC',
    secondaryColor: '#4A2E1E',
    accentColor: '#C77822',
    textColor: '#42291A',
    headingFont: 'Fraunces',
    bodyFont: 'Source Sans 3',
    buttonStyle: 'rounded',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(180deg, #FFF6E8 0%, #FFDDB0 100%)',
    backgroundOverlay: 'none',
  },
  {
    id: 'monochrome-noir',
    name: 'Monochrome Noir',
    description: 'Stark black and white editorial',
    primaryColor: '#0C0C0C',
    secondaryColor: '#F2F2F2',
    accentColor: '#8C8C8C',
    textColor: '#FAFAFA',
    headingFont: 'Space Grotesk',
    bodyFont: 'Inter',
    buttonStyle: 'square',
    backgroundType: 'solid',
    backgroundValue: '#0C0C0C',
    backgroundOverlay: 'none',
  },
  {
    id: 'clean-studio',
    name: 'Clean Studio',
    description: 'Minimal and professional',
    primaryColor: '#ffffff',
    secondaryColor: '#2d3436',
    accentColor: '#0984e3',
    textColor: '#2d3436',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    buttonStyle: 'outline',
    backgroundType: 'solid',
    backgroundValue: '#f8f9fa',
    backgroundOverlay: 'none',
  },
  {
    id: 'vintage-vinyl',
    name: 'Vintage Vinyl',
    description: 'Warm retro aesthetic',
    primaryColor: '#2c1810',
    secondaryColor: '#d4a574',
    accentColor: '#c9302c',
    textColor: '#f5e6d3',
    headingFont: 'Playfair Display',
    bodyFont: 'Lora',
    buttonStyle: 'rounded',
    backgroundType: 'solid',
    backgroundValue: '#3d2317',
    backgroundOverlay: 'none',
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    description: 'Electric and vibrant',
    primaryColor: '#0a0a0a',
    secondaryColor: '#ff006e',
    accentColor: '#00f5d4',
    textColor: '#ffffff',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    buttonStyle: 'pill',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
    backgroundOverlay: 'none',
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    description: 'Earthy and organic',
    primaryColor: '#333A2C',
    secondaryColor: '#c4a35a',
    accentColor: '#8b4513',
    textColor: '#f5f0e8',
    headingFont: 'Lora',
    bodyFont: 'Inter',
    buttonStyle: 'rounded',
    backgroundType: 'solid',
    backgroundValue: '#2d3128',
    backgroundOverlay: 'none',
  },
  {
    // primary/secondary swapped from the original: buttons were white on a
    // white page (invisible). Now dark buttons with white button text.
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Simple and elegant',
    primaryColor: '#ffffff',
    secondaryColor: '#111111',
    accentColor: '#7a7a7a',
    textColor: '#111111',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    buttonStyle: 'square',
    backgroundType: 'solid',
    backgroundValue: '#ffffff',
    backgroundOverlay: 'none',
  },
  {
    id: 'aermuse-classic',
    name: 'AERMUSE Classic',
    description: 'The signature AERMUSE look',
    primaryColor: '#660033',
    secondaryColor: '#F7E6CA',
    accentColor: '#8B0045',
    textColor: '#F7E6CA',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    buttonStyle: 'rounded',
    backgroundType: 'solid',
    backgroundValue: '#660033',
    backgroundOverlay: 'none',
  },
];

// Supported fonts for font selection (Story 9.3)
export const SUPPORTED_FONTS = [
  // Sans-serif - Modern & Clean
  { name: 'Inter', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Montserrat', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Poppins', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Roboto', category: 'sans-serif', weights: '400;500;700' },
  { name: 'Open Sans', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Lato', category: 'sans-serif', weights: '400;700;900' },
  { name: 'Nunito', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Raleway', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Work Sans', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Outfit', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Plus Jakarta Sans', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Manrope', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Space Grotesk', category: 'sans-serif', weights: '400;500;700' },
  { name: 'DM Sans', category: 'sans-serif', weights: '400;500;700' },
  { name: 'Quicksand', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Mulish', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Karla', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Source Sans 3', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Rubik', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Barlow', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Urbanist', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Figtree', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Albert Sans', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Sora', category: 'sans-serif', weights: '400;600;700' },

  // Serif - Classic & Elegant
  { name: 'Playfair Display', category: 'serif', weights: '400;600;700' },
  { name: 'Lora', category: 'serif', weights: '400;600;700' },
  { name: 'Merriweather', category: 'serif', weights: '400;700;900' },
  { name: 'Libre Baskerville', category: 'serif', weights: '400;700' },
  { name: 'Crimson Text', category: 'serif', weights: '400;600;700' },
  { name: 'EB Garamond', category: 'serif', weights: '400;600;700' },
  { name: 'Cormorant Garamond', category: 'serif', weights: '400;600;700' },
  { name: 'Bitter', category: 'serif', weights: '400;600;700' },
  { name: 'Arvo', category: 'serif', weights: '400;700' },
  { name: 'Spectral', category: 'serif', weights: '400;600;700' },
  { name: 'Source Serif 4', category: 'serif', weights: '400;600;700' },
  { name: 'Vollkorn', category: 'serif', weights: '400;600;700' },
  { name: 'Cardo', category: 'serif', weights: '400;700' },
  { name: 'DM Serif Display', category: 'serif', weights: '400' },
  { name: 'Fraunces', category: 'serif', weights: '400;600;700' },

  // Display - Headlines & Creative
  { name: 'Bebas Neue', category: 'display', weights: '400' },
  { name: 'Oswald', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Anton', category: 'sans-serif', weights: '400' },
  { name: 'Archivo Black', category: 'sans-serif', weights: '400' },
  { name: 'Righteous', category: 'display', weights: '400' },
  { name: 'Staatliches', category: 'display', weights: '400' },
  { name: 'Titan One', category: 'display', weights: '400' },
  { name: 'Alfa Slab One', category: 'display', weights: '400' },
  { name: 'Fredoka', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Comfortaa', category: 'display', weights: '400;600;700' },
  { name: 'Lexend', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Josefin Sans', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Concert One', category: 'display', weights: '400' },
  { name: 'Permanent Marker', category: 'handwriting', weights: '400' },
  { name: 'Bangers', category: 'display', weights: '400' },

  // Script & Handwriting
  { name: 'Dancing Script', category: 'cursive', weights: '400;600;700' },
  { name: 'Pacifico', category: 'cursive', weights: '400' },
  { name: 'Satisfy', category: 'cursive', weights: '400' },
  { name: 'Great Vibes', category: 'cursive', weights: '400' },
  { name: 'Lobster', category: 'display', weights: '400' },
  { name: 'Caveat', category: 'handwriting', weights: '400;600;700' },
  { name: 'Kalam', category: 'handwriting', weights: '400;700' },
  { name: 'Sacramento', category: 'cursive', weights: '400' },

  // Monospace - Technical
  { name: 'Fira Code', category: 'monospace', weights: '400;600;700' },
  { name: 'JetBrains Mono', category: 'monospace', weights: '400;600;700' },
  { name: 'Space Mono', category: 'monospace', weights: '400;700' },
  { name: 'IBM Plex Mono', category: 'monospace', weights: '400;600;700' },
];

// Helper to get theme by ID
export function getThemeById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(theme => theme.id === id);
}

// WCAG relative luminance / contrast helpers (used by preset tests and the
// editor's live contrast warning)
export function getRelativeLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)?.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }) || [0, 0, 0];
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Extract the hex color stops from a preset's gradient backgroundValue. */
export function getGradientStops(css: string): string[] {
  return css.match(/#[0-9a-fA-F]{6}/g) || [];
}
