/**
 * Test: parse IBKR dividend CSV from tmp/sample-dividends.csv and assert XML export contains dividends.
 * Put your own CSV there (do not commit it; tmp/ is gitignored). Run: npx vitest run tests/import-real-csv-and-xml.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import xmljs from 'xml-js';
import { parseIbkrDividendCsv } from '../src/lib/import/parseIbkrCsv';
import { convertToXML } from '@/lib/xml/xmlGenerator';
import { calculateTax } from '@/lib/tax/calculator';
import { DEFAULT_TAX_FORM, TaxFormData } from '@/types/TaxForm';
import { dividendToEur } from '@/lib/utils/dividendEur';

function buildForm(overrides: Partial<TaxFormData> = {}): TaxFormData {
  return { ...DEFAULT_TAX_FORM, ...overrides };
}

/** Extract text from xml-js compact element (string or { _text: string }) */
function text(el: unknown): string {
  if (el == null) return '';
  if (typeof el === 'string') return el.trim();
  if (typeof el === 'object' && el !== null && '_text' in el) return String((el as { _text: string })._text ?? '').trim();
  return '';
}

/**
 * Parse exported XML and return per-country dividend totals from Oddiel XIII (udajeOprijmoch).
 * Returns Map<countryCode, prijmyString> for rows with non-empty kodStatu.
 */
function parseDividendsByCountryFromXml(xml: string): Map<string, string> {
  const parsed = xmljs.xml2js(xml, { compact: true }) as { dokument?: { telo?: { osobitneZaznamy?: { udajeOprijmoch?: unknown } } } };
  const udaje = parsed?.dokument?.telo?.osobitneZaznamy?.udajeOprijmoch;
  const rows = udaje == null ? [] : Array.isArray(udaje) ? udaje : [udaje];
  const byCountry = new Map<string, string>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const kodStatu = text(r.kodStatu);
    const prijmy = text(r.prijmy);
    if (kodStatu) byCountry.set(kodStatu, prijmy);
  }
  return byCountry;
}

/** Expected EUR sum per country from form entries (using amountEur or dividendToEur). */
function expectedDividendsByCountry(form: TaxFormData): Map<string, string> {
  const { entries, ecbRate, czkRate } = form.dividends;
  const byCountry: Record<string, number> = {};
  for (const entry of entries) {
    const code = entry.country || '840';
    const amountEur =
      entry.amountEur && Number(entry.amountEur) > 0
        ? entry.amountEur
        : dividendToEur(entry.amountOriginal, entry.currency ?? 'USD', ecbRate, czkRate);
    const n = parseFloat(amountEur) || 0;
    byCountry[code] = (byCountry[code] ?? 0) + n;
  }
  const out = new Map<string, string>();
  for (const [code, sum] of Object.entries(byCountry)) {
    out.set(code, sum.toFixed(2));
  }
  return out;
}

const CSV_PATH = path.resolve(__dirname, '../tmp/sample-dividends.csv');

describe('Real CSV import and XML export', () => {
  it('parses tmp CSV and XML contains Príloha č.2 and Oddiel XIII dividend data', () => {
    if (!existsSync(CSV_PATH)) {
      console.warn('Skip: tmp/sample-dividends.csv not found');
      return;
    }
    const csv = readFileSync(CSV_PATH, 'utf-8');
    const entries = parseIbkrDividendCsv(csv);
    expect(entries.length).toBeGreaterThan(0);

    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Test',
        meno: 'User',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: false },
      dividends: {
        enabled: true,
        ecbRate: '1.13',
        ecbRateOverride: false,
        czkRate: '25.21',
        czkRateOverride: false,
        entries,
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);

    expect(calc.pril2_pr1).not.toBe('0');
    expect(calc.pril2_pr1).not.toBe('');
    expect(xml).toContain('pril2PodielyNaZisku');
    expect(xml).toContain('<pr1>');
    expect(xml).toContain('osobitneZaznamy');
    expect(xml).toContain('<uvadza>1</uvadza>');
    expect(xml).toContain('<prijmy>');
  });

  it('parsed entries match expected counts and structure from sample CSV', () => {
    if (!existsSync(CSV_PATH)) return;
    const csv = readFileSync(CSV_PATH, 'utf-8');
    const entries = parseIbkrDividendCsv(csv);
    expect(entries.length).toBeGreaterThan(0);
    const byTicker = Object.fromEntries(entries.map((e) => [e.ticker, e]));
    // Country codes and non-empty amounts only (no real values asserted)
    expect(byTicker.MC?.country).toBe('250');
    expect(parseFloat(byTicker.MC?.amountOriginal ?? '0')).toBeGreaterThan(0);
    expect(parseFloat(byTicker.MC?.amountEur ?? '0')).toBeGreaterThan(0);
    expect(byTicker.GOOGL?.country).toBe('840');
    expect(parseFloat(byTicker.GOOGL?.amountOriginal ?? '0')).toBeGreaterThan(0);
    expect(parseFloat(byTicker.GOOGL?.amountEur ?? '0')).toBeGreaterThan(0);
  });

  it('exported XML contains dividends concatenated (summed) per country in Oddiel XIII', () => {
    if (!existsSync(CSV_PATH)) return;
    const csv = readFileSync(CSV_PATH, 'utf-8');
    const entries = parseIbkrDividendCsv(csv);
    const form = buildForm({
      personalInfo: {
        dic: '1234567890',
        priezvisko: 'Test',
        meno: 'User',
        titul: '',
        titulZa: '',
        ulica: 'Hlavná',
        cislo: '1',
        psc: '81101',
        obec: 'Bratislava',
        stat: 'Slovenská republika',
      },
      employment: { ...DEFAULT_TAX_FORM.employment, enabled: false },
      dividends: {
        enabled: true,
        ecbRate: '1.13',
        ecbRateOverride: false,
        czkRate: '25.21',
        czkRateOverride: false,
        entries,
      },
    });
    const calc = calculateTax(form);
    const xml = convertToXML(form, calc);

    const expected = expectedDividendsByCountry(form);
    const inXml = parseDividendsByCountryFromXml(xml);

    expect(inXml.size).toBeGreaterThan(0);
    for (const [countryCode, expectedPrijmy] of expected) {
      const xmlPrijmy = inXml.get(countryCode);
      expect(xmlPrijmy).toBeDefined();
      expect(xmlPrijmy).toBe(expectedPrijmy);
    }
  });
});
