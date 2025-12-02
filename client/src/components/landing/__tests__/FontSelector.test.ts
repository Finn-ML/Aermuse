import { describe, it, expect } from "vitest";
import { SUPPORTED_FONTS } from "@shared/themes";

describe("FontSelector", () => {
  describe("SUPPORTED_FONTS constant", () => {
    it("should have 8 font options", () => {
      expect(SUPPORTED_FONTS).toHaveLength(8);
    });

    it("should have required properties for each font", () => {
      SUPPORTED_FONTS.forEach((font) => {
        expect(font).toHaveProperty("name");
        expect(font).toHaveProperty("category");
        expect(font).toHaveProperty("weights");
        expect(typeof font.name).toBe("string");
        expect(typeof font.category).toBe("string");
        expect(typeof font.weights).toBe("string");
      });
    });

    it("should include Inter as default font", () => {
      const inter = SUPPORTED_FONTS.find((f) => f.name === "Inter");
      expect(inter).toBeDefined();
      expect(inter?.category).toBe("sans-serif");
    });

    it("should include both serif and sans-serif fonts", () => {
      const categories = new Set(SUPPORTED_FONTS.map((f) => f.category));
      expect(categories.has("serif")).toBe(true);
      expect(categories.has("sans-serif")).toBe(true);
    });

    it("should have valid font weight strings", () => {
      SUPPORTED_FONTS.forEach((font) => {
        // Weights should be semicolon-separated numbers
        const weights = font.weights.split(";");
        weights.forEach((w) => {
          expect(parseInt(w)).not.toBeNaN();
          expect(parseInt(w)).toBeGreaterThanOrEqual(100);
          expect(parseInt(w)).toBeLessThanOrEqual(900);
        });
      });
    });

    it("should include expected fonts from tech spec", () => {
      const fontNames = SUPPORTED_FONTS.map((f) => f.name);
      expect(fontNames).toContain("Inter");
      expect(fontNames).toContain("Montserrat");
      expect(fontNames).toContain("Poppins");
      expect(fontNames).toContain("Roboto");
      expect(fontNames).toContain("Playfair Display");
      expect(fontNames).toContain("Lora");
      expect(fontNames).toContain("Space Grotesk");
      expect(fontNames).toContain("DM Sans");
    });
  });
});
