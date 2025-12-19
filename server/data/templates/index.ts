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

// New Aermuse Templates
export { splitSheetTemplate } from './split-sheet';
export { artistBrandNdaTemplate } from './artist-brand-nda';
export { artistProducerNdaTemplate } from './artist-producer-nda';
export { artistArtistNdaTemplate } from './artist-artist-nda';
export { contentServicesNdaTemplate } from './content-services-nda';
export { campaignUsageLicenseTemplate } from './campaign-usage-license';
export { listeningPartyAgreementTemplate } from './listening-party-agreement';
export { producerBeatLicensingTemplate } from './producer-beat-licensing';
export { collaborationSplitsTemplate } from './collaboration-splits';
export { featureAgreementTemplate } from './feature-agreement';
export { livePerformanceAgreementTemplate } from './live-performance-agreement';

import { artistAgreementTemplate } from './artist-agreement';
import { licenseAgreementTemplate } from './license-agreement';
import { tourAgreementTemplate } from './tour-agreement';
import { sampleAgreementTemplate } from './sample-agreement';
import { workForHireAgreementTemplate } from './work-for-hire-agreement';

// New Aermuse Templates
import { splitSheetTemplate } from './split-sheet';
import { artistBrandNdaTemplate } from './artist-brand-nda';
import { artistProducerNdaTemplate } from './artist-producer-nda';
import { artistArtistNdaTemplate } from './artist-artist-nda';
import { contentServicesNdaTemplate } from './content-services-nda';
import { campaignUsageLicenseTemplate } from './campaign-usage-license';
import { listeningPartyAgreementTemplate } from './listening-party-agreement';
import { producerBeatLicensingTemplate } from './producer-beat-licensing';
import { collaborationSplitsTemplate } from './collaboration-splits';
import { featureAgreementTemplate } from './feature-agreement';
import { livePerformanceAgreementTemplate } from './live-performance-agreement';

import type { TemplateDefinition } from './artist-agreement';

/**
 * All available templates for seeding
 */
export const allTemplates: TemplateDefinition[] = [
  // Original templates
  artistAgreementTemplate,
  licenseAgreementTemplate,
  tourAgreementTemplate,
  sampleAgreementTemplate,
  workForHireAgreementTemplate,

  // New Aermuse Templates
  splitSheetTemplate,
  artistBrandNdaTemplate,
  artistProducerNdaTemplate,
  artistArtistNdaTemplate,
  contentServicesNdaTemplate,
  campaignUsageLicenseTemplate,
  listeningPartyAgreementTemplate,
  producerBeatLicensingTemplate,
  collaborationSplitsTemplate,
  featureAgreementTemplate,
  livePerformanceAgreementTemplate,
];
