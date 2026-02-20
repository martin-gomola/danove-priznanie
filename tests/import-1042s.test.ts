import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse1042sFromText, parse1042sPdf } from '../src/lib/import/parse1042s';

/** Synthetic 1042-S form text for tests only. Income code 06, gross 100.00, withholding 25.00. */
const SAMPLE_1042S_TEXT = `
Form 1042-S
Department of the Treasury
Internal Revenue Service
Foreign Person's U.S. Source Income Subject to Withholding 2024
1 Income
code
06
2 Gross income
100.00
3 Chapter indicator. Enter "3" or "4" 3
7a Federal tax withheld 0.00
8 Tax withheld by other agents 25.00
10 Total withholding credit (combine boxes 7a, 8, and 9)
25.00
13a Recipient's name
Test Recipient
13b Recipient's country code
XX
`;

describe('parse1042sFromText', () => {
  it('extracts single US dividend entry from 1042-S text', () => {
    const entry = parse1042sFromText(SAMPLE_1042S_TEXT);
    expect(entry).not.toBeNull();
    expect(entry!.country).toBe('840');
    expect(entry!.countryName).toBe('USA');
    expect(entry!.currency).toBe('USD');
    expect(entry!.amountOriginal).toBe('100.00');
    expect(entry!.withheldTaxOriginal).toBe('15.00'); // 15% US treaty rate
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
10.00
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
    const big = '1 Income code\n06\n2 Gross income\n100.00\n10 Total withholding credit\n25.00\n' + 'x'.repeat(600 * 1024);
    expect(parse1042sFromText(big)).toBeNull();
  });

  it('extracts from Schwab-style 1042-S (data block after Copy B)', () => {
    /** Synthetic data block: first value = gross (200), positions 5–6 = withholding (30.00). */
    const schwabStyle = `
Form 1042-S (2024)
Copy B for Recipient
Some header
200
06
00
0
00
30
00
00-0000000
BROKER NAME
`;
    const entry = parse1042sFromText(schwabStyle);
    expect(entry).not.toBeNull();
    expect(entry!.country).toBe('840');
    expect(entry!.amountOriginal).toBe('200.00'); // Box 2 gross = first value
    expect(entry!.withheldTaxOriginal).toBe('30.00'); // 15% of 200
  });

  it('parses Schwab 1042-S PDF when file exists (structure only, no amount assertions)', async () => {
    const pdfPath = join(process.cwd(), 'tmp', '2025-03-25 - schwab-1042.pdf');
    if (!existsSync(pdfPath)) return;
    const buffer = readFileSync(pdfPath);
    const entry = await parse1042sPdf(buffer);
    expect(entry).not.toBeNull();
    expect(entry!.country).toBe('840');
    expect(entry!.currency).toBe('USD');
    expect(entry!.amountOriginal).toMatch(/^\d+(\.\d{2})?$/);
    expect(entry!.withheldTaxOriginal).toMatch(/^\d+(\.\d{2})?$/);
  });
});
