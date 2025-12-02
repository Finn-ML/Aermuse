import { describe, it, expect } from "vitest";
import { BUTTON_STYLES } from "../ButtonStylePicker";

describe("ButtonStylePicker", () => {
  describe("BUTTON_STYLES constant", () => {
    it("should have 6 button style options", () => {
      expect(BUTTON_STYLES).toHaveLength(6);
    });

    it("should have required properties for each style", () => {
      BUTTON_STYLES.forEach((style) => {
        expect(style).toHaveProperty("id");
        expect(style).toHaveProperty("name");
        expect(style).toHaveProperty("description");
        expect(typeof style.id).toBe("string");
        expect(typeof style.name).toBe("string");
        expect(typeof style.description).toBe("string");
      });
    });

    it("should include all expected style IDs", () => {
      const styleIds = BUTTON_STYLES.map((s) => s.id);
      expect(styleIds).toContain("rounded");
      expect(styleIds).toContain("pill");
      expect(styleIds).toContain("square");
      expect(styleIds).toContain("outline");
      expect(styleIds).toContain("filled");
      expect(styleIds).toContain("shadow");
    });

    it("should have rounded as the first/default option", () => {
      expect(BUTTON_STYLES[0].id).toBe("rounded");
    });

    it("should have unique IDs", () => {
      const ids = BUTTON_STYLES.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have non-empty descriptions", () => {
      BUTTON_STYLES.forEach((style) => {
        expect(style.description.length).toBeGreaterThan(5);
      });
    });
  });
});
