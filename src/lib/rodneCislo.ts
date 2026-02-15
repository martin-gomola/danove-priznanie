/**
 * Slovak rodné číslo (birth number) parser for tax form.
 * Format: YYMMDD or YYMMDD/XXXX (women have month + 50, e.g. 12 → 62).
 * Year: 00-23 → 2000-2023, 24-99 → 1924-1999 (commonly used convention).
 */

export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Parse rodné číslo into birth date. Returns null if invalid or empty.
 */
export function parseRodneCislo(rc: string): BirthDate | null {
  const digits = rc.replace(/\s|\//g, '');
  if (digits.length < 6) return null;
  const yy = parseInt(digits.slice(0, 2), 10);
  let mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm > 50) mm -= 50;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = yy <= 23 ? 2000 + yy : 1900 + yy;
  if (year < 1900 || year > 2030) return null;
  return { year, month: mm, day: dd };
}

/**
 * Get age in full years at end of given month (for bonus eligibility that month).
 */
export function ageAt(birth: BirthDate, year: number, month: number): number {
  let age = year - birth.year;
  if (birth.month > month) age--;
  return Math.max(0, age);
}

/**
 * Get monthly bonus rate in EUR for 2025 rules: 100 (under 15), 50 (15-17), 0 (18+).
 */
export function getMonthlyBonusRateForAge(age: number): number {
  if (age < 15) return 100;
  if (age < 18) return 50;
  return 0;
}

/**
 * For a child with given birth date, return 12 rates (EUR) for months 1-12 of 2025.
 */
export function getMonthlyRates2025(birth: BirthDate): number[] {
  const rates: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const age = ageAt(birth, 2025, m);
    rates.push(getMonthlyBonusRateForAge(age));
  }
  return rates;
}
