import { describe, it, expect } from "vitest";
import { isValidHex, normalizeHex } from "../ColorPicker";

describe("ColorPicker utilities", () => {
  describe("isValidHex", () => {
    it("should accept valid 6-char hex", () => {
      expect(isValidHex("#FFFFFF")).toBe(true);
      expect(isValidHex("#000000")).toBe(true);
      expect(isValidHex("#abcdef")).toBe(true);
      expect(isValidHex("#123456")).toBe(true);
    });

    it("should accept valid 3-char hex", () => {
      expect(isValidHex("#FFF")).toBe(true);
      expect(isValidHex("#000")).toBe(true);
      expect(isValidHex("#abc")).toBe(true);
    });

    it("should reject invalid hex", () => {
      expect(isValidHex("FFFFFF")).toBe(false); // missing #
      expect(isValidHex("#GGGGGG")).toBe(false); // invalid chars
      expect(isValidHex("#12345")).toBe(false); // wrong length
      expect(isValidHex("#1234567")).toBe(false); // too long
      expect(isValidHex("")).toBe(false);
      expect(isValidHex("#")).toBe(false);
    });
  });

  describe("normalizeHex", () => {
    it("should expand 3-char hex to 6-char", () => {
      expect(normalizeHex("#FFF")).toBe("#FFFFFF");
      expect(normalizeHex("#000")).toBe("#000000");
      expect(normalizeHex("#abc")).toBe("#aabbcc");
    });

    it("should leave 6-char hex unchanged", () => {
      expect(normalizeHex("#FFFFFF")).toBe("#FFFFFF");
      expect(normalizeHex("#123456")).toBe("#123456");
    });
  });
});
