/**
 * Convert dividend amount in original currency to EUR for tax form and XML.
 * Used when amountEur is missing (e.g. after 1042-S import) so Príloha č.2 and Oddiel XIII get correct values.
 */

import { safeDecimal } from './decimal';

/**
 * Rate for EUR is 1; for USD use ecbRate, for CZK use czkRate, for PLN use plnRate.
 * EUR amount = amountOriginal / rate.
 */
export function dividendToEur(
  amountOriginal: string,
  currency: 'USD' | 'EUR' | 'CZK' | 'PLN',
  ecbRate: string,
  czkRate: string,
  plnRate: string = '4.2397',
): string {
  const amount = safeDecimal(amountOriginal);
  if (amount.isZero()) return '0.00';
  const rate =
    currency === 'EUR'
      ? 1
      : currency === 'CZK'
        ? (parseFloat(czkRate) || 1)
        : currency === 'PLN'
          ? (parseFloat(plnRate) || 1)
          : (parseFloat(ecbRate) || 1);
  if (!rate) return '0.00';
  return amount.div(rate).toDecimalPlaces(2).toFixed(2);
}
