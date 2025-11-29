/**
 * Contract Templates Index
 * Epic 3: Contract Templates System
 *
 * Exports all template definitions for seeding and use.
 */

export { artistAgreementTemplate, artistAgreementSampleData, type TemplateDefinition } from './artist-agreement';
export { licenseAgreementTemplate } from './license-agreement';
export { tourAgreementTemplate } from './tour-agreement';
export { sampleAgreementTemplate } from './sample-agreement';
export { workForHireAgreementTemplate } from './work-for-hire-agreement';

import { artistAgreementTemplate } from './artist-agreement';
import { licenseAgreementTemplate } from './license-agreement';
import { tourAgreementTemplate } from './tour-agreement';
import { sampleAgreementTemplate } from './sample-agreement';
import { workForHireAgreementTemplate } from './work-for-hire-agreement';
import type { TemplateDefinition } from './artist-agreement';

/**
 * All available templates for seeding
 */
export const allTemplates: TemplateDefinition[] = [
  artistAgreementTemplate,
  licenseAgreementTemplate,
  tourAgreementTemplate,
  sampleAgreementTemplate,
  workForHireAgreementTemplate,
];
