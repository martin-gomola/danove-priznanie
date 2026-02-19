import { describe, it, expect } from 'vitest';
import { parse1042sFromText } from '../src/lib/import/parse1042s';

/** Sample 1042-S form text (Copy B page) - income code 06, gross 32.00, withholding 5.00 */
const SAMPLE_1042S_TEXT = `
Form 1042-S
Department of the Treasury
Internal Revenue Service
Foreign Person's U.S. Source Income Subject to Withholding 2024
1 Income
code
06
2 Gross income
32.00
3 Chapter indicator. Enter "3" or "4" 3
7a Federal tax withheld 0.00
8 Tax withheld by other agents 5.00
10 Total withholding credit (combine boxes 7a, 8, and 9)
5.00
13a Recipient's name
Recipient Name
13b Recipient's country code
LO
`;

describe('parse1042sFromText', () => {
  it('extracts single US dividend entry from 1042-S text', () => {
    const entry = parse1042sFromText(SAMPLE_1042S_TEXT);
    expect(entry).not.toBeNull();
    expect(entry!.country).toBe('840');
    expect(entry!.countryName).toBe('USA');
    expect(entry!.currency).toBe('USD');
    expect(entry!.amountOriginal).toBe('32.00');
    expect(entry!.withheldTaxOriginal).toBe('5.00');
    expect(entry!.ticker).toBe('US');
  });

  it('returns entry with empty amountEur and withheldTaxEur for client conversion', () => {
    const entry = parse1042sFromText(SAMPLE_1042S_TEXT);
    expect(entry!.amountEur).toBe('');
    expect(entry!.withheldTaxEur).toBe('');
  });

  it('assigns a valid UUID id', () => {
    const entry = parse1042sFromText(SAMPLE_1042S_TEXT);
    expect(entry!.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('returns null when gross income is missing', () => {
    const noGross = `
Form 1042-S
1 Income code
06
10 Total withholding credit (combine boxes 7a, 8, and 9)
5.00
`;
    const entry = parse1042sFromText(noGross);
    expect(entry).toBeNull();
  });

  it('returns null when income code is not 06 (dividends)', () => {
    const interest = `
Form 1042-S
1 Income code
01
2 Gross income
100.00
10 Total withholding credit
30.00
`;
    const entry = parse1042sFromText(interest);
    expect(entry).toBeNull();
  });

  it('returns null for empty or irrelevant text', () => {
    expect(parse1042sFromText('')).toBeNull();
    expect(parse1042sFromText('Random document with no 1042-S fields')).toBeNull();
  });

  it('returns null when text exceeds 600 KB', () => {
    const big = '1 Income code\n06\n2 Gross income\n32.00\n10 Total withholding credit\n5.00\n' + 'x'.repeat(600 * 1024);
    expect(parse1042sFromText(big)).toBeNull();
  });
});
