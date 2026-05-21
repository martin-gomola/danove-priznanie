import { NextRequest } from 'next/server';
import { parsePotvrdenieDocument } from '@/lib/import/parsePotvrdenie';

const MIN_TOKEN_LENGTH = 8;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'];

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token.length >= MIN_TOKEN_LENGTH ? token : null;
}

function isSupportedDocument(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (type === 'application/pdf' || type.startsWith('image/')) return true;
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
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
        { error: 'File too large (max 5 MB)' },
        { status: 413 },
      );
    }

    if (!isSupportedDocument(file)) {
      return Response.json(
        { error: 'Unsupported file type. Use PDF or image files.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parsePotvrdenieDocument(buffer, file.type);

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
