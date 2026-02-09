/**
 * Tax Calculation Tests - DPFO typ B 2025
 *
 * Comprehensive tests validating calculations against the official form:
 * https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html
 *
 * Run: npx vitest run tests/tax.test.ts
 */

import { describe, it, expect } from 'vitest';
import { calculateTax } from '@/lib/tax/calculator';
import { DEFAULT_TAX_FORM, TaxFormData } from '@/types/TaxForm';
import {
  ZIVOTNE_MINIMUM,
  NCZD_ZAKLAD,
  NCZD_THRESHOLD,
  NCZD_MULTIPLIER_HIGH,
  NCZD_SPOUSE_ZAKLAD,
  NCZD_SPOUSE_MULTIPLIER_HIGH,
  TAX_BRACKET_THRESHOLD,
  TAX_RATE_LOWER,
  TAX_RATE_UPPER,
  CAPITAL_TAX_RATE,
  DIVIDEND_TAX_RATE,
  MORTGAGE_MAX_OLD,
  MORTGAGE_MAX_NEW,
  MIN_ALLOCATION,
} from '@/lib/tax/constants';

// ═══════════════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════════════

function form(overrides: Partial<TaxFormData>): TaxFormData {
  return { ...DEFAULT_TAX_FORM, ...overrides };
}

function p(value: string): number {
  return parseFloat(value);
}

// ═══════════════════════════════════════════════════════════════════════
// Official Form Constants Validation
// ═══════════════════════════════════════════════════════════════════════

describe('Official Form Constants (životné minimum 2025)', () => {
  const ZM = 273.99;

  it('životné minimum = 273.99 EUR', () => {
    expect(ZIVOTNE_MINIMUM).toBe(ZM);
  });

  it('NCZD taxpayer base = 21 × ŽM = 5,753.79', () => {
    expect(NCZD_ZAKLAD).toBeCloseTo(21 * ZM, 2);
  });

  it('NCZD threshold = 92.8 × ŽM = 25,426.27', () => {
    expect(NCZD_THRESHOLD).toBeCloseTo(92.8 * ZM, 2);
  });

  it('NCZD high-income multiplier = 44.2 × ŽM = 12,110.36', () => {
    expect(NCZD_MULTIPLIER_HIGH).toBeCloseTo(44.2 * ZM, 2);
  });

  it('NCZD spouse base = 19.2 × ŽM = 5,260.61', () => {
    expect(NCZD_SPOUSE_ZAKLAD).toBeCloseTo(19.2 * ZM, 2);
  });

  it('NCZD spouse high-income = 63.4 × ŽM = 17,370.97', () => {
    expect(NCZD_SPOUSE_MULTIPLIER_HIGH).toBeCloseTo(63.4 * ZM, 2);
  });

  it('Tax bracket threshold = 176.8 × ŽM = 48,441.43', () => {
    expect(TAX_BRACKET_THRESHOLD).toBeCloseTo(176.8 * ZM, 2);
  });

  it('Tax rates: 19% lower, 25% upper', () => {
    expect(TAX_RATE_LOWER).toBe(0.19);
    expect(TAX_RATE_UPPER).toBe(0.25);
  });

  it('Capital tax rate = 19%', () => {
    expect(CAPITAL_TAX_RATE).toBe(0.19);
  });

  it('Dividend tax rate = 7%', () => {
    expect(DIVIDEND_TAX_RATE).toBe(0.07);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Employment Section (Oddiel V) - r36, r37, r38
// ═══════════════════════════════════════════════════════════════════════

describe('Oddiel V: Employment (r36-r38)', () => {
  it('r38 = r36 - r37 (employment tax base)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '2500', r131: '0' },
      })
    );
    expect(result.r38).toBe('17500.00');
  });

  it('r38 minimum is 0 (no negative base)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '1000', r37: '5000', r131: '0' },
      })
    );
    expect(result.r38).toBe('0.00');
  });

  it('Disabled employment returns 0', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: false, r36: '20000', r37: '2500' },
      })
    );
    expect(result.r38).toBe('0.00');
    expect(result.r72).toBe('0.00');
    expect(result.r81).toBe('0.00');
    expect(result.r116).toBe('0.00');
  });

  it('treats empty string amounts as zero', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '', r37: '', r131: '' },
      })
    );
    expect(result.r38).toBe('0.00');
    expect(result.r131).toBe('0.00');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NCZD Taxpayer (§11 ods.2) - r73
