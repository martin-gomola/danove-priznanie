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

/** Sum a field across an array of items, returning Decimal. Invalid values are treated as 0. */
export function sumDecimal<T>(items: T[], accessor: (item: T) => string | undefined): Decimal {
  return items.reduce((sum, item) => {
    try {
      return sum.plus(new Decimal(accessor(item) || '0'));
    } catch {
      return sum;
    }
  }, new Decimal(0));
}

/** Returns 'Povinné pole' when showErrors is true and the value is empty/falsy, undefined otherwise. */
export function requiredError(showErrors: boolean, value: string | undefined | null): string | undefined {
  return showErrors && !value ? 'Povinné pole' : undefined;
}
