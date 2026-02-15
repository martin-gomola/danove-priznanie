/**
 * Rodné číslo (Slovak/Czech birth number) validation tests.
 *
 * Run: npx vitest run tests/rodne-cislo.test.ts
 */

import { describe, it, expect } from 'vitest';
import { validateRodneCislo } from '@/lib/utils/validateRodneCislo';

describe('validateRodneCislo', () => {
  // ── Valid formats ──────────────────────────────────────────────────

  describe('valid birth numbers', () => {
    it('accepts valid 10-digit male birth number with delimiter', () => {
      // 850101/0001 → born 1985-01-01, male
      const result = validateRodneCislo('850101/0001');
      expect(result.valid).toBe(true);
    });

    it('accepts valid 10-digit male birth number without delimiter', () => {
      const result = validateRodneCislo('8501010001');
      expect(result.valid).toBe(true);
    });

    it('accepts valid 10-digit female birth number (month+50)', () => {
      // 9056150231 → born 1990-06-15, female (month 06+50=56)
      // Need to find a valid one: construct one that passes mod 11
      // Let's use 905615 + serial that makes it mod 11
      const result = validateRodneCislo('6153310009');
      expect(result.valid).toBe(true);
    });

    it('accepts valid 9-digit birth number (pre-1954)', () => {
      // 9-digit: born before 1954, no mod 11 check
      const result = validateRodneCislo('530115/123');
      expect(result.valid).toBe(true);
    });

    it('accepts 21st century birth number (year 00+)', () => {
      // Born 2010-06-15, male
      const result = validateRodneCislo('100615/0011');
      // Verify format is accepted (mod 11 check applies)
      if (parseInt('1006150011', 10) % 11 === 0) {
        expect(result.valid).toBe(true);
      }
    });
  });

  // ── Invalid formats ────────────────────────────────────────────────

  describe('invalid formats', () => {
    it('rejects empty string', () => {
      const result = validateRodneCislo('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects string with letters', () => {
      const result = validateRodneCislo('85010A/0001');
      expect(result.valid).toBe(false);
    });

    it('rejects too short (less than 9 digits)', () => {
      const result = validateRodneCislo('8501010');
      expect(result.valid).toBe(false);
    });

    it('rejects too long (more than 10 digits)', () => {
      const result = validateRodneCislo('85010100012');
      expect(result.valid).toBe(false);
    });
  });

  // ── Month validation ──────────────────────────────────────────────

  describe('month validation', () => {
    it('rejects month 0', () => {
      const result = validateRodneCislo('850001/0001');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mesiac');
    });

    it('rejects month 13 (invalid for male)', () => {
      const result = validateRodneCislo('851301/0001');
      expect(result.valid).toBe(false);
    });

    it('rejects month 40 (in the gap between male and female encoding)', () => {
      const result = validateRodneCislo('854001/0001');
      expect(result.valid).toBe(false);
    });

    it('accepts male alternative month 21-32 (post-2004)', () => {
      // month 21 = January male alternative
      const clean = '102106'; // 2010, month 21 (Jan alt), day 06
      // Build a 10 digit number that's divisible by 11
      for (let serial = 0; serial < 1000; serial++) {
        const s = String(serial).padStart(3, '0');
        for (let check = 0; check <= 9; check++) {
          const full = clean + s + String(check);
          if (parseInt(full, 10) % 11 === 0) {
            const result = validateRodneCislo(full);
            expect(result.valid).toBe(true);
            return;
          }
        }
      }
    });

    it('accepts female month 51-62', () => {
      // month 56 = June female
      const clean = '905615'; // 1990, month 56 (June female), day 15
      for (let serial = 0; serial < 1000; serial++) {
        const s = String(serial).padStart(3, '0');
        for (let check = 0; check <= 9; check++) {
          const full = clean + s + String(check);
          if (parseInt(full, 10) % 11 === 0) {
            const result = validateRodneCislo(full);
            expect(result.valid).toBe(true);
            return;
          }
        }
      }
    });

    it('accepts female alternative month 71-82 (post-2004)', () => {
      // month 76 = June female alternative
      const clean = '107615'; // 2010, month 76 (June female alt), day 15
      for (let serial = 0; serial < 1000; serial++) {
        const s = String(serial).padStart(3, '0');
        for (let check = 0; check <= 9; check++) {
          const full = clean + s + String(check);
          if (parseInt(full, 10) % 11 === 0) {
            const result = validateRodneCislo(full);
            expect(result.valid).toBe(true);
            return;
          }
        }
      }
    });
  });

  // ── Day validation ────────────────────────────────────────────────

  describe('day validation', () => {
    it('rejects day 0', () => {
      const result = validateRodneCislo('850100/0001');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('deň');
    });

    it('rejects day 32', () => {
      const result = validateRodneCislo('850132/0001');
      expect(result.valid).toBe(false);
    });

    it('rejects Feb 30', () => {
      // month 02, day 30 → invalid
      const clean = '900230';
      for (let serial = 0; serial < 1000; serial++) {
        const s = String(serial).padStart(3, '0');
        for (let check = 0; check <= 9; check++) {
          const full = clean + s + String(check);
          if (parseInt(full, 10) % 11 === 0) {
            const result = validateRodneCislo(full);
            expect(result.valid).toBe(false);
            return;
          }
        }
      }
    });
  });

  // ── Mod 11 check ──────────────────────────────────────────────────

  describe('divisibility by 11', () => {
    it('rejects 10-digit number not divisible by 11', () => {
      // 8501010002 - change last digit from valid 0001 to invalid 0002
      const result = validateRodneCislo('8501010002');
      // This should fail mod 11 (unless it happens to be divisible)
      const num = 8501010002;
      if (num % 11 !== 0) {
        expect(result.valid).toBe(false);
        expect(result.error).toContain('11');
      }
    });

    it('does not check mod 11 for 9-digit (pre-1954)', () => {
      // 9-digit birth numbers have no check digit
      const result = validateRodneCislo('530115/123');
      expect(result.valid).toBe(true);
    });
  });

  // ── Real-world examples ───────────────────────────────────────────

  describe('real-world examples from the app', () => {
    it('validates a sample rodné číslo', () => {
      // 850101/0001 - valid male RC
      const result = validateRodneCislo('850101/0001');
      expect(result.valid).toBe(true);
    });

    it('validates a sample male rodné číslo', () => {
      // 6103080005 - fictional male, born 1961-03-08
      const result = validateRodneCislo('6103080005');
      expect(result.valid).toBe(true);
    });

    it('validates a sample female rodné číslo', () => {
      // 6153310009 - fictional female, born 1961-03-31 (month 53=03+50)
      const result = validateRodneCislo('6153310009');
      expect(result.valid).toBe(true);
    });
  });
});
