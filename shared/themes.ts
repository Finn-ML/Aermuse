// Theme Presets for Landing Page Customization (Epic 9)

export type ButtonStyle = 'rounded' | 'pill' | 'square' | 'outline' | 'filled' | 'shadow';
export type BackgroundType = 'solid' | 'gradient' | 'image';
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

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark-stage',
    name: 'Dark Stage',
    description: 'Bold and dramatic for performers',
    primaryColor: '#1a1a2e',
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
    primaryColor: '#4a5043',
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
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Simple and elegant',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#666666',
    textColor: '#000000',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    buttonStyle: 'square',
    backgroundType: 'solid',
    backgroundValue: '#ffffff',
    backgroundOverlay: 'none',
  },
  {
    id: 'aermuse-classic',
    name: 'Aermuse Classic',
    description: 'The signature Aermuse look',
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
  { name: 'Inter', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Montserrat', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Poppins', category: 'sans-serif', weights: '400;600;700' },
  { name: 'Roboto', category: 'sans-serif', weights: '400;500;700' },
  { name: 'Playfair Display', category: 'serif', weights: '400;600;700' },
  { name: 'Lora', category: 'serif', weights: '400;600;700' },
  { name: 'Space Grotesk', category: 'sans-serif', weights: '400;500;700' },
  { name: 'DM Sans', category: 'sans-serif', weights: '400;500;700' },
];

// Helper to get theme by ID
export function getThemeById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find(theme => theme.id === id);
}
