/**
 * Parse IBKR dividend CSV export into DividendEntry[] for the tax form.
 * Only processes DividendDetail,Data,Summary rows (skips RevenueComponent and Total).
 * Aggregates multiple rows per ticker/country into a single entry.
 */

import type { DividendEntry } from '@/types/TaxForm';
import { findCountryByCode } from '@/lib/countries';
import { alpha2ToNumeric } from './countryMapping';

const PREFIX = 'DividendDetail,Data,Summary,';

/** Max CSV length to avoid excessive memory/CPU. IBKR dividend exports are typically small. */
const MAX_CSV_LENGTH = 600 * 1024; // 600 KB

function parseNum(s: string): number {
  const n = parseFloat(s?.replace(/,/g, '').trim() || '0');
  return Number.isFinite(n) ? n : 0;
}

/** Currency from CSV (EUR, USD) maps to our type; default USD for unknown */
function toCurrency(currency: string): 'USD' | 'EUR' | 'CZK' {
  const u = currency?.trim().toUpperCase();
  if (u === 'EUR') return 'EUR';
  if (u === 'CZK') return 'CZK';
  return 'USD';
}

/**
 * Parse IBKR dividend CSV text into DividendEntry[].
 * Returns [] if csvText exceeds 600 KB.
 * Columns: DividendDetail,Data,Summary,Currency,Symbol,Conid,Country,...,Gross,GrossInBase,GrossInUSD,Withhold,WithholdInBase,WithholdInUSD
 * Indices:  0           1  2       3        4      5     6      7..11    12    13          14         15      16            17
 */
export function parseIbkrDividendCsv(csvText: string): DividendEntry[] {
  if (csvText.length > MAX_CSV_LENGTH) return [];
  const lines = csvText.split(/\r?\n/);
  const aggregated = new Map<string, { gross: number; grossBase: number; withhold: number; withholdBase: number; currency: string; countryAlpha2: string }>();

  for (const line of lines) {
    if (!line.startsWith(PREFIX)) continue;
    const parts = line.split(',');
    if (parts.length < 18) continue;

    const currency = parts[3]?.trim() || 'USD';
    const symbol = parts[4]?.trim() || '';
    const countryAlpha2 = parts[6]?.trim() || 'US';
    const gross = parseNum(parts[12]);
    const grossBase = parseNum(parts[13]);
    const withhold = parseNum(parts[15]); // may be negative
    const withholdBase = parseNum(parts[16]);

    if (!symbol) continue;

    const key = `${symbol}|${countryAlpha2}|${currency}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.gross += gross;
      existing.grossBase += grossBase;
      existing.withhold += withhold;
      existing.withholdBase += withholdBase;
    } else {
      aggregated.set(key, { gross, grossBase, withhold, withholdBase, currency, countryAlpha2 });
    }
  }

  const entries: DividendEntry[] = [];
  for (const [key, v] of aggregated) {
    const [ticker] = key.split('|');
    const countryNumeric = alpha2ToNumeric(v.countryAlpha2);
    const country = findCountryByCode(countryNumeric);
    const currency = toCurrency(v.currency);
    const amountOriginal = Math.abs(v.gross).toFixed(2);
    const amountEur = Math.abs(v.grossBase).toFixed(2);
    const withheldTaxOriginal = Math.abs(v.withhold).toFixed(2);
    const withheldTaxEur = Math.abs(v.withholdBase).toFixed(2);

    entries.push({
      id: crypto.randomUUID(),
      ticker,
      country: countryNumeric,
      countryName: country?.name ?? v.countryAlpha2,
      currency,
      amountOriginal,
      amountEur,
      withheldTaxOriginal,
      withheldTaxEur,
    });
  }

  return entries;
}
