import { NextRequest } from 'next/server';
import type { DividendEntry } from '@/types/TaxForm';
import { parseIbkrDividendCsv } from '@/lib/import/parseIbkrCsv';
import { parse1042sPdf } from '@/lib/import/parse1042s';

const MIN_TOKEN_LENGTH = 8;
const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1 MB

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length >= MIN_TOKEN_LENGTH ? token : null;
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

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) {
    return Response.json(
      { error: 'Missing Authorization: Bearer <session-token>' },
      { status: 401 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') ?? formData.get('document');
    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: 'No file in request. Send multipart/form-data with field "file".' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: 'File too large (max 1 MB)' },
        { status: 413 },
      );
    }

    let entries: DividendEntry[];

    if (isCsv(file)) {
      const text = await file.text();
      entries = parseIbkrDividendCsv(text);
    } else if (isPdf(file)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const entry = await parse1042sPdf(buffer);
      entries = entry ? [entry] : [];
    } else {
      return Response.json(
        { error: 'Unsupported file type. Use .csv (IBKR dividend) or .pdf (1042-S).' },
        { status: 400 },
      );
    }

    return Response.json({ entries });
  } catch (err) {
    console.error('Dividend import failed:', err);
    return Response.json(
      { error: 'Failed to parse file. Check format (IBKR dividend CSV or 1042-S PDF).' },
      { status: 422 },
    );
  }
}
