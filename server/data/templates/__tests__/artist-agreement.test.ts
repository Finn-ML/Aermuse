import { describe, it, expect } from 'vitest';
import {
  artistAgreementTemplate,
  artistAgreementSampleData
} from '../artist-agreement';
import {
  validateFormData,
  renderTemplateContent,
  extractVariables,
  generateHTML,
  generateText
} from '../../../services/templateRenderer';

describe('Artist Agreement Template', () => {
  describe('template structure', () => {
    it('has required metadata', () => {
      expect(artistAgreementTemplate.name).toBe('Artist Collaboration Agreement');
      expect(artistAgreementTemplate.category).toBe('artist');
      expect(artistAgreementTemplate.isActive).toBe(true);
      expect(artistAgreementTemplate.version).toBe(1);
    });

    it('has all required fields defined', () => {
      const fieldIds = artistAgreementTemplate.fields.map(f => f.id);

      // Party A fields
      expect(fieldIds).toContain('party_a_name');
      expect(fieldIds).toContain('party_a_address');
      expect(fieldIds).toContain('party_a_email');

      // Party B fields
      expect(fieldIds).toContain('party_b_name');
      expect(fieldIds).toContain('party_b_address');
      expect(fieldIds).toContain('party_b_email');

      // Project fields
      expect(fieldIds).toContain('project_title');
      expect(fieldIds).toContain('project_description');

      // Financial fields
      expect(fieldIds).toContain('party_a_split');
      expect(fieldIds).toContain('party_b_split');
      expect(fieldIds).toContain('advance_amount');

      // Date fields
      expect(fieldIds).toContain('effective_date');
      expect(fieldIds).toContain('delivery_date');

      // Rights fields
      expect(fieldIds).toContain('territory');
    });

    it('has proper field types', () => {
      const getField = (id: string) =>
        artistAgreementTemplate.fields.find(f => f.id === id);

      expect(getField('party_a_email')?.type).toBe('email');
      expect(getField('party_a_split')?.type).toBe('number');
      expect(getField('effective_date')?.type).toBe('date');
      expect(getField('territory')?.type).toBe('select');
      expect(getField('project_description')?.type).toBe('textarea');
    });

    it('has revenue split validation (0-100)', () => {
      const partyASplit = artistAgreementTemplate.fields.find(f => f.id === 'party_a_split');
      const partyBSplit = artistAgreementTemplate.fields.find(f => f.id === 'party_b_split');

      expect(partyASplit?.validation?.min).toBe(0);
      expect(partyASplit?.validation?.max).toBe(100);
      expect(partyBSplit?.validation?.min).toBe(0);
      expect(partyBSplit?.validation?.max).toBe(100);
    });

    it('has territory options', () => {
      const territory = artistAgreementTemplate.fields.find(f => f.id === 'territory');
      expect(territory?.options).toHaveLength(5);
      expect(territory?.options?.map(o => o.value)).toContain('worldwide');
      expect(territory?.options?.map(o => o.value)).toContain('uk');
    });
  });

  describe('optional clauses', () => {
    it('has three optional clauses', () => {
      expect(artistAgreementTemplate.optionalClauses).toHaveLength(3);
    });

    it('has exclusivity clause with period field', () => {
      const exclusivity = artistAgreementTemplate.optionalClauses.find(c => c.id === 'exclusivity');
      expect(exclusivity).toBeDefined();
      expect(exclusivity?.defaultEnabled).toBe(false);
      expect(exclusivity?.fields).toHaveLength(1);
      expect(exclusivity?.fields?.[0].id).toBe('exclusivity_period');
      expect(exclusivity?.fields?.[0].validation?.min).toBe(1);
      expect(exclusivity?.fields?.[0].validation?.max).toBe(24);
    });

    it('has credit requirements clause enabled by default', () => {
      const credits = artistAgreementTemplate.optionalClauses.find(c => c.id === 'credit_requirements');
      expect(credits).toBeDefined();
      expect(credits?.defaultEnabled).toBe(true);
      expect(credits?.fields).toHaveLength(2);
    });

    it('has termination clause with notice period', () => {
      const termination = artistAgreementTemplate.optionalClauses.find(c => c.id === 'termination');
      expect(termination).toBeDefined();
      expect(termination?.defaultEnabled).toBe(true);
      expect(termination?.fields?.[0].id).toBe('notice_period');
      expect(termination?.fields?.[0].validation?.min).toBe(7);
      expect(termination?.fields?.[0].validation?.max).toBe(90);
    });
  });

  describe('content sections', () => {
    it('has 9 sections', () => {
      expect(artistAgreementTemplate.content.sections).toHaveLength(9);
    });

    it('has correct section IDs', () => {
      const sectionIds = artistAgreementTemplate.content.sections.map(s => s.id);
      expect(sectionIds).toEqual([
        'parties',
        'project',
        'revenue',
        'rights',
        'exclusivity_section',
        'credits_section',
        'termination_section',
        'general',
        'signatures'
      ]);
    });

    it('marks optional sections correctly', () => {
      const optionalSections = artistAgreementTemplate.content.sections.filter(s => s.isOptional);
      expect(optionalSections).toHaveLength(3);
      expect(optionalSections.map(s => s.clauseId)).toEqual([
        'exclusivity',
        'credit_requirements',
        'termination'
      ]);
    });

    it('has all variables in content', () => {
      const variables = extractVariables(artistAgreementTemplate.content);
      expect(variables).toContain('party_a_name');
      expect(variables).toContain('party_b_name');
      expect(variables).toContain('project_title');
      expect(variables).toContain('effective_date');
      expect(variables).toContain('party_a_split');
      expect(variables).toContain('territory');
    });
  });

  describe('validation', () => {
    it('validates sample data successfully', () => {
      const result = validateFormData(artistAgreementTemplate, artistAgreementSampleData);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('requires party names', () => {
      const incompleteData = {
        fields: { ...artistAgreementSampleData.fields, party_a_name: '' },
        enabledClauses: []
      };
      const result = validateFormData(artistAgreementTemplate, incompleteData);
      expect(result.valid).toBe(false);
      expect(result.errors.party_a_name).toBeDefined();
    });

    it('validates revenue split range', () => {
      const invalidSplit = {
        fields: { ...artistAgreementSampleData.fields, party_a_split: 150 },
        enabledClauses: []
      };
      const result = validateFormData(artistAgreementTemplate, invalidSplit);
      expect(result.valid).toBe(false);
      expect(result.errors.party_a_split).toContain('at most 100');
    });

    it('requires credit fields when credit clause is enabled', () => {
      const missingCredits = {
        fields: {
          ...artistAgreementSampleData.fields,
          party_a_credit: undefined,
          party_b_credit: undefined
        },
        enabledClauses: ['credit_requirements']
      };
      const result = validateFormData(artistAgreementTemplate, missingCredits);
      expect(result.valid).toBe(false);
      expect(result.errors.party_a_credit).toBeDefined();
      expect(result.errors.party_b_credit).toBeDefined();
    });

    it('does not require credit fields when clause is disabled', () => {
      const noCredits = {
        fields: {
          party_a_name: 'Jane',
          party_a_address: '123 Main St',
          party_a_email: 'jane@example.com',
          party_b_name: 'John',
          party_b_address: '456 Oak Ave',
          party_b_email: 'john@example.com',
          project_title: 'Test',
          project_description: 'Test project',
          party_a_split: 50,
          party_b_split: 50,
          effective_date: new Date(),
          territory: 'worldwide'
        },
        enabledClauses: [] // Credit requirements not enabled
      };
      const result = validateFormData(artistAgreementTemplate, noCredits);
      expect(result.valid).toBe(true);
    });
  });

  describe('rendering', () => {
    it('renders template with sample data', () => {
      const result = renderTemplateContent(artistAgreementTemplate, artistAgreementSampleData);

      expect(result.title).toBe('ARTIST COLLABORATION AGREEMENT');
      // Should have 6 sections (3 optional excluded: exclusivity not in enabledClauses)
      // Actually let's check: enabledClauses: ['credit_requirements', 'termination']
      // So exclusivity_section is excluded, credits and termination are included
      // Total: 9 - 1 = 8... wait no, 9 sections, 3 optional
      // Parties, project, revenue, rights = 4 mandatory
      // exclusivity (optional, disabled), credits (optional, enabled), termination (optional, enabled)
      // general, signatures = 2 mandatory
      // Total: 4 + 2 + 2 = 8 sections
      expect(result.sections.length).toBe(8);
    });

    it('includes optional sections when clause is enabled', () => {
      const dataWithExclusivity = {
        ...artistAgreementSampleData,
        enabledClauses: ['exclusivity', 'credit_requirements', 'termination']
      };
      const result = renderTemplateContent(artistAgreementTemplate, dataWithExclusivity);
      expect(result.sections.length).toBe(9);
      expect(result.sections.some(s => s.heading === '5. EXCLUSIVITY')).toBe(true);
    });

    it('substitutes party names correctly', () => {
      const result = renderTemplateContent(artistAgreementTemplate, artistAgreementSampleData);
      const partiesSection = result.sections.find(s => s.heading === '1. PARTIES');
      expect(partiesSection?.content).toContain('Jane Smith p/k/a "J. Melody"');
      expect(partiesSection?.content).toContain('John Doe p/k/a "DJ Thunder"');
    });

    it('substitutes revenue splits correctly', () => {
      const result = renderTemplateContent(artistAgreementTemplate, artistAgreementSampleData);
      const revenueSection = result.sections.find(s => s.heading === '3. REVENUE SHARING');
      expect(revenueSection?.content).toContain('Party A: 50%');
      expect(revenueSection?.content).toContain('Party B: 50%');
    });

    it('formats dates correctly', () => {
      const result = renderTemplateContent(artistAgreementTemplate, artistAgreementSampleData);
      const partiesSection = result.sections.find(s => s.heading === '1. PARTIES');
      expect(partiesSection?.content).toContain('15 January 2025');
    });

    it('generates valid HTML', () => {
      const rendered = renderTemplateContent(artistAgreementTemplate, artistAgreementSampleData);
      const html = generateHTML(rendered.title, rendered.sections);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('ARTIST COLLABORATION AGREEMENT');
      expect(html).toContain('1. PARTIES');
      expect(html).toContain('Jane Smith');
    });

    it('generates plain text', () => {
      const rendered = renderTemplateContent(artistAgreementTemplate, artistAgreementSampleData);
      const text = generateText(rendered.title, rendered.sections);

      expect(text).toContain('ARTIST COLLABORATION AGREEMENT');
      expect(text).toContain('1. PARTIES');
      expect(text).toContain('Jane Smith');
      expect(text).not.toContain('<');
    });
  });
});
