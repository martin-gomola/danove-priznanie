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

/**
 * Parse Schwab-style 1042-S data block. Values on separate lines in IRS box order.
 * When we have 12+ number lines: Box 10 (Total withholding credit) is at index 11 (single value) or 12–13 (pair).
 * Positions 5–6 are Box 3b (tax rate, e.g. 15%) in the full layout — we do not use them when 12+ lines exist.
 * When we have fewer than 12 lines (short variant), we use indices 5–6 as the withheld amount for that format.
 * Note: The withheld value returned here is only used for validation; the displayed amount is always 15% of gross.
 */
function extractSchwabDataBlock(text: string): { gross: number; withheld: number } | null {
  const afterCopyB = text.split(/Copy [BCD]\s+for Recipient/i)[1];
  if (!afterCopyB) return null;
  const lines = afterCopyB.split(/\r?\n/).map((s) => s.trim());
  const numberLines: string[] = [];
  for (const line of lines) {
    if (/^\d{1,4}$/.test(line)) numberLines.push(line);
    else if (numberLines.length >= 14) break;
  }
  if (numberLines.length < 7) return null;
  const firstAsGross = parseFloat(numberLines[0]);
  const secondThirdAsGross = parseFloat(`${numberLines[1]}.${numberLines[2] || '00'}`);
  const gross =
    firstAsGross >= 10 && firstAsGross <= 999999 && Number.isFinite(firstAsGross)
      ? firstAsGross
      : secondThirdAsGross;
  let withheld: number;
  if (numberLines.length >= 12) {
    const box10Single = parseFloat(numberLines[11]);
    const box10Pair = parseFloat(`${numberLines[12]}.${numberLines[13] || '00'}`);
    withheld = Number.isFinite(box10Single) && box10Single <= 99999 ? box10Single : box10Pair;
  } else {
    withheld = parseFloat(`${numberLines[5]}.${numberLines[6] || '00'}`);
  }
  if (!Number.isFinite(gross) || !Number.isFinite(withheld)) return null;
  return { gross, withheld };
}

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

  // Box 2: Gross income (standard: value on next line after label; require 2+ digits or decimal so "3" from "Chapter indicator" doesn't match)
  const grossMatch = normalized.match(/2\s+Gross\s+income\s*\n\s*(\d{2,}\.?\d*|\d+\.\d+)/i)
    ?? normalized.match(/Gross\s+income\s*\n\s*(\d{2,}\.?\d*|\d+\.\d+)/i);
  if (grossMatch) {
    gross = parseFloat(grossMatch[1]) || 0;
  }

  // Box 10: Total withholding credit
  const withholdMatch = normalized.match(/10\s+Total\s+withholding\s+credit[\s\S]*?\n\s*(\d+\.?\d*)/i)
    ?? normalized.match(/Total\s+withholding\s+credit[\s\S]*?\n\s*(\d+\.?\d*)/i);
  if (withholdMatch) {
    withheld = parseFloat(withholdMatch[1]) || 0;
  }

  // Schwab (and similar): values in a separate data block after "Copy B"; prefer block when present so we don't mix with template labels (e.g. "11  Tax paid")
  const schwab = extractSchwabDataBlock(normalized);
  const hasCopyB = /Copy\s+B[\s\S]*?for\s+Recipient/i.test(normalized) || normalized.includes('Copy B for Recipient');
  if (schwab && schwab.gross > 0 && hasCopyB) {
    gross = schwab.gross;
    withheld = schwab.withheld;
    if (!isDividends) isDividends = true;
  } else if (gross <= 0 || withheld <= 0) {
    if (schwab && schwab.gross > 0) {
      if (gross <= 0) gross = schwab.gross;
      if (withheld <= 0) withheld = schwab.withheld;
      if (!isDividends) isDividends = true;
    }
  }

  return { gross, withheld, isDividends };
}

/** US treaty withholding rate for dividends (15%). We use this for 1042-S so displayed rate and withheld amount are correct. */
const US_DIVIDEND_WITHHOLDING_RATE = 0.15;

/**
 * Parse 1042-S text content into a single US dividend entry.
 * Returns null if no valid dividend data (missing gross or not income code 06), or if text exceeds 600 KB.
 * The withheld amount shown is always 15% of gross (US treaty rate); extracted Box 10 / Schwab withheld is not used for display.
 */
export function parse1042sFromText(text: string): DividendEntry | null {
  if (text.length > MAX_1042S_TEXT_LENGTH) return null;
  const { gross, isDividends } = extract1042sValues(text);
  if (!isDividends || gross <= 0) return null;

  const withheld = gross * US_DIVIDEND_WITHHOLDING_RATE;

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
