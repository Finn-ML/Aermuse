import { describe, it, expect } from "vitest";
import { BACKGROUND_TYPES, OVERLAY_OPTIONS } from "../BackgroundEditor";
import {
  GRADIENT_DIRECTIONS,
  generateGradientCSS,
  parseGradientCSS,
} from "@shared/themes";

describe("BackgroundEditor", () => {
  describe("BACKGROUND_TYPES constant", () => {
    it("should have 3 background type options", () => {
      expect(BACKGROUND_TYPES).toHaveLength(3);
    });

    it("should have required properties for each type", () => {
      BACKGROUND_TYPES.forEach((type) => {
        expect(type).toHaveProperty("id");
        expect(type).toHaveProperty("name");
        expect(type).toHaveProperty("description");
        expect(typeof type.id).toBe("string");
        expect(typeof type.name).toBe("string");
        expect(typeof type.description).toBe("string");
      });
    });

    it("should include all expected type IDs", () => {
      const typeIds = BACKGROUND_TYPES.map((t) => t.id);
      expect(typeIds).toContain("solid");
      expect(typeIds).toContain("gradient");
      expect(typeIds).toContain("image");
    });

    it("should have solid as the first/default option", () => {
      expect(BACKGROUND_TYPES[0].id).toBe("solid");
    });
  });

  describe("OVERLAY_OPTIONS constant", () => {
    it("should have 3 overlay options", () => {
      expect(OVERLAY_OPTIONS).toHaveLength(3);
    });

    it("should include all expected overlay IDs", () => {
      const overlayIds = OVERLAY_OPTIONS.map((o) => o.id);
      expect(overlayIds).toContain("none");
      expect(overlayIds).toContain("dark");
      expect(overlayIds).toContain("light");
    });

    it("should have none as the first/default option", () => {
      expect(OVERLAY_OPTIONS[0].id).toBe("none");
    });
  });
});

describe("Gradient utilities", () => {
  describe("GRADIENT_DIRECTIONS constant", () => {
    it("should have 4 gradient direction options", () => {
      expect(GRADIENT_DIRECTIONS).toHaveLength(4);
    });

    it("should have required properties for each direction", () => {
      GRADIENT_DIRECTIONS.forEach((dir) => {
        expect(dir).toHaveProperty("id");
        expect(dir).toHaveProperty("name");
        expect(dir).toHaveProperty("angle");
        expect(typeof dir.id).toBe("string");
        expect(typeof dir.name).toBe("string");
        expect(typeof dir.angle).toBe("string");
      });
    });

    it("should include all expected direction IDs", () => {
      const directionIds = GRADIENT_DIRECTIONS.map((d) => d.id);
      expect(directionIds).toContain("to-right");
      expect(directionIds).toContain("to-bottom");
      expect(directionIds).toContain("to-bottom-right");
      expect(directionIds).toContain("to-bottom-left");
    });
  });

  describe("generateGradientCSS", () => {
    it("should generate correct CSS for to-right direction", () => {
      const css = generateGradientCSS({
        color1: "#ff0000",
        color2: "#0000ff",
        direction: "to-right",
      });
      expect(css).toBe("linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
    });

    it("should generate correct CSS for to-bottom direction", () => {
      const css = generateGradientCSS({
        color1: "#660033",
        color2: "#8B0045",
        direction: "to-bottom",
      });
      expect(css).toBe("linear-gradient(180deg, #660033 0%, #8B0045 100%)");
    });

    it("should generate correct CSS for to-bottom-right direction", () => {
      const css = generateGradientCSS({
        color1: "#000000",
        color2: "#ffffff",
        direction: "to-bottom-right",
      });
      expect(css).toBe("linear-gradient(135deg, #000000 0%, #ffffff 100%)");
    });

    it("should generate correct CSS for to-bottom-left direction", () => {
      const css = generateGradientCSS({
        color1: "#123456",
        color2: "#abcdef",
        direction: "to-bottom-left",
      });
      expect(css).toBe("linear-gradient(225deg, #123456 0%, #abcdef 100%)");
    });
  });

  describe("parseGradientCSS", () => {
    it("should parse valid gradient CSS", () => {
      const result = parseGradientCSS(
        "linear-gradient(180deg, #660033 0%, #8B0045 100%)"
      );
      expect(result).not.toBeNull();
      expect(result?.color1).toBe("#660033");
      expect(result?.color2).toBe("#8B0045");
      expect(result?.direction).toBe("to-bottom");
    });

    it("should parse 90deg as to-right", () => {
      const result = parseGradientCSS(
        "linear-gradient(90deg, #ff0000 0%, #0000ff 100%)"
      );
      expect(result?.direction).toBe("to-right");
    });

    it("should parse 135deg as to-bottom-right", () => {
      const result = parseGradientCSS(
        "linear-gradient(135deg, #000000 0%, #ffffff 100%)"
      );
      expect(result?.direction).toBe("to-bottom-right");
    });

    it("should parse 225deg as to-bottom-left", () => {
      const result = parseGradientCSS(
        "linear-gradient(225deg, #123456 0%, #abcdef 100%)"
      );
      expect(result?.direction).toBe("to-bottom-left");
    });

    it("should return null for invalid CSS", () => {
      expect(parseGradientCSS("invalid")).toBeNull();
      expect(parseGradientCSS("background: red")).toBeNull();
      expect(parseGradientCSS("")).toBeNull();
    });

    it("should return null for malformed gradient", () => {
      expect(parseGradientCSS("linear-gradient(red, blue)")).toBeNull();
    });
  });
});
