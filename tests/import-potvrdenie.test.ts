import { describe, expect, it } from 'vitest';
import { parsePotvrdenieFromText } from '../src/lib/import/parsePotvrdenie';

const CANONICAL_TEXT = `
Potvrdenie o zdaniteľných príjmoch
II. oddiel
01 Úhrn príjmov 32 400,00
01a Príjmy z dohôd 0,00
02 Povinné poistné 4 341,60
03 Základ dane 28 058,40
04 Preddavky na daň 3 648,00
04a Preddavky na daň z dohôd 0,00
III. oddiel
`;

const OCRISH_TEXT = `
Potvrdenie o zdaniteľných príjmoch
II. oddiel
01
Úhrn príjmov zo závislej činnosti
32400,00

02
Povinné poistné
4341,60

03
28058,40

04
Preddavky na daň
3648,00
Poučenie
`;

describe('parsePotvrdenieFromText', () => {
  it('extracts employment rows from a canonical yearly statement', () => {
    const result = parsePotvrdenieFromText(CANONICAL_TEXT);

    expect(result.employment.enabled).toBe(true);
    expect(result.employment.r36).toBe('32400.00');
    expect(result.employment.r36a).toBe('0.00');
    expect(result.employment.r37).toBe('4341.60');
    expect(result.employment.r131).toBe('3648.00');
    expect(result.employment.r131Dohody).toBe('0.00');
    expect(result.diagnostics.crossCheckMatches).toBe(true);
  });

  it('handles OCR-style documents with row number and amount on separate lines', () => {
    const result = parsePotvrdenieFromText(OCRISH_TEXT);

    expect(result.employment.enabled).toBe(true);
    expect(result.employment.r36).toBe('32400.00');
    expect(result.employment.r37).toBe('4341.60');
    expect(result.employment.r131).toBe('3648.00');
    expect(result.employment.r36a).toBe('0.00');
    expect(result.employment.r131Dohody).toBe('');
    expect(result.diagnostics.documentR38).toBe('28058.40');
    expect(result.diagnostics.computedR38).toBe('28058.40');
    expect(result.diagnostics.crossCheckMatches).toBe(true);
  });

  it('reports missing required fields when the document is incomplete', () => {
    const result = parsePotvrdenieFromText(`
      II. oddiel
      01 Úhrn príjmov 1200,00
      03 Základ dane 1000,00
    `);

    expect(result.employment.enabled).toBe(false);
    expect(result.diagnostics.missingRequiredFields).toEqual(['r37', 'r131']);
    expect(result.diagnostics.crossCheckMatches).toBe(null);
  });
});
