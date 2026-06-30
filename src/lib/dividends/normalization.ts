import Decimal from 'decimal.js';
import type { DividendEntry, ForeignDividends } from '@/types/TaxForm';
import { dividendToEur } from '@/lib/utils/dividendEur';
import { safeDecimal } from '@/lib/utils/decimal';

export type DividendCurrency = DividendEntry['currency'];

export interface DividendIncomeSummary {
  entries: DividendEntry[];
  totalDividendsEur: Decimal;
  totalWithheldTaxEur: Decimal;
  countryBreakdown: DividendCountryBreakdownEntry[];
}

export interface DividendCountryBreakdownEntry {
  countryCode: string;
  amountEur: string;
}

export interface NormalizeDividendOptions {
  preferExistingEur?: boolean;
}

function eurAmount(amountOriginal: string, currency: DividendCurrency, ecbRate: string, czkRate: string, plnRate: string): string {
  if (currency === 'EUR') return safeDecimal(amountOriginal).toDecimalPlaces(2).toFixed(2);
  return dividendToEur(amountOriginal, currency, ecbRate, czkRate, plnRate);
}

export function normalizeDividendEntry(
  entry: DividendEntry,
  rates: Pick<ForeignDividends, 'ecbRate' | 'czkRate' | 'plnRate'>,
  options: NormalizeDividendOptions = {},
): DividendEntry {
  const currency = entry.currency ?? 'USD';
  const preferExistingEur = options.preferExistingEur ?? true;
  const amountEur = preferExistingEur && safeDecimal(entry.amountEur).gt(0)
    ? safeDecimal(entry.amountEur).toDecimalPlaces(2).toFixed(2)
    : eurAmount(entry.amountOriginal, currency, rates.ecbRate, rates.czkRate, rates.plnRate);
  const withheldTaxEur = preferExistingEur && safeDecimal(entry.withheldTaxEur).gt(0)
    ? safeDecimal(entry.withheldTaxEur).toDecimalPlaces(2).toFixed(2)
    : eurAmount(entry.withheldTaxOriginal, currency, rates.ecbRate, rates.czkRate, rates.plnRate);

  return {
    ...entry,
    currency,
    amountEur,
    withheldTaxEur,
  };
}

export function normalizeDividendEntries(
  entries: DividendEntry[],
  rates: Pick<ForeignDividends, 'ecbRate' | 'czkRate' | 'plnRate'>,
  options: NormalizeDividendOptions = {},
): DividendEntry[] {
  return entries.map((entry) => normalizeDividendEntry(entry, rates, options));
}

export function reconcileForeignDividends(dividends: ForeignDividends): ForeignDividends {
  if (!dividends.entries.length) return dividends;
  const normalizedEntries = normalizeDividendEntries(dividends.entries, dividends, { preferExistingEur: false });
  const changed = dividends.entries.some((entry, index) => {
    const normalized = normalizedEntries[index];
    return entry.currency !== normalized.currency
      || entry.amountEur !== normalized.amountEur
      || entry.withheldTaxEur !== normalized.withheldTaxEur;
  });
  return changed ? { ...dividends, entries: normalizedEntries } : dividends;
}

export function summarizeDividendIncome(dividends: ForeignDividends): DividendIncomeSummary {
  const entries = normalizeDividendEntries(dividends.entries, dividends, { preferExistingEur: false });
  let totalDividendsEur = new Decimal(0);
  let totalWithheldTaxEur = new Decimal(0);
  const byCountry = new Map<string, Decimal>();

  if (dividends.enabled) {
    for (const entry of entries) {
      const amountEur = safeDecimal(entry.amountEur);
      const withheldTaxEur = safeDecimal(entry.withheldTaxEur);
      totalDividendsEur = totalDividendsEur.plus(amountEur);
      totalWithheldTaxEur = totalWithheldTaxEur.plus(withheldTaxEur);

      const countryCode = entry.country || '840';
      byCountry.set(countryCode, (byCountry.get(countryCode) ?? new Decimal(0)).plus(amountEur));
    }
  }

  return {
    entries,
    totalDividendsEur,
    totalWithheldTaxEur,
    countryBreakdown: Array.from(byCountry.entries()).map(([countryCode, amount]) => ({
      countryCode,
      amountEur: amount.toDecimalPlaces(2).toFixed(2),
    })),
  };
}
