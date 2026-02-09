/**
 * XSD Schema Validation Tests
 *
 * Validates that our XML output matches the official XSD schema from
 * financnasprava.sk. This ensures compatibility with the official e-form.
 *
 * Schema source: https://ekr.financnasprava.sk/Formulare/XSD/dpfo_b2025.xsd
 *
 * Run: npx vitest run tests/xsd-validation.test.ts
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { convertToXML } from '@/lib/xml/xmlGenerator';
import { calculateTax } from '@/lib/tax/calculator';
import { DEFAULT_TAX_FORM, TaxFormData } from '@/types/TaxForm';

const XSD_PATH = path.resolve(__dirname, 'schemas/dpfo_b2025.xsd');
const TMP_DIR = path.resolve(__dirname, '.tmp');

/**
 * Validate XML string against the official XSD schema using xmllint.
 * Returns { valid: boolean, errors: string[] }.
 */
function validateXml(xml: string, label: string): { valid: boolean; errors: string[] } {
  const tmpFile = path.join(TMP_DIR, `${label}.xml`);

  try {
    // Ensure tmp dir exists
    if (!existsSync(TMP_DIR)) {
      execSync(`mkdir -p "${TMP_DIR}"`);
    }

    writeFileSync(tmpFile, xml, 'utf-8');

    execSync(`xmllint --schema "${XSD_PATH}" --noout "${tmpFile}" 2>&1`, {
      encoding: 'utf-8',
      timeout: 10_000,
    });

    return { valid: true, errors: [] };
  } catch (err: unknown) {
    const output = (err as { stdout?: string }).stdout || String(err);
    const lines = output
      .split('\n')
      .filter((l) => l.includes('error') || l.includes('fails to validate'))
      .map((l) => l.replace(tmpFile, '<xml>').trim());
    return { valid: false, errors: lines };
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Helper to build a TaxFormData with given overrides.
 */
function buildForm(overrides: Partial<TaxFormData> = {}): TaxFormData {
  return { ...DEFAULT_TAX_FORM, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════════
// Test Scenarios
// ═══════════════════════════════════════════════════════════════════════

describe('XSD Schema Validation (dpfo_b2025.xsd)', () => {
  it('should have the official XSD schema file available', () => {
    expect(existsSync(XSD_PATH)).toBe(true);
  });

  it('should have xmllint available', () => {
    const result = execSync('which xmllint', { encoding: 'utf-8' }).trim();
    expect(result).toBeTruthy();
  });

  // ─── Scenario 1: Minimal form (empty/default) ────────────────────
  it('validates: minimal form with only DIC', () => {
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Testovič',
        meno: 'Ján',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: { enabled: false, r36: '', r36a: '', r37: '', r131: '' },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);
    const result = validateXml(xml, 'minimal');

    if (!result.valid) {
      console.error('Minimal form validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });

  // ─── Scenario 2: Employment only ─────────────────────────────────
  it('validates: employment income (Oddiel V)', () => {
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Testovič',
        meno: 'Ján',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: {
        enabled: true,
        r36: '28800.00',
        r36a: '4032.00',
        r37: '3897.60',
        r131: '2906.60',
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);
    const result = validateXml(xml, 'employment');

    if (!result.valid) {
      console.error('Employment validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });

  // ─── Scenario 3: Employment + 2% allocation ──────────────────────
  it('validates: employment + 2% allocation (Oddiel XII)', () => {
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Testovič',
        meno: 'Ján',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: {
        enabled: true,
        r36: '28800.00',
        r36a: '4032.00',
        r37: '3897.60',
        r131: '2906.60',
      },
      twoPercent: {
        enabled: true,
        ico: '45999783',
        obchMeno: 'U psej matere Kysuce-Ranč Korňa',
        splnam3per: false,
        suhlasSoZaslanim: true,
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);
    const result = validateXml(xml, 'two-percent');

    if (!result.valid) {
      console.error('2% allocation validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });

  // ─── Scenario 4: Employment + Dividends ──────────────────────────
  it('validates: employment + foreign dividends (Príloha č.2)', () => {
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Testovič',
        meno: 'Ján',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: {
        enabled: true,
        r36: '28800.00',
        r36a: '4032.00',
        r37: '3897.60',
        r131: '2906.60',
      },
      dividends: {
        enabled: true,
        ecbRate: '1.13',
        ecbRateOverride: false,
        czkRate: '25.21',
        czkRateOverride: false,
        entries: [
          {
            id: '1',
            ticker: 'AAPL',
            country: '840',
            countryName: 'USA',
            currency: 'USD',
            amountUsd: '150.00',
            amountEur: '132.74',
            withheldTaxUsd: '22.50',
            withheldTaxEur: '19.91',
          },
          {
            id: '2',
            ticker: 'MSFT',
            country: '840',
            countryName: 'USA',
            currency: 'USD',
            amountUsd: '80.00',
            amountEur: '70.80',
            withheldTaxUsd: '12.00',
            withheldTaxEur: '10.62',
          },
        ],
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);
    const result = validateXml(xml, 'dividends');

    if (!result.valid) {
      console.error('Dividends validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });

  // ─── Scenario 5: Full form (all sections) ────────────────────────
  it('validates: full form with all sections enabled', () => {
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Testovič',
        meno: 'Ján',
        titul: 'Ing.',
        titulZa: 'PhD.',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: {
        enabled: true,
        r36: '28800.00',
        r36a: '4032.00',
        r37: '3897.60',
        r131: '2906.60',
      },
      dividends: {
        enabled: true,
        ecbRate: '1.13',
        ecbRateOverride: false,
        czkRate: '25.21',
        czkRateOverride: false,
        entries: [
          {
            id: '1',
            ticker: 'AAPL',
            country: '840',
            countryName: 'USA',
            currency: 'USD',
            amountUsd: '150.00',
            amountEur: '132.74',
            withheldTaxUsd: '22.50',
            withheldTaxEur: '19.91',
          },
        ],
      },
      mutualFunds: {
        enabled: true,
        entries: [
          {
            id: '1',
            name: 'Fond A',
            saleAmount: '5000.00',
            purchasePrice: '4000.00',
          },
        ],
      },
      mortgage: {
        enabled: true,
        zaplateneUroky: '800.00',
        pocetMesiacov: '12',
        datumZacatiaUroceniaUveru: '2024-03-15',
        datumUzavretiaZmluvy: '2024-02-01',
        confirm4Years: true,
      },
      spouse: {
        enabled: true,
        priezviskoMeno: 'Testovičová Mária',
        rodneCislo: '9955010001',
        vlastnePrijmy: '0.00',
        pocetMesiacov: '12',
      },
      childBonus: {
        enabled: true,
        bonusPaidByEmployer: '0.00',
        children: [
          {
            id: '1',
            priezviskoMeno: 'Testovič Adam',
            rodneCislo: '2055010001',
            months: Array(12).fill(true),
            wholeYear: true,
          },
        ],
      },
      twoPercent: {
        enabled: true,
        ico: '45999783',
        obchMeno: 'U psej matere Kysuce-Ranč Korňa',
        splnam3per: false,
        suhlasSoZaslanim: true,
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);
    const result = validateXml(xml, 'full-form');

    if (!result.valid) {
      console.error('Full form validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });

  // ─── Scenario 6: Multiple dividend countries ─────────────────────
  it('validates: dividends from multiple countries (USA, CZ, FR)', () => {
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Testovič',
        meno: 'Ján',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: {
        enabled: true,
        r36: '28800.00',
        r36a: '4032.00',
        r37: '3897.60',
        r131: '2906.60',
      },
      dividends: {
        enabled: true,
        ecbRate: '1.13',
        ecbRateOverride: false,
        czkRate: '25.21',
        czkRateOverride: false,
        entries: [
          {
            id: '1', ticker: 'AAPL', country: '840', countryName: 'USA',
            currency: 'USD',
            amountUsd: '150.00', amountEur: '132.74',
            withheldTaxUsd: '22.50', withheldTaxEur: '19.91',
          },
          {
            id: '2', ticker: 'CEZ', country: '203', countryName: 'Česko',
            currency: 'CZK',
            amountUsd: '1000.00', amountEur: '39.67',
            withheldTaxUsd: '150.00', withheldTaxEur: '5.95',
          },
          {
            id: '3', ticker: 'TTE', country: '250', countryName: 'Francúzsko',
            currency: 'EUR',
            amountUsd: '50.00', amountEur: '50.00',
            withheldTaxUsd: '6.40', withheldTaxEur: '6.40',
          },
        ],
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);
    const result = validateXml(xml, 'multi-country');

    if (!result.valid) {
      console.error('Multi-country validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });
});
