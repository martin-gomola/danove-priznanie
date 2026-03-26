/**
 * Slovak rodné číslo (birth number) parser for tax form.
 * Format: YYMMDD or YYMMDD/XXXX (women have month + 50, e.g. 12 → 62).
 * Two-digit year is resolved against referenceYear (default tax year): among 19YY and 20YY that are
 * on or before referenceYear and not older than 120 years, the latest year wins (so 25 + 2025 → 2025, not 1925).
 */

import { TAX_YEAR } from '@/lib/tax/constants';

export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

export interface ParseRodneCisloOptions {
  /** Latest calendar year the birth may fall in (e.g. tax year). Defaults to TAX_YEAR. */
  referenceYear?: number;
}

/** Pick 19YY vs 20YY so modern children (e.g. 2024–2025) are not parsed as 1924–1925. */
function resolveBirthYearFromYy(yy: number, referenceYear: number): number | null {
  const minYear = referenceYear - 120;
  const c20 = 2000 + yy;
  const c19 = 1900 + yy;
  const candidates: number[] = [];
  if (c20 >= minYear && c20 <= referenceYear) candidates.push(c20);
  if (c19 >= minYear && c19 <= referenceYear) candidates.push(c19);
  if (candidates.length === 0) return null;
  return Math.max(...candidates);
}

/**
 * Parse rodné číslo into birth date. Returns null if invalid or empty.
 */
export function parseRodneCislo(rc: string, options?: ParseRodneCisloOptions): BirthDate | null {
  const referenceYear = options?.referenceYear ?? TAX_YEAR;
  const digits = rc.replace(/\s|\//g, '');
  if (digits.length < 6) return null;
  const yy = parseInt(digits.slice(0, 2), 10);
  let mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);
  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm > 50) mm -= 50;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = resolveBirthYearFromYy(yy, referenceYear);
  if (year === null) return null;
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
