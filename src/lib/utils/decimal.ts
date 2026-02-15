import Decimal from 'decimal.js';

/** Safe Decimal parse — returns Decimal(0) for empty / invalid strings. */
export function safeDecimal(v: string | undefined | null): Decimal {
  try {
    return new Decimal(v || '0');
  } catch {
    return new Decimal(0);
  }
}

/** Format a numeric string for display in sk-SK locale with 2 fraction digits. */
export function fmtEur(v: string | undefined | null): string {
  try {
    const d = new Decimal(v || '0');
    return d.toNumber().toLocaleString('sk-SK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return '-';
  }
}
