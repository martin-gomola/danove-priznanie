/**
 * Generate valid Slovak rodné číslo for test scenarios.
 *
 * Key use case: "give me a kid that turns 15 in July of tax year 2025"
 * → generateRodneCislo({ birthDate: new Date(2010, 6, 1), gender: 'MALE' })
 *
 * Or with the helper:
 * → rodneCisloForAge({ turnsAge: 15, inMonth: 7, taxYear: 2025 })
 *
 * Inspired by: slovensko-digital/priznanie-digital PR #1070
 */

export type Gender = 'MALE' | 'FEMALE';

export interface GenerateOptions {
  /** Exact birth date */
  birthDate: Date;
  /** Gender (affects month encoding: female = month + 50) */
  gender?: Gender;
}

/**
 * Generate a valid 10-digit rodné číslo for a given birth date.
 * Format: YYMMDDXXXX where the 10-digit number is divisible by 11.
 *
 * Returns both "850101/0001" and "8501010001" formats.
 */
export function generateRodneCislo(options: GenerateOptions): {
  withDelimiter: string;
  pure: string;
} {
  const { birthDate, gender = 'MALE' } = options;
  const fullYear = birthDate.getFullYear();
  const yearPart = String(fullYear).substring(2).padStart(2, '0');

  let month = birthDate.getMonth() + 1; // 1-based
  if (gender === 'FEMALE') {
    month += 50;
  }

  const day = birthDate.getDate();
  const datePart = yearPart + String(month).padStart(2, '0') + String(day).padStart(2, '0');

  // For pre-1954: 9-digit format (no check digit)
  if (fullYear < 1954) {
    const serial = String(Math.floor(Math.random() * 900) + 100); // 3-digit serial 100-999
    const birthId = datePart + serial;
    return {
      pure: birthId,
      withDelimiter: birthId.substring(0, 6) + '/' + birthId.substring(6),
    };
  }

  // For 1954+: 10-digit format, must be divisible by 11
  for (let serial = 0; serial < 1000; serial++) {
    const serialStr = String(serial).padStart(3, '0');
    const firstNine = datePart + serialStr;
    const checkDigit = calculateCheckDigit(firstNine, fullYear);
    if (checkDigit !== null) {
      const birthId = firstNine + checkDigit;
      return {
        pure: birthId,
        withDelimiter: birthId.substring(0, 6) + '/' + birthId.substring(6),
      };
    }
  }

  // Fallback (should never happen)
  throw new Error(`Could not generate valid rodné číslo for date ${birthDate.toISOString()}`);
}

/**
 * Calculate check digit so the full 10-digit number is divisible by 11.
 * Returns null if this serial can't produce a valid check digit.
 */
function calculateCheckDigit(nineDigits: string, year: number): string | null {
  const num = parseInt(nineDigits, 10);
  const remainder = (num * 10) % 11;

  if (remainder === 0) return '0';

  const checkDigit = 11 - remainder;

  if (checkDigit === 10) {
    // Special case: 1954-1985 allows using 0 when check digit would be 10
    if (year >= 1954 && year <= 1985) return '0';
    return null; // Need different serial
  }

  return String(checkDigit);
}

// ═══════════════════════════════════════════════════════════════════════
// Convenience helpers for tax test scenarios
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate rodné číslo for a child that turns `turnsAge` in `inMonth` of `taxYear`.
 *
 * This is the key helper for child bonus tests:
 * - ageAt uses birth.month to determine age in each month
 * - If birth.month > currentMonth → age is one less (hasn't had birthday yet)
 * - If birth.month <= currentMonth → child has "turned" that age
 *
 * @example
 * // Kid turns 15 in July 2025 → born July 2010
 * // Jan-Jun: age 14 → 100 EUR, Jul-Dec: age 15 → 50 EUR
 * rodneCisloForAge({ turnsAge: 15, inMonth: 7, taxYear: 2025 })
 *
 * // Kid under 15 all year → born Jan 2012 (turns 13 in Jan 2025)
 * rodneCisloForAge({ turnsAge: 13, inMonth: 1, taxYear: 2025 })
 *
 * // Kid turns 18 in March 2025 → born March 2007
 * // Jan-Feb: age 17 → 50 EUR, Mar-Dec: age 18 → 0 EUR
 * rodneCisloForAge({ turnsAge: 18, inMonth: 3, taxYear: 2025 })
 */
export function rodneCisloForAge(opts: {
  turnsAge: number;
  inMonth: number; // 1-12
  taxYear?: number;
  gender?: Gender;
}): string {
  const { turnsAge, inMonth, taxYear = 2025, gender = 'MALE' } = opts;
  const birthYear = taxYear - turnsAge;
  // Born on 1st of the target month
  const birthDate = new Date(birthYear, inMonth - 1, 1);
  return generateRodneCislo({ birthDate, gender }).pure;
}

/**
 * Generate rodné číslo for a child that stays under `age` all year.
 * Born in January of (taxYear - age + 1), so they turn `age - 1` in Jan
 * and remain under `age` for all 12 months.
 *
 * @example
 * // Under 15 all year (born Jan 2011, turns 14 in Jan 2025)
 * rodneCisloUnderAge(15, 2025) → child is 14 all year → 100 EUR/month
 */
export function rodneCisloUnderAge(age: number, taxYear = 2025, gender: Gender = 'MALE'): string {
  return rodneCisloForAge({ turnsAge: age - 1, inMonth: 1, taxYear, gender });
}

/**
 * Generate rodné číslo for a child that is `age` or older all year.
 * Born in January of (taxYear - age), so they turned `age` in Jan
 * (or earlier) and stay >= age for all 12 months.
 *
 * @example
 * // 15+ all year (born Jan 2010, turns 15 in Jan 2025)
 * rodneCisloAtLeastAge(15, 2025) → child is 15 all year → 50 EUR/month
 */
export function rodneCisloAtLeastAge(age: number, taxYear = 2025, gender: Gender = 'MALE'): string {
  return rodneCisloForAge({ turnsAge: age, inMonth: 1, taxYear, gender });
}
