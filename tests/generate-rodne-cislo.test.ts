/**
 * Tests for generateRodneCislo test utility.
 *
 * Verifies that generated rodné čísla are valid and that the age helpers
 * produce children of the right age for tax bonus scenarios.
 *
 * Run: npx vitest run tests/generate-rodne-cislo.test.ts
 */

import { describe, it, expect } from 'vitest';
import { generateRodneCislo, rodneCisloForAge, rodneCisloUnderAge, rodneCisloAtLeastAge } from './utils/generateRodneCislo';
import { validateRodneCislo } from '@/lib/utils/validateRodneCislo';
import { parseRodneCislo, ageAt, getMonthlyRates2025 } from '@/lib/rodneCislo';

describe('generateRodneCislo', () => {
  it('generates valid 10-digit rodné číslo', () => {
    const result = generateRodneCislo({ birthDate: new Date(2010, 6, 1), gender: 'MALE' });
    expect(result.pure).toMatch(/^\d{10}$/);
    expect(result.withDelimiter).toMatch(/^\d{6}\/\d{4}$/);
    expect(validateRodneCislo(result.pure).valid).toBe(true);
  });

  it('generates valid female rodné číslo (month + 50)', () => {
    const result = generateRodneCislo({ birthDate: new Date(2010, 6, 1), gender: 'FEMALE' });
    expect(validateRodneCislo(result.pure).valid).toBe(true);
    // Month should be 57 (July=7 + 50)
    const monthPart = parseInt(result.pure.substring(2, 4), 10);
    expect(monthPart).toBe(57);
  });

  it('generates 9-digit for pre-1954 dates', () => {
    const result = generateRodneCislo({ birthDate: new Date(1950, 5, 15), gender: 'MALE' });
    expect(result.pure).toMatch(/^\d{9}$/);
    expect(validateRodneCislo(result.pure).valid).toBe(true);
  });

  it('parseRodneCislo can read back the generated value', () => {
    const birthDate = new Date(2010, 6, 15); // July 15, 2010
    const result = generateRodneCislo({ birthDate, gender: 'MALE' });
    const parsed = parseRodneCislo(result.pure);
    expect(parsed).not.toBeNull();
    expect(parsed!.year).toBe(2010);
    expect(parsed!.month).toBe(7);
    expect(parsed!.day).toBe(15);
  });
});

describe('rodneCisloForAge', () => {
  it('kid turns 15 in July 2025 → age 14 Jan-Jun, age 15 Jul-Dec', () => {
    const rc = rodneCisloForAge({ turnsAge: 15, inMonth: 7, taxYear: 2025 });
    expect(validateRodneCislo(rc).valid).toBe(true);

    const birth = parseRodneCislo(rc)!;
    expect(birth.year).toBe(2010); // 2025 - 15

    // Verify age transitions
    expect(ageAt(birth, 2025, 1)).toBe(14); // Jan: not yet 15
    expect(ageAt(birth, 2025, 6)).toBe(14); // Jun: still 14
    expect(ageAt(birth, 2025, 7)).toBe(15); // Jul: turns 15
    expect(ageAt(birth, 2025, 12)).toBe(15); // Dec: still 15

    // Verify bonus rates
    const rates = getMonthlyRates2025(birth);
    expect(rates.slice(0, 6)).toEqual([100, 100, 100, 100, 100, 100]); // Jan-Jun: 100 EUR
    expect(rates.slice(6, 12)).toEqual([50, 50, 50, 50, 50, 50]); // Jul-Dec: 50 EUR
  });

  it('kid turns 18 in March 2025 → age 17 Jan-Feb, age 18 Mar-Dec', () => {
    const rc = rodneCisloForAge({ turnsAge: 18, inMonth: 3, taxYear: 2025 });
    const birth = parseRodneCislo(rc)!;
    expect(birth.year).toBe(2007); // 2025 - 18

    expect(ageAt(birth, 2025, 2)).toBe(17); // Feb: still 17
    expect(ageAt(birth, 2025, 3)).toBe(18); // Mar: turns 18

    const rates = getMonthlyRates2025(birth);
    expect(rates.slice(0, 2)).toEqual([50, 50]); // Jan-Feb: 50 EUR (15-17)
    expect(rates.slice(2, 12)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // Mar-Dec: 0 EUR (18+)
  });

  it('kid turns 15 in January 2025 → age 15 all year', () => {
    const rc = rodneCisloForAge({ turnsAge: 15, inMonth: 1, taxYear: 2025 });
    const birth = parseRodneCislo(rc)!;

    const rates = getMonthlyRates2025(birth);
    expect(rates).toEqual([50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]); // All year: 50 EUR
  });

  it('kid turns 15 in December 2025 → age 14 for 11 months, age 15 for Dec', () => {
    const rc = rodneCisloForAge({ turnsAge: 15, inMonth: 12, taxYear: 2025 });
    const birth = parseRodneCislo(rc)!;

    const rates = getMonthlyRates2025(birth);
    expect(rates.slice(0, 11)).toEqual([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]); // Jan-Nov: 100
    expect(rates[11]).toBe(50); // Dec: 50
  });
});

describe('rodneCisloUnderAge', () => {
  it('under 15 all year → 100 EUR every month', () => {
    const rc = rodneCisloUnderAge(15, 2025);
    const birth = parseRodneCislo(rc)!;

    const rates = getMonthlyRates2025(birth);
    expect(rates).toEqual(Array(12).fill(100));
  });

  it('under 18 all year → 50 EUR every month', () => {
    const rc = rodneCisloUnderAge(18, 2025);
    // This child turns 17 in Jan → is 17 all year
    const birth = parseRodneCislo(rc)!;
    expect(ageAt(birth, 2025, 1)).toBe(17);
    expect(ageAt(birth, 2025, 12)).toBe(17);

    const rates = getMonthlyRates2025(birth);
    expect(rates).toEqual(Array(12).fill(50));
  });
});

describe('rodneCisloAtLeastAge', () => {
  it('at least 15 all year → 50 EUR every month', () => {
    const rc = rodneCisloAtLeastAge(15, 2025);
    const birth = parseRodneCislo(rc)!;
    expect(ageAt(birth, 2025, 1)).toBe(15);

    const rates = getMonthlyRates2025(birth);
    expect(rates).toEqual(Array(12).fill(50));
  });

  it('at least 18 all year → 0 EUR every month', () => {
    const rc = rodneCisloAtLeastAge(18, 2025);
    const birth = parseRodneCislo(rc)!;
    expect(ageAt(birth, 2025, 1)).toBe(18);

    const rates = getMonthlyRates2025(birth);
    expect(rates).toEqual(Array(12).fill(0));
  });
});