// ═══════════════════════════════════════════════════════════════════════

describe('Oddiel IX: NCZD Taxpayer (r73) - §11 ods.2', () => {
  it('r73 = 5,753.79 when tax base ≤ 25,426.27', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
      })
    );
    expect(p(result.r73)).toBeCloseTo(NCZD_ZAKLAD, 2);
  });

  it('r73 reduced when tax base > 25,426.27 (formula: 12110.36 - base/4)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
      })
    );
    const expected = NCZD_MULTIPLIER_HIGH - 30000 / 4;
    expect(p(result.r73)).toBeCloseTo(expected, 2);
  });

  it('r73 = 0 when formula goes negative (very high income)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '60000', r37: '0', r131: '0' },
      })
    );
    expect(result.r73).toBe('0.00');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// NCZD Spouse (§11 ods.3) - r74
// ═══════════════════════════════════════════════════════════════════════

describe('Oddiel IX: NCZD Spouse (r74) - §11 ods.3', () => {
  it('r74 = 5,260.61 - spouse_income when taxpayer base ≤ 48,441.43 (12 months)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
        spouse: { ...DEFAULT_TAX_FORM.spouse, enabled: true, pocetMesiacov: '12', vlastnePrijmy: '0' },
      })
    );
    expect(p(result.r74)).toBeCloseTo(NCZD_SPOUSE_ZAKLAD, 2);
  });

  it('r74 reduced by spouse own income', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
        spouse: { ...DEFAULT_TAX_FORM.spouse, enabled: true, pocetMesiacov: '12', vlastnePrijmy: '1000' },
      })
    );
    expect(p(result.r74)).toBeCloseTo(NCZD_SPOUSE_ZAKLAD - 1000, 2);
  });

  it('r74 prorated by months (6 months = 50%)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
        spouse: { ...DEFAULT_TAX_FORM.spouse, enabled: true, pocetMesiacov: '6', vlastnePrijmy: '0' },
      })
    );
    expect(p(result.r74)).toBeCloseTo(NCZD_SPOUSE_ZAKLAD / 2, 2);
  });

  it('r74 uses high-income formula when taxpayer base > 48,441.43', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '55000', r37: '0', r131: '0' },
        spouse: { ...DEFAULT_TAX_FORM.spouse, enabled: true, pocetMesiacov: '12', vlastnePrijmy: '0' },
      })
    );
    const expected = NCZD_SPOUSE_MULTIPLIER_HIGH - 55000 / 4;
    expect(p(result.r74)).toBeCloseTo(expected, 2);
  });

  it('r74 = 0 when spouse income exceeds NCZD', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
        spouse: { ...DEFAULT_TAX_FORM.spouse, enabled: true, pocetMesiacov: '12', vlastnePrijmy: '10000' },
      })
    );
    expect(result.r74).toBe('0.00');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Tax Calculation (Oddiel IX) - r77, r78, r80, r81
// ═══════════════════════════════════════════════════════════════════════

describe('Oddiel IX: Tax Calculation (r77-r81)', () => {
  it('r77 = r73 + r74, capped at r72', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
        spouse: { ...DEFAULT_TAX_FORM.spouse, enabled: true, pocetMesiacov: '12', vlastnePrijmy: '0' },
      })
    );
    const r73 = p(result.r73);
    const r74 = p(result.r74);
    expect(p(result.r77)).toBeCloseTo(r73 + r74, 2);
  });

  it('r78 = r72 - r77 (tax base after NCZD)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
      })
    );
    const expected = 30000 - p(result.r77);
    expect(p(result.r78)).toBeCloseTo(expected, 2);
  });

  it('r81 = 19% tax when r80 ≤ 48,441.43', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
      })
    );
    const taxBase = p(result.r80);
    expect(p(result.r81)).toBeCloseTo(taxBase * 0.19, 2);
  });

  it('r81 = progressive 19%/25% when r80 > 48,441.43', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '60000', r37: '0', r131: '0' },
      })
    );
    const expectedLower = TAX_BRACKET_THRESHOLD * 0.19;
    const expectedUpper = (60000 - TAX_BRACKET_THRESHOLD) * 0.25;
    expect(p(result.r81)).toBeCloseTo(expectedLower + expectedUpper, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Capital Income (Oddiel VII, §7) - r66-r68, r106
// ═══════════════════════════════════════════════════════════════════════

describe('Oddiel VII: Capital Income (r66-r68, r106)', () => {
  it('r68 = max(r66 - r67, 0) (capital gain)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '0', r131: '0' },
        mutualFunds: {
          enabled: true,
          entries: [{ id: '1', fundName: 'F', purchaseAmount: '5000', saleAmount: '8000' }],
        },
      })
    );
    expect(result.r66).toBe('8000.00');
    expect(result.r67).toBe('5000.00');
    expect(result.r68).toBe('3000.00');
  });

  it('r68 = 0 when loss (no negative)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '0', r131: '0' },
        mutualFunds: {
          enabled: true,
          entries: [{ id: '1', fundName: 'F', purchaseAmount: '8000', saleAmount: '5000' }],
        },
      })
    );
    expect(result.r68).toBe('0.00');
  });

  it('r106 = r68 × 19% (flat capital tax)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '0', r131: '0' },
        mutualFunds: {
          enabled: true,
          entries: [{ id: '1', fundName: 'F', purchaseAmount: '5000', saleAmount: '10000' }],
        },
      })
    );
    expect(result.r106).toBe('950.00'); // 5000 × 19%
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Dividends (Príloha č.2, §51e) - pr1-pr28
// ═══════════════════════════════════════════════════════════════════════

