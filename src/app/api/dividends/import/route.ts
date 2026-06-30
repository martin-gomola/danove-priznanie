import { NextRequest } from 'next/server';
import {
  getUploadedFile,
  importDividendDocument,
  requireBearerSession,
  uploadedFileValidationErrorResponse,
  validateUploadedFile,
} from '@/lib/import/intake';

const MAX_FILE_BYTES = 1 * 1024 * 1024; // 1 MB

export async function POST(req: NextRequest) {
  const authError = requireBearerSession(req.headers);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const fileValidation = validateUploadedFile(getUploadedFile(formData), MAX_FILE_BYTES);
    if (!fileValidation.ok) {
      return uploadedFileValidationErrorResponse(fileValidation);
    }

    const entries = await importDividendDocument(fileValidation.file);
    return Response.json({ entries });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Dividend import failed:', err);
    }
    const unsupported = err instanceof Error && err.message === 'Unsupported dividend import file type';
    const message = unsupported
      ? 'Unsupported file type. Use .csv (IBKR dividend) or .pdf (1042-S).'
      : 'Failed to parse file. Check format (IBKR dividend CSV or 1042-S PDF).';
    return Response.json({ error: message }, { status: unsupported ? 400 : 422 });
  }
}
