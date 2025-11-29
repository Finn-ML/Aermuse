/**
 * Contract Templates Index
 * Epic 3: Contract Templates System
 *
 * Exports all template definitions for seeding and use.
 */

export { artistAgreementTemplate, artistAgreementSampleData, type TemplateDefinition } from './artist-agreement';

// Future templates will be exported here:
// export { licenseAgreementTemplate } from './license-agreement';
// export { tourAgreementTemplate } from './tour-agreement';
// export { sampleAgreementTemplate } from './sample-agreement';
// export { workForHireAgreementTemplate } from './work-for-hire-agreement';

import { artistAgreementTemplate } from './artist-agreement';
import type { TemplateDefinition } from './artist-agreement';

/**
 * All available templates for seeding
 */
export const allTemplates: TemplateDefinition[] = [
  artistAgreementTemplate,
];
