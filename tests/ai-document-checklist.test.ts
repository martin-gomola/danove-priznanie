/**
 * Document Checklist Tests
 *
 * getDocumentChecklist returns expected documents based on enabled form sections.
 * Run: npm test -- tests/ai-document-checklist.test.ts
 */

import { describe, it, expect } from 'vitest';
import { getDocumentChecklist } from '@/lib/ai/documentChecklist';
import {
  DEFAULT_TAX_FORM,
  type TaxFormData,
} from '@/types/TaxForm';

describe('getDocumentChecklist', () => {
  it('employment enabled → checklist includes Potvrdenie', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true },
    };
    const checklist = getDocumentChecklist(form);
    const employmentItem = checklist.find((item) => item.section === 'employment');
    expect(employmentItem).toBeDefined();
    expect(employmentItem!.label).toContain('Potvrdenie');
    expect(employmentItem!.required).toBe(true);
  });

  it('dividends enabled → checklist includes dividend report', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      dividends: { ...DEFAULT_TAX_FORM.dividends, enabled: true },
    };
    const checklist = getDocumentChecklist(form);
    const dividendsItem = checklist.find((item) => item.section === 'dividends');
    expect(dividendsItem).toBeDefined();
    expect(
      dividendsItem!.label.includes('dividend') ||
        dividendsItem!.label.includes('1042')
    ).toBe(true);
  });

  it('all sections disabled → only employment (enabled by default)', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true },
      dividends: { ...DEFAULT_TAX_FORM.dividends, enabled: false },
      mutualFunds: { ...DEFAULT_TAX_FORM.mutualFunds, enabled: false },
      stockSales: { ...DEFAULT_TAX_FORM.stockSales, enabled: false },
      mortgage: { ...DEFAULT_TAX_FORM.mortgage, enabled: false },
      childBonus: { ...DEFAULT_TAX_FORM.childBonus, enabled: false },
    };
    const checklist = getDocumentChecklist(form);
    expect(checklist).toHaveLength(1);
    expect(checklist[0].section).toBe('employment');
  });

  it('present flag reflects documentInbox contents', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true },
      aiCopilot: {
        ...DEFAULT_TAX_FORM.aiCopilot,
        documentInbox: [
          {
            id: 'doc1',
            fileName: 'potvrdenie.pdf',
            fileSize: 1000,
            uploadedAt: '2025-01-01T00:00:00Z',
            documentType: 'employment',
            parseStatus: 'parsed',
          },
        ],
      },
    };
    const checklist = getDocumentChecklist(form);
    const employmentItem = checklist.find((item) => item.section === 'employment');
    expect(employmentItem!.present).toBe(true);
  });

  it('present is false when documentInbox has no matching doc', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true },
      aiCopilot: {
        ...DEFAULT_TAX_FORM.aiCopilot,
        documentInbox: [
          {
            id: 'doc1',
            fileName: 'other.pdf',
            fileSize: 1000,
            uploadedAt: '2025-01-01T00:00:00Z',
            documentType: 'other',
            parseStatus: 'parsed',
          },
        ],
      },
    };
    const checklist = getDocumentChecklist(form);
    const employmentItem = checklist.find((item) => item.section === 'employment');
    expect(employmentItem!.present).toBe(false);
  });
});
