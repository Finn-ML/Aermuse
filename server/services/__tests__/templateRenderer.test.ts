import { describe, it, expect } from 'vitest';
import {
  substituteVariables,
  extractVariables,
  validateFormData,
  formatDate,
  formatCurrency,
  renderTemplateContent,
  generateHTML,
  generateText
} from '../templateRenderer';
import type { TemplateContent, TemplateField, OptionalClause, TemplateFormData } from '../../../shared/types/templates';

describe('templateRenderer', () => {
  describe('formatDate', () => {
    it('formats dates in en-GB locale', () => {
      const date = new Date('2024-03-15');
      const result = formatDate(date);
      expect(result).toBe('15 March 2024');
    });
  });

  describe('formatCurrency', () => {
    it('formats numbers as GBP currency', () => {
      expect(formatCurrency(1000)).toBe('£1,000.00');
      expect(formatCurrency(99.99)).toBe('£99.99');
      expect(formatCurrency(1500000)).toBe('£1,500,000.00');
    });
  });

  describe('substituteVariables', () => {
    it('replaces {{variable}} placeholders with values', () => {
      const text = 'Hello {{name}}, welcome to {{company}}!';
      const values = { name: 'John', company: 'Aermuse' };
      const result = substituteVariables(text, values);
      expect(result).toBe('Hello John, welcome to Aermuse!');
    });

    it('keeps placeholder if value is missing', () => {
      const text = 'Hello {{name}}, your role is {{role}}';
      const values = { name: 'John' };
      const result = substituteVariables(text, values);
      expect(result).toBe('Hello John, your role is {{role}}');
    });

    it('keeps placeholder if value is null', () => {
      const text = 'Value is {{value}}';
      const values = { value: null };
      const result = substituteVariables(text, values);
      expect(result).toBe('Value is {{value}}');
    });

    it('formats Date values correctly', () => {
      const text = 'Contract date: {{effective_date}}';
      const values = { effective_date: new Date('2024-06-01') };
      const result = substituteVariables(text, values);
      expect(result).toBe('Contract date: 1 June 2024');
    });

    it('formats currency for amount fields', () => {
      const text = 'Total amount: {{total_amount}}';
      const values = { total_amount: 5000 };
      const result = substituteVariables(text, values);
      expect(result).toBe('Total amount: £5,000.00');
    });

    it('formats currency for fee fields', () => {
      const text = 'Service fee: {{service_fee}}';
      const values = { service_fee: 250 };
      const result = substituteVariables(text, values);
      expect(result).toBe('Service fee: £250.00');
    });

    it('does not format regular numbers as currency', () => {
      const text = 'Count: {{count}}';
      const values = { count: 42 };
      const result = substituteVariables(text, values);
      expect(result).toBe('Count: 42');
    });

    it('handles multiple occurrences of same variable', () => {
      const text = '{{name}} agrees. Signed: {{name}}';
      const values = { name: 'Alice' };
      const result = substituteVariables(text, values);
      expect(result).toBe('Alice agrees. Signed: Alice');
    });
  });

  describe('extractVariables', () => {
    it('extracts variables from title', () => {
      const content: TemplateContent = {
        title: '{{type}} Agreement between {{party_a}} and {{party_b}}',
        sections: []
      };
      const vars = extractVariables(content);
      expect(vars).toContain('type');
      expect(vars).toContain('party_a');
      expect(vars).toContain('party_b');
    });

    it('extracts variables from section headings', () => {
      const content: TemplateContent = {
        title: 'Agreement',
        sections: [
          { id: '1', heading: '{{section_type}} Terms', content: 'Content here' }
        ]
      };
      const vars = extractVariables(content);
      expect(vars).toContain('section_type');
    });

    it('extracts variables from section content', () => {
      const content: TemplateContent = {
        title: 'Agreement',
        sections: [
          {
            id: '1',
            heading: 'Terms',
            content: '{{party_a}} agrees to pay {{party_b}} the sum of {{amount}}.'
          }
        ]
      };
      const vars = extractVariables(content);
      expect(vars).toContain('party_a');
      expect(vars).toContain('party_b');
      expect(vars).toContain('amount');
    });

    it('returns unique variables only', () => {
      const content: TemplateContent = {
        title: '{{name}} Agreement',
        sections: [
          { id: '1', heading: 'For {{name}}', content: '{{name}} agrees to terms.' }
        ]
      };
      const vars = extractVariables(content);
      expect(vars.filter(v => v === 'name').length).toBe(1);
    });

    it('handles empty content', () => {
      const content: TemplateContent = {
        title: 'Simple Agreement',
        sections: []
      };
      const vars = extractVariables(content);
      expect(vars).toEqual([]);
    });
  });

  describe('validateFormData', () => {
    const baseFields: TemplateField[] = [
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'notes', label: 'Notes', type: 'textarea', required: false }
    ];

    it('passes when all required fields are provided', () => {
      const formData: TemplateFormData = {
        fields: { name: 'John', email: 'john@example.com' },
        enabledClauses: []
      };
      const result = validateFormData({ fields: baseFields }, formData);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('fails when required field is missing', () => {
      const formData: TemplateFormData = {
        fields: { name: 'John' },
        enabledClauses: []
      };
      const result = validateFormData({ fields: baseFields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.email).toBe('Email is required');
    });

    it('fails when required field is empty string', () => {
      const formData: TemplateFormData = {
        fields: { name: '', email: 'john@example.com' },
        enabledClauses: []
      };
      const result = validateFormData({ fields: baseFields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
    });

    it('fails when required field is null', () => {
      const formData: TemplateFormData = {
        fields: { name: null, email: 'john@example.com' },
        enabledClauses: []
      };
      const result = validateFormData({ fields: baseFields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
    });

    it('validates minLength constraint', () => {
      const fields: TemplateField[] = [
        { id: 'password', label: 'Password', type: 'text', required: true, validation: { minLength: 8 } }
      ];
      const formData: TemplateFormData = {
        fields: { password: 'short' },
        enabledClauses: []
      };
      const result = validateFormData({ fields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.password).toContain('at least 8 characters');
    });

    it('validates maxLength constraint', () => {
      const fields: TemplateField[] = [
        { id: 'code', label: 'Code', type: 'text', required: true, validation: { maxLength: 5 } }
      ];
      const formData: TemplateFormData = {
        fields: { code: 'toolongcode' },
        enabledClauses: []
      };
      const result = validateFormData({ fields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.code).toContain('at most 5 characters');
    });

    it('validates pattern constraint', () => {
      const fields: TemplateField[] = [
        {
          id: 'phone',
          label: 'Phone',
          type: 'text',
          required: true,
          validation: { pattern: '^\\d{10}$', patternMessage: 'Phone must be 10 digits' }
        }
      ];
      const formData: TemplateFormData = {
        fields: { phone: 'invalid' },
        enabledClauses: []
      };
      const result = validateFormData({ fields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.phone).toBe('Phone must be 10 digits');
    });

    it('validates min number constraint', () => {
      const fields: TemplateField[] = [
        { id: 'amount', label: 'Amount', type: 'number', required: true, validation: { min: 100 } }
      ];
      const formData: TemplateFormData = {
        fields: { amount: 50 },
        enabledClauses: []
      };
      const result = validateFormData({ fields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.amount).toContain('at least 100');
    });

    it('validates max number constraint', () => {
      const fields: TemplateField[] = [
        { id: 'percentage', label: 'Percentage', type: 'number', required: true, validation: { max: 100 } }
      ];
      const formData: TemplateFormData = {
        fields: { percentage: 150 },
        enabledClauses: []
      };
      const result = validateFormData({ fields }, formData);
      expect(result.valid).toBe(false);
      expect(result.errors.percentage).toContain('at most 100');
    });

    describe('optional clause fields', () => {
      const optionalClauses: OptionalClause[] = [
        {
          id: 'exclusivity',
          name: 'Exclusivity Clause',
          description: 'Exclusive rights',
          defaultEnabled: false,
          fields: [
            { id: 'exclusivity_period', label: 'Exclusivity Period', type: 'text', required: true }
          ]
        }
      ];

      it('validates optional clause fields when clause is enabled', () => {
        const formData: TemplateFormData = {
          fields: { name: 'John', email: 'john@example.com' },
          enabledClauses: ['exclusivity']
        };
        const result = validateFormData({ fields: baseFields, optionalClauses }, formData);
        expect(result.valid).toBe(false);
        expect(result.errors.exclusivity_period).toContain('required when Exclusivity Clause is enabled');
      });

      it('does not validate optional clause fields when clause is disabled', () => {
        const formData: TemplateFormData = {
          fields: { name: 'John', email: 'john@example.com' },
          enabledClauses: []
        };
        const result = validateFormData({ fields: baseFields, optionalClauses }, formData);
        expect(result.valid).toBe(true);
      });

      it('passes when optional clause fields are provided and clause is enabled', () => {
        const formData: TemplateFormData = {
          fields: { name: 'John', email: 'john@example.com', exclusivity_period: '2 years' },
          enabledClauses: ['exclusivity']
        };
        const result = validateFormData({ fields: baseFields, optionalClauses }, formData);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('renderTemplateContent', () => {
    it('renders title and sections with substituted variables', () => {
      const template = {
        content: {
          title: 'Agreement between {{party_a}} and {{party_b}}',
          sections: [
            { id: '1', heading: 'Parties', content: '{{party_a}} (Party A) and {{party_b}} (Party B)' }
          ]
        }
      };
      const formData: TemplateFormData = {
        fields: { party_a: 'Alice', party_b: 'Bob' },
        enabledClauses: []
      };
      const result = renderTemplateContent(template, formData);
      expect(result.title).toBe('Agreement between Alice and Bob');
      expect(result.sections[0].heading).toBe('Parties');
      expect(result.sections[0].content).toBe('Alice (Party A) and Bob (Party B)');
    });

    it('filters out optional sections when clause is disabled', () => {
      const template = {
        content: {
          title: 'Agreement',
          sections: [
            { id: '1', heading: 'Main Terms', content: 'Always shown' },
            { id: '2', heading: 'Exclusivity', content: 'Optional content', isOptional: true, clauseId: 'exclusivity' }
          ]
        },
        optionalClauses: [
          { id: 'exclusivity', name: 'Exclusivity', description: 'Optional', defaultEnabled: false }
        ]
      };
      const formData: TemplateFormData = {
        fields: {},
        enabledClauses: []
      };
      const result = renderTemplateContent(template, formData);
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].heading).toBe('Main Terms');
    });

    it('includes optional sections when clause is enabled', () => {
      const template = {
        content: {
          title: 'Agreement',
          sections: [
            { id: '1', heading: 'Main Terms', content: 'Always shown' },
            { id: '2', heading: 'Exclusivity', content: 'Optional content', isOptional: true, clauseId: 'exclusivity' }
          ]
        },
        optionalClauses: [
          { id: 'exclusivity', name: 'Exclusivity', description: 'Optional', defaultEnabled: false }
        ]
      };
      const formData: TemplateFormData = {
        fields: {},
        enabledClauses: ['exclusivity']
      };
      const result = renderTemplateContent(template, formData);
      expect(result.sections).toHaveLength(2);
    });
  });

  describe('generateHTML', () => {
    it('generates valid HTML structure', () => {
      const html = generateHTML('Test Agreement', [
        { heading: 'Section 1', content: 'Content 1' }
      ]);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('Test Agreement');
      expect(html).toContain('Section 1');
      expect(html).toContain('Content 1');
    });

    it('includes styles by default', () => {
      const html = generateHTML('Test', []);
      expect(html).toContain('<style>');
      expect(html).toContain('.contract');
    });

    it('excludes styles when includeStyles is false', () => {
      const html = generateHTML('Test', [], false);
      expect(html).not.toContain('<style>');
    });
  });

  describe('generateText', () => {
    it('generates plain text format', () => {
      const text = generateText('Test Agreement', [
        { heading: 'Section 1', content: 'Content 1' },
        { heading: 'Section 2', content: 'Content 2' }
      ]);
      expect(text).toContain('TEST AGREEMENT');
      expect(text).toContain('Section 1');
      expect(text).toContain('Content 1');
      expect(text).toContain('Section 2');
      expect(text).toContain('Content 2');
    });
  });
});
