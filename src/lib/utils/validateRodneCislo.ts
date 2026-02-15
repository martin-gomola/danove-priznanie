/**
 * Slovak/Czech birth number (rodné číslo) validator.
 *
 * Format: YYMMDD/XXXX (10 digits) or YYMMDD/XXX (9 digits, pre-1954)
 * - Males: month 01-12 (or 21-32 for alternative post-2004)
 * - Females: month 51-62 (or 71-82 for alternative post-2004)
 * - Post-1953: full 10-digit number must be divisible by 11
 *   (exception 1954-1985: if remainder is 10, last digit may be 0)
 *
 * Inspired by: slovensko-digital/priznanie-digital PR #1070
 * Source: https://sk.wikipedia.org/wiki/Rodné_číslo
 */

export interface RodneCisloValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate a Slovak/Czech rodné číslo.
 * Accepts formats: "YYMMDDXXXX", "YYMMDD/XXXX", "YYMMDDXXX", "YYMMDD/XXX"
 */
export function validateRodneCislo(input: string): RodneCisloValidation {
  if (!input || input.trim() === '') {
    return { valid: false, error: 'Rodné číslo je povinné' };
  }

  // Strip delimiter and whitespace
  const clean = input.replace(/[\s/]/g, '');

  // Must be 9 or 10 digits
  if (!/^\d{9,10}$/.test(clean)) {
    return { valid: false, error: 'Rodné číslo musí mať 9 alebo 10 číslic' };
  }

  const isLong = clean.length === 10;

  // Parse date components
  const yearPart = parseInt(clean.substring(0, 2), 10);
  const monthPart = parseInt(clean.substring(2, 4), 10);
  const dayPart = parseInt(clean.substring(4, 6), 10);

  // Determine raw month (strip gender/alternative encoding)
  let rawMonth: number;
  if (monthPart >= 1 && monthPart <= 12) {
    rawMonth = monthPart; // male standard
  } else if (monthPart >= 21 && monthPart <= 32) {
    rawMonth = monthPart - 20; // male alternative (post-2004)
  } else if (monthPart >= 51 && monthPart <= 62) {
    rawMonth = monthPart - 50; // female standard
  } else if (monthPart >= 71 && monthPart <= 82) {
    rawMonth = monthPart - 70; // female alternative (post-2004)
  } else {
    return { valid: false, error: 'Neplatný mesiac v rodnom čísle' };
  }

  // Validate day (basic 1-31 check)
  if (dayPart < 1 || dayPart > 31) {
    return { valid: false, error: 'Neplatný deň v rodnom čísle' };
  }

  // Determine full year (9-digit = pre-1954, 10-digit could be 1954+ or 2000+)
  let fullYear: number;
  if (!isLong) {
    // 9-digit format: always 19XX
    fullYear = 1900 + yearPart;
    if (fullYear >= 1954) {
      return { valid: false, error: 'Rodné číslo pred rokom 1954 musí mať 9 číslic' };
    }
  } else {
    // 10-digit: could be 19XX or 20XX
    // Heuristic: if yearPart > current 2-digit year, likely 1900s; otherwise 2000s
    const currentYear2d = new Date().getFullYear() % 100;
    fullYear = yearPart <= currentYear2d ? 2000 + yearPart : 1900 + yearPart;
  }

  // Validate month/day more precisely
  const maxDay = new Date(fullYear, rawMonth, 0).getDate(); // last day of that month
  if (dayPart > maxDay) {
    return { valid: false, error: `Mesiac ${rawMonth} má max ${maxDay} dní` };
  }

  // Divisibility by 11 check (10-digit only)
  if (isLong) {
    const num = parseInt(clean, 10);
    const firstNine = parseInt(clean.substring(0, 9), 10);
    const lastDigit = parseInt(clean.substring(9), 10);

    const isDivisibleBy11 = num % 11 === 0;
    // Special case 1954-1985: if first 9 digits mod 11 == 10, last digit may be 0
    const isSpecialCase = fullYear >= 1954 && fullYear <= 1985 && firstNine % 11 === 10 && lastDigit === 0;

    if (!isDivisibleBy11 && !isSpecialCase) {
      return { valid: false, error: 'Rodné číslo nie je deliteľné 11' };
    }
  }

  return { valid: true };
}

/**
 * Return an inline error string for a rodné číslo field.
 * - Empty + showErrors  → 'Povinné pole'
 * - Non-empty + invalid → 'Neplatný formát'
 * - Otherwise           → undefined (no error)
 */
export function getRodneCisloError(
  value: string,
  showErrors: boolean,
): string | undefined {
  if (!value) return showErrors ? 'Povinné pole' : undefined;
  return validateRodneCislo(value).error ? 'Neplatný formát' : undefined;
}
