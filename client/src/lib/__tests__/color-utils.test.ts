import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  meetsContrastAA,
} from "../color-utils";

describe("color-utils", () => {
  describe("hexToRgb", () => {
    it("should convert 6-char hex to RGB", () => {
      expect(hexToRgb("#FFFFFF")).toEqual([255, 255, 255]);
      expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
      expect(hexToRgb("#FF0000")).toEqual([255, 0, 0]);
      expect(hexToRgb("#00FF00")).toEqual([0, 255, 0]);
      expect(hexToRgb("#0000FF")).toEqual([0, 0, 255]);
    });

    it("should convert 3-char hex to RGB", () => {
      expect(hexToRgb("#FFF")).toEqual([255, 255, 255]);
      expect(hexToRgb("#000")).toEqual([0, 0, 0]);
      expect(hexToRgb("#F00")).toEqual([255, 0, 0]);
    });

    it("should handle lowercase hex", () => {
      expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
      expect(hexToRgb("#abc")).toEqual([170, 187, 204]);
    });
  });

  describe("getLuminance", () => {
    it("should return 1 for white", () => {
      expect(getLuminance("#FFFFFF")).toBeCloseTo(1, 4);
    });

    it("should return 0 for black", () => {
      expect(getLuminance("#000000")).toBeCloseTo(0, 4);
    });

    it("should return intermediate values for colors", () => {
      // Gray should be around 0.2159
      const grayLum = getLuminance("#808080");
      expect(grayLum).toBeGreaterThan(0.1);
      expect(grayLum).toBeLessThan(0.3);
    });
  });

  describe("getContrastRatio", () => {
    it("should return 21 for black on white", () => {
      const ratio = getContrastRatio("#FFFFFF", "#000000");
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("should return 1 for same colors", () => {
      const ratio = getContrastRatio("#FF0000", "#FF0000");
      expect(ratio).toBeCloseTo(1, 4);
    });

    it("should be symmetric (order doesn't matter)", () => {
      const ratio1 = getContrastRatio("#FFFFFF", "#660033");
      const ratio2 = getContrastRatio("#660033", "#FFFFFF");
      expect(ratio1).toBeCloseTo(ratio2, 4);
    });

    it("should detect low contrast", () => {
      // Light gray on white - low contrast
      const ratio = getContrastRatio("#FFFFFF", "#CCCCCC");
      expect(ratio).toBeLessThan(4.5);
    });

    it("should detect high contrast", () => {
      // Dark text on light background
      const ratio = getContrastRatio("#FFFFFF", "#333333");
      expect(ratio).toBeGreaterThan(4.5);
    });
  });

  describe("meetsContrastAA", () => {
    it("should return true for black on white", () => {
      expect(meetsContrastAA("#FFFFFF", "#000000")).toBe(true);
    });

    it("should return false for low contrast colors", () => {
      expect(meetsContrastAA("#FFFFFF", "#CCCCCC")).toBe(false);
    });

    it("should return true for adequate contrast", () => {
      // Dark purple on cream - the app's default
      expect(meetsContrastAA("#660033", "#F7E6CA")).toBe(true);
    });
  });
});
