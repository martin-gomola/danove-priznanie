/**
 * Parse IRS Form 1042-S (Foreign Person's U.S. Source Income Subject to Withholding)
 * PDF or text into a single aggregate US dividend DividendEntry.
 * Box 1 = income code (06 = dividends), Box 2 = gross income (USD), Box 10 = total withholding (USD).
 */

import type { DividendEntry } from '@/types/TaxForm';
import { findCountryByCode } from '@/lib/countries';

const INCOME_CODE_DIVIDENDS = '06';

/** Max length of extracted PDF/text to avoid expensive regex on huge input. 1042-S forms are small. */
const MAX_1042S_TEXT_LENGTH = 600 * 1024; // 600 KB

/** Extract gross income (box 2) and total withholding credit (box 10) from 1042-S text */
function extract1042sValues(text: string): { gross: number; withheld: number; isDividends: boolean } {
  const normalized = text.replace(/\r\n/g, '\n');
  let gross = 0;
  let withheld = 0;
  let isDividends = false;

  // Box 1: Income code (06 = dividends)
  if (/\b06\b/.test(normalized) || /Income\s*code\s*06/.test(normalized)) {
    isDividends = true;
  }

  // Box 2: Gross income
  const grossMatch = normalized.match(/2\s+Gross\s+income\s*\n\s*(\d+\.?\d*)/i)
    ?? normalized.match(/Gross\s+income\s*\n\s*(\d+\.?\d*)/i);
  if (grossMatch) {
    gross = parseFloat(grossMatch[1]) || 0;
  }

  // Box 10: Total withholding credit
  const withholdMatch = normalized.match(/10\s+Total\s+withholding\s+credit[\s\S]*?\n\s*(\d+\.?\d*)/i)
    ?? normalized.match(/Total\s+withholding\s+credit[\s\S]*?\n\s*(\d+\.?\d*)/i);
  if (withholdMatch) {
    withheld = parseFloat(withholdMatch[1]) || 0;
  }

  return { gross, withheld, isDividends };
}

/**
 * Parse 1042-S text content into a single US dividend entry.
 * Returns null if no valid dividend data (missing gross or not income code 06), or if text exceeds 600 KB.
 */
export function parse1042sFromText(text: string): DividendEntry | null {
  if (text.length > MAX_1042S_TEXT_LENGTH) return null;
  const { gross, withheld, isDividends } = extract1042sValues(text);
  if (!isDividends || gross <= 0) return null;

  const country = findCountryByCode('840');
  return {
    id: crypto.randomUUID(),
    ticker: 'US',
    country: '840',
    countryName: country?.name ?? 'USA',
    currency: 'USD',
    amountOriginal: gross.toFixed(2),
    amountEur: '', // caller or UI can convert using ecbRate
    withheldTaxOriginal: withheld.toFixed(2),
    withheldTaxEur: '', // caller or UI can convert using ecbRate
  };
}

/**
 * Parse 1042-S PDF buffer into a single US dividend entry.
 * Uses pdf-parse to extract text, then parse1042sFromText.
 */
export async function parse1042sPdf(buffer: Buffer): Promise<DividendEntry | null> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  const text = data?.text ?? '';
  return parse1042sFromText(text);
}
