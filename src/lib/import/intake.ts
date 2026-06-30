import type { EmploymentImportResult } from '@/lib/import/parsePotvrdenie';
import { parsePotvrdenieDocument } from '@/lib/import/parsePotvrdenie';
import { parseIbkrDividendCsv } from '@/lib/import/parseIbkrCsv';
import { parse1042sPdf } from '@/lib/import/parse1042s';
import type { DividendEntry } from '@/types/TaxForm';

const MIN_TOKEN_LENGTH = 8;

export function extractBearerSessionToken(headers: Headers): string | null {
  const auth = headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length >= MIN_TOKEN_LENGTH ? token : null;
}

export function requireBearerSession(headers: Headers): Response | null {
  return extractBearerSessionToken(headers)
    ? null
    : Response.json({ error: 'Missing Authorization: Bearer <session-token>' }, { status: 401 });
}

export function getUploadedFile(formData: FormData): File | null {
  const file = formData.get('file') ?? formData.get('document');
  return file instanceof File ? file : null;
}

export type UploadedFileValidationResult =
  | { ok: true; file: File }
  | { ok: false; status: number; error: string };
export type UploadedFileValidationFailure = Extract<UploadedFileValidationResult, { ok: false }>;

export function validateUploadedFile(file: File | null, maxBytes: number): UploadedFileValidationResult {
  if (!file) {
    return {
      ok: false,
      status: 400,
      error: 'No file in request. Send multipart/form-data with field "file".',
    };
  }

  if (file.size > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `File too large (max ${Math.floor(maxBytes / 1024 / 1024)} MB)`,
    };
  }

  return { ok: true, file };
}

export function uploadedFileValidationResponse(result: UploadedFileValidationResult): Response | null {
  return result.ok ? null : Response.json({ error: result.error }, { status: result.status });
}

export function uploadedFileValidationErrorResponse(result: UploadedFileValidationFailure): Response {
  return Response.json({ error: result.error }, { status: result.status });
}

function isCsv(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return name.endsWith('.csv') || type.includes('csv') || type === 'text/csv';
}

function isPdf(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return name.endsWith('.pdf') || type === 'application/pdf';
}

function looksLikeIbkrDividendCsv(text: string): boolean {
  const trimmed = text.trimStart();
  return (
    trimmed.startsWith('Account,Header,') ||
    trimmed.startsWith('DividendDetail,Header,') ||
    (trimmed.includes('DividendDetail,Data,Summary,') && trimmed.includes('Gross,GrossInBase,GrossInUSD'))
  );
}

export async function importDividendDocument(file: File): Promise<DividendEntry[]> {
  if (isPdf(file)) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const entry = await parse1042sPdf(buffer);
    return entry ? [entry] : [];
  }

  const text = await file.text();
  if (isCsv(file) || looksLikeIbkrDividendCsv(text)) {
    return parseIbkrDividendCsv(text);
  }

  throw new Error('Unsupported dividend import file type');
}

const SUPPORTED_EMPLOYMENT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'];

export function isSupportedEmploymentDocument(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (type === 'application/pdf' || type.startsWith('image/')) return true;
  return SUPPORTED_EMPLOYMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function importEmploymentDocument(file: File): Promise<EmploymentImportResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return parsePotvrdenieDocument(buffer, file.type);
}
