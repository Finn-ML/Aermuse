/**
 * Color utility functions for WCAG contrast ratio calculations
 */

/**
 * Converts hex color to RGB array
 * Supports #RGB and #RRGGBB formats
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove # prefix
  let h = hex.replace(/^#/, "");

  // Expand 3-char hex to 6-char
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Calculates relative luminance per WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates contrast ratio between two colors per WCAG 2.1
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 *
 * Returns a value between 1 and 21.
 * WCAG AA requires at least 4.5:1 for normal text.
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Checks if contrast ratio meets WCAG AA standard (4.5:1)
 */
export function meetsContrastAA(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 4.5;
}
