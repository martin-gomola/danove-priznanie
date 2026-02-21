/**
 * Handoff Summary Tests
 *
 * buildHandoffSummary produces a JSON-ready summary for accountant handoff.
 * Run: npm test -- tests/ai-handoff-summary.test.ts
 */

import { describe, it, expect } from 'vitest';
import { buildHandoffSummary } from '@/lib/ai/handoffSummary';
import { DEFAULT_TAX_FORM, type TaxFormData, type TaxCalculationResult, type RiskWarning } from '@/types/TaxForm';
import { calculateTax } from '@/lib/tax/calculator';
import { evaluateRiskRules } from '@/lib/ai/riskRules';

function minimalCalc(overrides: Partial<TaxCalculationResult> = {}): TaxCalculationResult {
  const form = { ...DEFAULT_TAX_FORM, employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '1000', r131: '1500' } };
  const base = calculateTax(form);
  return { ...base, ...overrides };
}

describe('buildHandoffSummary', () => {
  it('includes key section totals from calc', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '15000', r37: '1500', r131: '2000' },
      dividends: { ...DEFAULT_TAX_FORM.dividends, enabled: true, entries: [{ id: '1', ticker: 'AAPL', country: '840', countryName: 'USA', currency: 'USD', amountOriginal: '100', amountEur: '88', withheldTaxOriginal: '15', withheldTaxEur: '13' }], ecbRate: '1.13' },
      mutualFunds: { ...DEFAULT_TAX_FORM.mutualFunds, enabled: true, entries: [{ id: '1', fundName: 'F1', purchaseAmount: '1000', saleAmount: '1200' }] },
      stockSales: { ...DEFAULT_TAX_FORM.stockSales, enabled: true, entries: [{ id: '1', ticker: 'XYZ', purchaseAmount: '500', saleAmount: '600' }] },
      mortgage: { ...DEFAULT_TAX_FORM.mortgage, enabled: true, zaplateneUroky: '1200', pocetMesiacov: '12', datumZacatiaUroceniaUveru: '2020-01-01', datumUzavretiaZmluvy: '2019-06-01', confirm4Years: true },
    };
    const calc = calculateTax(form);
    const warnings: RiskWarning[] = [];

    const summary = buildHandoffSummary(form, calc, warnings);

    expect(summary.sections).toBeDefined();
    const employment = summary.sections.find((s) => s.name === 'Employment');
    expect(employment).toBeDefined();
    expect(employment!.enabled).toBe(true);
    expect(employment!.keyValues.r36).toBe('15000');
    expect(employment!.keyValues.r37).toBe('1500');
    expect(employment!.keyValues.r131).toBe('2000');

    const dividends = summary.sections.find((s) => s.name === 'Dividends');
    expect(dividends).toBeDefined();
    expect(dividends!.enabled).toBe(true);
    expect(dividends!.keyValues.totalDividendsEur).toBe(calc.totalDividendsEur);
    expect(dividends!.keyValues.totalWithheldTaxEur).toBe(calc.totalWithheldTaxEur);
    expect(dividends!.keyValues.entryCount).toBe('1');

    const mutualFunds = summary.sections.find((s) => s.name === 'MutualFunds');
    expect(mutualFunds).toBeDefined();
    expect(mutualFunds!.keyValues.r66).toBe(calc.r66);
    expect(mutualFunds!.keyValues.r67).toBe(calc.r67);
    expect(mutualFunds!.keyValues.r68).toBe(calc.r68);

    const stockSales = summary.sections.find((s) => s.name === 'StockSales');
    expect(stockSales).toBeDefined();
    expect(stockSales!.keyValues.r69).toBe(calc.r69);
    expect(stockSales!.keyValues.r70).toBe(calc.r70);
    expect(stockSales!.keyValues.r71).toBe(calc.r71);

    const mortgage = summary.sections.find((s) => s.name === 'Mortgage');
    expect(mortgage).toBeDefined();
    expect(mortgage!.keyValues.r123).toBe(calc.r123);
  });

  it('includes unresolved warnings', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '', r37: '', r131: '' },
    };
    const calc = minimalCalc();
    const warnings = evaluateRiskRules(form);

    const summary = buildHandoffSummary(form, calc, warnings);

    expect(summary.warnings).toHaveLength(1);
    expect(summary.warnings[0].code).toBe('MISSING_EMPLOYMENT_DATA');
    expect(summary.warnings[0].severity).toBe('error');
  });

  it('evidence count matches form state', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      aiCopilot: {
        ...DEFAULT_TAX_FORM.aiCopilot,
        evidence: [
          { fieldPath: 'employment.r36', docId: 'd1', snippet: '15000', confidence: 0.95, extractedAt: '2025-01-15T10:00:00Z' },
          { fieldPath: 'employment.r37', docId: 'd1', snippet: '1500', confidence: 0.9, extractedAt: '2025-01-15T10:00:00Z' },
        ],
      },
    };
    const calc = minimalCalc();

    const summary = buildHandoffSummary(form, calc, []);

    expect(summary.evidenceCount).toBe(2);
  });

  it('evidence count is 0 when form has no evidence', () => {
    const form = DEFAULT_TAX_FORM;
    const calc = minimalCalc();

    const summary = buildHandoffSummary(form, calc, []);

    expect(summary.evidenceCount).toBe(0);
  });

  it('readiness score decreases with warnings', () => {
    const form: TaxFormData = {
      ...DEFAULT_TAX_FORM,
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '15000' },
    };
    const calc = minimalCalc();

    const summaryNoWarnings = buildHandoffSummary(form, calc, []);
    expect(summaryNoWarnings.readinessScore).toBe(100);

    const oneError: RiskWarning[] = [
      { severity: 'error', code: 'ERR', message: 'err', fieldPath: 'x', suggestion: '' },
    ];
    const summaryOneError = buildHandoffSummary(form, calc, oneError);
    expect(summaryOneError.readinessScore).toBe(80);

    const oneWarning: RiskWarning[] = [
      { severity: 'warning', code: 'WARN', message: 'warn', fieldPath: 'x', suggestion: '' },
    ];
    const summaryOneWarning = buildHandoffSummary(form, calc, oneWarning);
    expect(summaryOneWarning.readinessScore).toBe(90);

    const oneInfo: RiskWarning[] = [
      { severity: 'info', code: 'INFO', message: 'info', fieldPath: 'x', suggestion: '' },
    ];
    const summaryOneInfo = buildHandoffSummary(form, calc, oneInfo);
    expect(summaryOneInfo.readinessScore).toBe(95);

    const mixed: RiskWarning[] = [
      { severity: 'error', code: 'E1', message: '', fieldPath: '', suggestion: '' },
      { severity: 'warning', code: 'W1', message: '', fieldPath: '', suggestion: '' },
      { severity: 'info', code: 'I1', message: '', fieldPath: '', suggestion: '' },
    ];
    const summaryMixed = buildHandoffSummary(form, calc, mixed);
    expect(summaryMixed.readinessScore).toBe(65); // 100 - 20 - 10 - 5
  });

  it('readiness score does not go below 0', () => {
    const form = DEFAULT_TAX_FORM;
    const calc = minimalCalc();
    const manyErrors: RiskWarning[] = Array(10).fill({
      severity: 'error' as const,
      code: 'E',
      message: '',
      fieldPath: '',
      suggestion: '',
    });

    const summary = buildHandoffSummary(form, calc, manyErrors);

    expect(summary.readinessScore).toBeGreaterThanOrEqual(0);
  });

  it('generatedAt is valid ISO date string', () => {
    const form = DEFAULT_TAX_FORM;
    const calc = minimalCalc();

    const summary = buildHandoffSummary(form, calc, []);

    expect(summary.generatedAt).toBeDefined();
    expect(() => new Date(summary.generatedAt)).not.toThrow();
  });
});