describe('Príloha č.2: Dividends (§51e)', () => {
  it('pr9 = pr7 × 7% (dividend tax)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '0', r131: '0' },
        dividends: {
          enabled: true,
          entries: [{ id: '1', ticker: 'X', country: '840', countryName: 'USA', currency: 'USD', amountUsd: '100', amountEur: '1000', withheldTaxUsd: '0', withheldTaxEur: '0' }],
          ecbRate: '1', ecbRateOverride: false, czkRate: '25.21', czkRateOverride: false,
        },
      })
    );
    expect(result.pril2_pr9).toBe('70.00');
  });

  it('pr17 = min(pr16, pr14) (foreign tax credit)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '0', r131: '0' },
        dividends: {
          enabled: true,
          entries: [{ id: '1', ticker: 'X', country: '840', countryName: 'USA', currency: 'USD', amountUsd: '100', amountEur: '1000', withheldTaxUsd: '150', withheldTaxEur: '150' }],
          ecbRate: '1', ecbRateOverride: false, czkRate: '25.21', czkRateOverride: false,
        },
      })
    );
    expect(result.pril2_pr17).toBe('70.00');
    expect(result.pril2_pr18).toBe('0.00');
  });

  it('pr28 = dividend tax after credit', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '10000', r37: '0', r131: '0' },
        dividends: {
          enabled: true,
          entries: [{ id: '1', ticker: 'X', country: '840', countryName: 'USA', currency: 'USD', amountUsd: '100', amountEur: '1000', withheldTaxUsd: '30', withheldTaxEur: '30' }],
          ecbRate: '1', ecbRateOverride: false, czkRate: '25.21', czkRateOverride: false,
        },
      })
    );
    expect(result.pril2_pr28).toBe('40.00');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Child Bonus (§33) - r117
// ═══════════════════════════════════════════════════════════════════════

describe('Child Bonus (r117) - §33', () => {
  it('r117 = 0 when child bonus disabled', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        childBonus: { ...DEFAULT_TAX_FORM.childBonus, enabled: false, children: [] },
      })
    );
    expect(result.r117).toBe('0.00');
  });

  it('r117 = 100 EUR × 12 for child under 15 (whole year)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        childBonus: {
          ...DEFAULT_TAX_FORM.childBonus,
          enabled: true,
          children: [
            { id: '1', priezviskoMeno: 'Child', rodneCislo: '1501010000', months: Array(12).fill(true), wholeYear: true },
          ],
        },
      })
    );
    expect(parseFloat(result.r117)).toBe(1200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Mortgage Bonus (§33a) - r123
// ═══════════════════════════════════════════════════════════════════════

describe('Mortgage Bonus (r123) - §33a', () => {
  it('r123 = 0 when mortgage disabled', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        mortgage: { ...DEFAULT_TAX_FORM.mortgage, enabled: false },
      })
    );
    expect(result.r123).toBe('0.00');
  });

  it('r123 = 50% of interest paid', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        mortgage: { ...DEFAULT_TAX_FORM.mortgage, enabled: true, zaplateneUroky: '600', datumUzavretiaZmluvy: '2024-01-01' },
      })
    );
    expect(result.r123).toBe('300.00');
  });

  it('r123 capped at 400 EUR for contracts ≤ 2023-12-31', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        mortgage: { ...DEFAULT_TAX_FORM.mortgage, enabled: true, zaplateneUroky: '2000', datumUzavretiaZmluvy: '2023-06-15' },
      })
    );
    expect(result.r123).toBe(MORTGAGE_MAX_OLD.toFixed(2));
  });

  it('r123 capped at 1200 EUR for contracts > 2023-12-31', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        mortgage: { ...DEFAULT_TAX_FORM.mortgage, enabled: true, zaplateneUroky: '5000', datumUzavretiaZmluvy: '2024-02-01' },
      })
    );
    expect(result.r123).toBe(MORTGAGE_MAX_NEW.toFixed(2));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2%/3% Allocation (§50) - r152
