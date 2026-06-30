import { NextRequest } from 'next/server';
import {
  getUploadedFile,
  importEmploymentDocument,
  isSupportedEmploymentDocument,
  requireBearerSession,
  uploadedFileValidationErrorResponse,
  validateUploadedFile,
} from '@/lib/import/intake';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const authError = requireBearerSession(req.headers);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const fileValidation = validateUploadedFile(getUploadedFile(formData), MAX_FILE_BYTES);
    if (!fileValidation.ok) {
      return uploadedFileValidationErrorResponse(fileValidation);
    }
    const file = fileValidation.file;

    if (!isSupportedEmploymentDocument(file)) {
      return Response.json(
        { error: 'Unsupported file type. Use PDF or image files.' },
        { status: 400 },
      );
    }

    const result = await importEmploymentDocument(file);

    if (result.diagnostics.missingRequiredFields.length > 0) {
      return Response.json(
        {
          error: `Failed to extract required rows: ${result.diagnostics.missingRequiredFields.join(', ')}`,
          ...result,
        },
        { status: 422 },
      );
    }

    return Response.json(result);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Employment import failed:', err);
    }

    return Response.json(
      { error: 'Failed to parse file. Check format (PDF or image).' },
      { status: 422 },
    );
  }
}
