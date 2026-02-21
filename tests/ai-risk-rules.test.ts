/**
 * Risk Rules Tests
 *
 * evaluateRiskRules returns readiness warnings based on form state.
 * Run: npm test -- tests/ai-risk-rules.test.ts
 */

import { describe, it, expect } from 'vitest';
import { evaluateRiskRules } from '@/lib/ai/riskRules';
import {
  DEFAULT_TAX_FORM,
  type TaxFormData,
} from '@/types/TaxForm';

describe('evaluateRiskRules', () => {
  it('employment enabled, r36 empty → MISSING_EMPLOYMENT_DATA error', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: {
        ...DEFAULT_TAX_FORM.employment,
        enabled: true,
        r36: '',
      },
    };
    const warnings = evaluateRiskRules(form);
    const err = warnings.find((w) => w.code === 'MISSING_EMPLOYMENT_DATA');
    expect(err).toBeDefined();
    expect(err!.severity).toBe('error');
    expect(err!.fieldPath).toBe('employment.r36');
    expect(err!.message).toContain('Zamestnanie');
  });

  it('dividends enabled, no entries → DIVIDENDS_ENABLED_NO_ENTRIES warning', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      dividends: {
        ...DEFAULT_TAX_FORM.dividends,
        enabled: true,
        entries: [],
      },
    };
    const warnings = evaluateRiskRules(form);
    const w = warnings.find((w) => w.code === 'DIVIDENDS_ENABLED_NO_ENTRIES');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('warning');
    expect(w!.fieldPath).toBe('dividends.entries');
  });

  it('dividends with USD entries, empty ecbRate → MISSING_EXCHANGE_RATE warning', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      dividends: {
        ...DEFAULT_TAX_FORM.dividends,
        enabled: true,
        entries: [
          {
            id: '1',
            ticker: 'AAPL',
            country: '840',
            countryName: 'USA',
            currency: 'USD',
            amountOriginal: '100',
            amountEur: '',
            withheldTaxOriginal: '15',
            withheldTaxEur: '',
          },
        ],
        ecbRate: '',
      },
    };
    const warnings = evaluateRiskRules(form);
    const w = warnings.find((w) => w.code === 'MISSING_EXCHANGE_RATE');
    expect(w).toBeDefined();
    expect(w!.severity).toBe('warning');
    expect(w!.fieldPath).toBe('dividends.ecbRate');
  });

  it('dividends ecbRate is "0" → MISSING_EXCHANGE_RATE warning', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      dividends: {
        ...DEFAULT_TAX_FORM.dividends,
        enabled: true,
        entries: [
          {
            id: '1',
            ticker: 'AAPL',
            country: '840',
            countryName: 'USA',
            currency: 'USD',
            amountOriginal: '100',
            amountEur: '',
            withheldTaxOriginal: '15',
            withheldTaxEur: '',
          },
        ],
        ecbRate: '0',
      },
    };
    const warnings = evaluateRiskRules(form);
    const w = warnings.find((w) => w.code === 'MISSING_EXCHANGE_RATE');
    expect(w).toBeDefined();
  });

  it('all data filled → empty warnings array', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: {
        ...DEFAULT_TAX_FORM.employment,
        enabled: true,
        r36: '15000',
      },
      dividends: {
        ...DEFAULT_TAX_FORM.dividends,
        enabled: true,
        entries: [
          {
            id: '1',
            ticker: 'AAPL',
            country: '840',
            countryName: 'USA',
            currency: 'USD',
            amountOriginal: '100',
            amountEur: '88',
            withheldTaxOriginal: '15',
            withheldTaxEur: '13',
          },
        ],
        ecbRate: '1.13',
      },
    };
    const warnings = evaluateRiskRules(form);
    expect(warnings).toHaveLength(0);
  });
});
