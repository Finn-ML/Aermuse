import { describe, it, expect } from "vitest";
import {
  THEME_PRESETS,
  getContrastRatio,
  getGradientStops,
  parseGradientCSS,
  SUPPORTED_FONTS,
} from "../themes";

/**
 * Guards the theme catalogue: every preset must stay legible (WCAG AA) with
 * the color roles the artist page assigns:
 * - textColor renders on the page background
 * - primaryColor is the button text on a secondaryColor button fill
 *   (outline buttons instead render secondaryColor text on the background)
 */
describe("THEME_PRESETS", () => {
  const AA = 4.5;

  it("has unique ids", () => {
    const ids = THEME_PRESETS.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const theme of THEME_PRESETS) {
    describe(theme.name, () => {
      const backgroundStops =
        theme.backgroundType === "gradient"
          ? getGradientStops(theme.backgroundValue)
          : theme.backgroundType === "solid"
            ? [theme.backgroundValue]
            : [];

      it("keeps page text readable on the background", () => {
        for (const stop of backgroundStops) {
          const ratio = getContrastRatio(theme.textColor, stop);
          expect(ratio, `${theme.textColor} on ${stop}`).toBeGreaterThanOrEqual(AA);
        }
      });

      it("keeps button labels readable", () => {
        if (theme.buttonStyle === "outline") {
          // Outline buttons: secondary text on the page background
          for (const stop of backgroundStops) {
            const ratio = getContrastRatio(theme.secondaryColor, stop);
            expect(ratio, `${theme.secondaryColor} on ${stop}`).toBeGreaterThanOrEqual(AA);
          }
        } else {
          // Filled buttons: primary text on a secondary fill
          const ratio = getContrastRatio(theme.primaryColor, theme.secondaryColor);
          expect(
            ratio,
            `${theme.primaryColor} on ${theme.secondaryColor}`
          ).toBeGreaterThanOrEqual(AA);
        }
      });

      it("uses fonts from the supported list", () => {
        const names = SUPPORTED_FONTS.map((font) => font.name);
        expect(names).toContain(theme.headingFont);
        expect(names).toContain(theme.bodyFont);
      });

      if (theme.backgroundType === "gradient") {
        it("uses a gradient the editor can parse back", () => {
          const parsed = parseGradientCSS(theme.backgroundValue);
          expect(parsed).not.toBeNull();
          expect(getGradientStops(theme.backgroundValue)).toHaveLength(2);
        });
      }
    });
  }
});
