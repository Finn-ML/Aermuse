import { db } from "../db";
import { isrcSequences } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// Placeholder codes until official PPL UK registration
const COUNTRY_CODE = "GB";
const REGISTRANT_CODE = "AER";

// ISRC format: CC-XXX-YY-NNNNN
const ISRC_REGEX = /^[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}$/;

/**
 * Generate the next ISRC code using a transactional year-scoped counter.
 * Format: GB-AER-YY-NNNNN
 */
export async function generateIsrc(): Promise<string> {
  const year = new Date().getFullYear();
  const yearSuffix = String(year).slice(-2);

  // Use a transaction with row-level locking to prevent duplicates
  const designation = await db.transaction(async (tx) => {
    // Try to get existing row with FOR UPDATE lock
    const rows = await tx
      .select()
      .from(isrcSequences)
      .where(eq(isrcSequences.year, year))
      .for("update");

    if (rows.length > 0) {
      const next = rows[0].lastDesignation + 1;
      await tx
        .update(isrcSequences)
        .set({ lastDesignation: next, updatedAt: new Date() })
        .where(eq(isrcSequences.year, year));
      return next;
    } else {
      // First ISRC of the year — insert with designation 1
      await tx.insert(isrcSequences).values({
        year,
        lastDesignation: 1,
      });
      return 1;
    }
  });

  const paddedDesignation = String(designation).padStart(5, "0");
  return `${COUNTRY_CODE}-${REGISTRANT_CODE}-${yearSuffix}-${paddedDesignation}`;
}

/**
 * Validate an ISRC code format.
 * Accepts with or without hyphens, normalizes to hyphenated form.
 */
export function validateIsrc(isrc: string): {
  valid: boolean;
  normalized?: string;
  error?: string;
} {
  if (!isrc || typeof isrc !== "string") {
    return { valid: false, error: "ISRC code is required" };
  }

  const trimmed = isrc.trim().toUpperCase();

  if (!ISRC_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid ISRC format. Expected: CC-XXX-YY-NNNNN (e.g., GB-AER-26-00001)",
    };
  }

  // Normalize: remove existing hyphens and re-format
  const clean = trimmed.replace(/-/g, "");
  const normalized = `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}-${clean.slice(7)}`;

  return { valid: true, normalized };
}