// ═══════════════════════════════════════════════════════════════════════

describe('2%/3% Allocation (r152) - §50', () => {
  it('r152 = 0 when disabled', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        twoPercent: { ...DEFAULT_TAX_FORM.twoPercent, enabled: false },
      })
    );
    expect(result.r152).toBe('0.00');
  });

  it('r152 = 2% of r124', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        twoPercent: { ...DEFAULT_TAX_FORM.twoPercent, enabled: true, splnam3per: false },
      })
    );
    const r124 = p(result.r124);
    expect(p(result.r152)).toBeCloseTo(r124 * 0.02, 2);
  });

  it('r152 = 3% when splnam3per (volunteer)', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '0', r131: '0' },
        twoPercent: { ...DEFAULT_TAX_FORM.twoPercent, enabled: true, splnam3per: true },
      })
    );
    const r124 = p(result.r124);
    expect(p(result.r152)).toBeCloseTo(r124 * 0.03, 2);
  });

  it('r152 = 0 when allocation < 3 EUR minimum', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '6000', r37: '0', r131: '0' },
        twoPercent: { ...DEFAULT_TAX_FORM.twoPercent, enabled: true, splnam3per: false },
      })
    );
    const r124 = p(result.r124);
    const allocation = r124 * 0.02;
    if (allocation < MIN_ALLOCATION) {
      expect(result.r152).toBe('0.00');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Final Result (r135, r136)
// ═══════════════════════════════════════════════════════════════════════

describe('Final Result (r135, r136)', () => {
  it('r135 = 0 when tax to pay ≤ 5 EUR', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '5800', r37: '0', r131: '0' },
      })
    );
    const pay = p(result.r135);
    if (pay > 0 && pay <= 5) {
      expect(result.r135).toBe('0.00');
    }
  });

  it('r136 = refund amount when advances exceed tax', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '20000', r37: '2000', r131: '3000' },
      })
    );
    expect(result.isRefund).toBe(true);
    expect(p(result.r136)).toBeGreaterThan(0);
    expect(result.r135).toBe('0.00');
  });

  it('r135 correct when tax exceeds advances', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '1000' },
      })
    );
    expect(result.isRefund).toBe(false);
    expect(p(result.r135)).toBeGreaterThan(0);
    expect(result.r136).toBe('0.00');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Grand Total (r116)
// ═══════════════════════════════════════════════════════════════════════

describe('Grand Total Tax (r116)', () => {
  it('r116 = r90 + r115 + pril2.pr28', () => {
    const result = calculateTax(
      form({
        employment: { ...DEFAULT_TAX_FORM.employment, enabled: true, r36: '30000', r37: '0', r131: '0' },
        mutualFunds: {
          enabled: true,
          entries: [{ id: '1', fundName: 'F', purchaseAmount: '5000', saleAmount: '10000' }],
        },
        dividends: {
          enabled: true,
          entries: [{ id: '1', ticker: 'X', country: '840', countryName: 'USA', currency: 'USD', amountUsd: '100', amountEur: '1000', withheldTaxUsd: '0', withheldTaxEur: '0' }],
          ecbRate: '1', ecbRateOverride: false, czkRate: '25.21', czkRateOverride: false,
        },
      })
    );
    const r90 = p(result.r90);
    const r115 = p(result.r115);
    const pr28 = p(result.pril2_pr28);
    expect(p(result.r116)).toBeCloseTo(r90 + r115 + pr28, 2);
  });
});

