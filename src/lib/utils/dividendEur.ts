/**
 * Convert dividend amount in original currency to EUR for tax form and XML.
 * Used when amountEur is missing (e.g. after 1042-S import) so Príloha č.2 and Oddiel XIII get correct values.
 */

import type { DividendCurrency, ForeignDividends } from '@/types/TaxForm';
import { safeDecimal } from './decimal';

type DividendRateSource = Pick<ForeignDividends, 'ecbRate' | 'czkRate' | 'plnRate'> & Partial<Pick<ForeignDividends, 'currencyRates'>>;

export function rateForDividendCurrency(currency: DividendCurrency, rates: DividendRateSource): string {
  if (currency === 'EUR') return '1';
  const mappedRate = rates.currencyRates?.[currency];
  if (mappedRate !== undefined) return mappedRate;
  if (currency === 'CZK') return rates.czkRate;
  if (currency === 'PLN') return rates.plnRate;
  if (currency === 'USD') return rates.ecbRate;
  return '';
}

/**
 * Rate is expressed as original currency units per 1 EUR.
 * EUR amount = amountOriginal / rate.
 */
export function dividendToEur(
  amountOriginal: string,
  currency: DividendCurrency,
  rates: DividendRateSource,
): string {
  const amount = safeDecimal(amountOriginal);
  if (amount.isZero()) return '0.00';
  const rate = parseFloat(rateForDividendCurrency(currency, rates));
  if (!Number.isFinite(rate) || rate <= 0) return '0.00';
  return amount.div(rate).toDecimalPlaces(2).toFixed(2);
}
