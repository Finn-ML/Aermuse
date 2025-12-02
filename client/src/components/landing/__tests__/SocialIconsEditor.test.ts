import { describe, it, expect } from "vitest";
import { SOCIAL_PLATFORMS } from "../SocialIconsEditor";

describe("SocialIconsEditor", () => {
  describe("SOCIAL_PLATFORMS constant", () => {
    it("should have 10 supported platforms", () => {
      expect(SOCIAL_PLATFORMS).toHaveLength(10);
    });

    it("should have required properties for each platform", () => {
      SOCIAL_PLATFORMS.forEach((platform) => {
        expect(platform).toHaveProperty("id");
        expect(platform).toHaveProperty("name");
        expect(platform).toHaveProperty("placeholder");
        expect(typeof platform.id).toBe("string");
        expect(typeof platform.name).toBe("string");
        expect(typeof platform.placeholder).toBe("string");
      });
    });

    it("should include all expected platform IDs", () => {
      const platformIds = SOCIAL_PLATFORMS.map((p) => p.id);
      expect(platformIds).toContain("spotify");
      expect(platformIds).toContain("apple-music");
      expect(platformIds).toContain("soundcloud");
      expect(platformIds).toContain("youtube");
      expect(platformIds).toContain("instagram");
      expect(platformIds).toContain("tiktok");
      expect(platformIds).toContain("twitter");
      expect(platformIds).toContain("facebook");
      expect(platformIds).toContain("bandcamp");
      expect(platformIds).toContain("website");
    });

    it("should have unique IDs", () => {
      const ids = SOCIAL_PLATFORMS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have placeholder URLs starting with https://", () => {
      SOCIAL_PLATFORMS.forEach((platform) => {
        expect(platform.placeholder.startsWith("https://")).toBe(true);
      });
    });

    it("should have music platforms first", () => {
      // First 4 should be music-related
      expect(SOCIAL_PLATFORMS[0].id).toBe("spotify");
      expect(SOCIAL_PLATFORMS[1].id).toBe("apple-music");
      expect(SOCIAL_PLATFORMS[2].id).toBe("soundcloud");
      expect(SOCIAL_PLATFORMS[3].id).toBe("youtube");
    });

    it("should have website as the last platform", () => {
      expect(SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1].id).toBe("website");
    });

    it("should have descriptive names for each platform", () => {
      const twitter = SOCIAL_PLATFORMS.find((p) => p.id === "twitter");
      expect(twitter?.name).toBe("X / Twitter");
    });
  });
});
