import Decimal from 'decimal.js';
import type { EmploymentIncome } from '@/types/TaxForm';
import { extractDocumentText, extractPdfTextWithFallback } from './liteparse';

type ParsedField = 'r36' | 'r36a' | 'r37' | 'r38' | 'r131' | 'r131Dohody';
type RequiredField = 'r36' | 'r37' | 'r131';

interface FieldPattern {
  line: RegExp;
  window: string;
}

export interface EmploymentImportDiagnostics {
  sectionFound: boolean;
  extractedRows: Partial<Record<ParsedField, string>>;
  missingRequiredFields: RequiredField[];
  documentR38: string | null;
  computedR38: string | null;
  crossCheckMatches: boolean | null;
}

export interface EmploymentImportResult {
  employment: Pick<EmploymentIncome, 'enabled' | 'r36' | 'r36a' | 'r37' | 'r131' | 'r131Dohody'>;
  diagnostics: EmploymentImportDiagnostics;
}

const AMOUNT_CAPTURE = '([-+]?\\d(?:[\\d\\s.\\u00A0]*\\d)?[,.]\\d{2})';
const AMOUNT_GLOBAL = new RegExp(AMOUNT_CAPTURE, 'g');
const NEXT_ROW_PATTERN = /^\s*(?:r(?:iadok)?\.?\s*)?0?[1-4](?:a)?(?=$|[\s:.)-])/i;

const FIELD_PATTERNS: Record<ParsedField, FieldPattern> = {
  r36: {
    line: /^\s*(?:r(?:iadok)?\.?\s*)?0?1(?=$|[\s:.)-])/i,
    window: '(?:^|\\s)(?:r(?:iadok)?\\.?\\s*)?0?1(?=$|[\\s:.)-])',
  },
  r36a: {
    line: /^\s*(?:r(?:iadok)?\.?\s*)?0?1a(?=$|[\s:.)-])/i,
    window: '(?:^|\\s)(?:r(?:iadok)?\\.?\\s*)?0?1a(?=$|[\\s:.)-])',
  },
  r37: {
    line: /^\s*(?:r(?:iadok)?\.?\s*)?0?2(?=$|[\s:.)-])/i,
    window: '(?:^|\\s)(?:r(?:iadok)?\\.?\\s*)?0?2(?=$|[\\s:.)-])',
  },
  r38: {
    line: /^\s*(?:r(?:iadok)?\.?\s*)?0?3(?=$|[\s:.)-])/i,
    window: '(?:^|\\s)(?:r(?:iadok)?\\.?\\s*)?0?3(?=$|[\\s:.)-])',
  },
  r131: {
    line: /^\s*(?:r(?:iadok)?\.?\s*)?0?4(?=$|[\s:.)-])/i,
    window: '(?:^|\\s)(?:r(?:iadok)?\\.?\\s*)?0?4(?=$|[\\s:.)-])',
  },
  r131Dohody: {
    line: /^\s*(?:r(?:iadok)?\.?\s*)?0?4a(?=$|[\s:.)-])/i,
    window: '(?:^|\\s)(?:r(?:iadok)?\\.?\\s*)?0?4a(?=$|[\\s:.)-])',
  },
};

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractEmploymentSection(text: string): { sectionFound: boolean; sectionText: string } {
  const normalized = normalizeText(text);
  const start = normalized.search(/II\.?\s*oddiel/i);
  if (start < 0) {
    return { sectionFound: false, sectionText: normalized };
  }

  const afterStart = normalized.slice(start);
  const endMatch = afterStart.match(/\n\s*(?:III|3)\.?\s*oddiel\b|\n\s*Poučenie\b|\n\s*Poznámky\b/i);
  const end = endMatch ? endMatch.index : afterStart.length;

  return {
    sectionFound: true,
    sectionText: afterStart.slice(0, end).trim(),
  };
}

function normalizeAmount(raw: string): string | null {
  const compact = raw.replace(/\s+/g, '').replace(/\u00A0/g, '');
  if (!compact) return null;

  let normalized = compact;
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');

  if (lastComma > lastDot) {
    normalized = compact.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = compact.replace(/,/g, '');
  } else if (compact.includes(',')) {
    normalized = compact.replace(',', '.');
  }

  try {
    return new Decimal(normalized).toDecimalPlaces(2).toFixed(2);
  } catch {
    return null;
  }
}

function extractAmounts(line: string): string[] {
  const matches = line.match(AMOUNT_GLOBAL) ?? [];
  return matches
    .map(normalizeAmount)
    .filter((value): value is string => Boolean(value));
}

function extractFieldAmount(sectionText: string, field: ParsedField): string | null {
  const { line, window } = FIELD_PATTERNS[field];
  const lines = sectionText
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];
    if (!line.test(current)) continue;

    const amountsOnSameLine = extractAmounts(current);
    if (amountsOnSameLine.length > 0) {
      return amountsOnSameLine[amountsOnSameLine.length - 1];
    }

    for (let next = index + 1; next < Math.min(lines.length, index + 4); next += 1) {
      const candidate = lines[next];
      if (NEXT_ROW_PATTERN.test(candidate)) break;

      const amountsOnNextLine = extractAmounts(candidate);
      if (amountsOnNextLine.length > 0) {
        return amountsOnNextLine[0];
      }
    }
  }

  const flattened = sectionText.replace(/\s+/g, ' ');
  const fallback = flattened.match(new RegExp(`${window}[\\s\\S]{0,140}?${AMOUNT_CAPTURE}`, 'i'));
  if (!fallback?.[1]) return null;

  return normalizeAmount(fallback[1]);
}

export function parsePotvrdenieFromText(text: string): EmploymentImportResult {
  const { sectionFound, sectionText } = extractEmploymentSection(text);

  const extractedRows: Partial<Record<ParsedField, string>> = {};
  for (const field of Object.keys(FIELD_PATTERNS) as ParsedField[]) {
    const value = extractFieldAmount(sectionText, field);
    if (value) extractedRows[field] = value;
  }

  const computedR38 =
    extractedRows.r36 && extractedRows.r37
      ? new Decimal(extractedRows.r36).minus(extractedRows.r37).toDecimalPlaces(2).toFixed(2)
      : null;

  const missingRequiredFields = (['r36', 'r37', 'r131'] as RequiredField[]).filter(
    (field) => !extractedRows[field],
  );

  return {
    employment: {
      enabled: missingRequiredFields.length === 0,
      r36: extractedRows.r36 ?? '',
      r36a: extractedRows.r36a ?? '0.00',
      r37: extractedRows.r37 ?? '',
      r131: extractedRows.r131 ?? '',
      r131Dohody: extractedRows.r131Dohody ?? '',
    },
    diagnostics: {
      sectionFound,
      extractedRows,
      missingRequiredFields,
      documentR38: extractedRows.r38 ?? null,
      computedR38,
      crossCheckMatches:
        computedR38 && extractedRows.r38 ? computedR38 === extractedRows.r38 : null,
    },
  };
}

export async function parsePotvrdenieDocument(
  buffer: Buffer,
  mimeType: string = 'application/pdf',
): Promise<EmploymentImportResult> {
  const looksLikePdf = mimeType === 'application/pdf' || buffer.subarray(0, 4).toString() === '%PDF';
  const text = looksLikePdf
    ? await extractPdfTextWithFallback(buffer, { ocrLanguage: ['slk', 'eng'] })
    : await extractDocumentText(buffer, { ocrLanguage: ['slk', 'eng'] });

  return parsePotvrdenieFromText(text);
}
