/**
 * Template Seeding Script
 * Epic 3: Contract Templates System
 *
 * Seeds contract templates to the database.
 * Run with: npx tsx server/scripts/seed-templates.ts
 */

import { db } from "../db";
import { contractTemplates } from "../../shared/schema";
import { allTemplates } from "../data/templates";
import { eq } from "drizzle-orm";

export async function seedTemplates(): Promise<void> {
  console.log("[SEED] Starting template seeding...");
  console.log(`[SEED] Found ${allTemplates.length} templates to seed`);

  let created = 0;
  let skipped = 0;

  for (const template of allTemplates) {
    try {
      // Check if template already exists by name
      const existing = await db
        .select({ id: contractTemplates.id })
        .from(contractTemplates)
        .where(eq(contractTemplates.name, template.name))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[SEED] Skipping "${template.name}" - already exists`);
        skipped++;
        continue;
      }

      // Insert the template
      await db.insert(contractTemplates).values({
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
        fields: template.fields,
        optionalClauses: template.optionalClauses,
        isActive: template.isActive,
        sortOrder: template.sortOrder,
        version: template.version,
      });

      console.log(`[SEED] Created template: "${template.name}"`);
      created++;
    } catch (error) {
      console.error(`[SEED] Error seeding template "${template.name}":`, error);
      throw error;
    }
  }

  console.log(`[SEED] Template seeding complete: ${created} created, ${skipped} skipped`);
}

/**
 * Update existing templates to new version
 * Useful for updating template content without losing data
 */
export async function updateTemplates(): Promise<void> {
  console.log("[SEED] Updating existing templates...");

  for (const template of allTemplates) {
    try {
      const existing = await db
        .select()
        .from(contractTemplates)
        .where(eq(contractTemplates.name, template.name))
        .limit(1);

      if (existing.length === 0) {
        console.log(`[SEED] Template "${template.name}" not found, skipping update`);
        continue;
      }

      const current = existing[0];
      const currentVersion = current.version ?? 1;

      // Only update if version is higher
      if (template.version <= currentVersion) {
        console.log(`[SEED] Template "${template.name}" is up to date (v${currentVersion})`);
        continue;
      }

      await db
        .update(contractTemplates)
        .set({
          description: template.description,
          content: template.content,
          fields: template.fields,
          optionalClauses: template.optionalClauses,
          version: template.version,
          updatedAt: new Date(),
        })
        .where(eq(contractTemplates.id, current.id));

      console.log(`[SEED] Updated "${template.name}" from v${currentVersion} to v${template.version}`);
    } catch (error) {
      console.error(`[SEED] Error updating template "${template.name}":`, error);
      throw error;
    }
  }

  console.log("[SEED] Template update complete");
}

// Run seeding if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedTemplates()
    .then(() => {
      console.log("[SEED] Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[SEED] Failed:", error);
      process.exit(1);
    });
}
