import { describe, expect, it } from 'vitest';
import { uploadedFileValidationResponse, validateUploadedFile } from '@/lib/import/intake';

describe('validateUploadedFile', () => {
  it('returns a pure validation error when the upload is missing', () => {
    const result = validateUploadedFile(null, 1024);

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: 'No file in request. Send multipart/form-data with field "file".',
    });
  });

  it('returns a pure validation error when the upload is too large', () => {
    const file = new File(['12345'], 'large.csv', { type: 'text/csv' });
    const result = validateUploadedFile(file, 4);

    expect(result).toEqual({
      ok: false,
      status: 413,
      error: 'File too large (max 0 MB)',
    });
  });

  it('returns the uploaded file on success', () => {
    const file = new File(['ok'], 'dividends.csv', { type: 'text/csv' });
    const result = validateUploadedFile(file, 1024);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file).toBe(file);
    }
  });

  it('maps validation failures to route-level JSON responses', async () => {
    const result = validateUploadedFile(null, 1024);
    const response = uploadedFileValidationResponse(result);

    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toEqual({
      error: 'No file in request. Send multipart/form-data with field "file".',
    });
  });

  it('does not create a response for successful validation', () => {
    const file = new File(['ok'], 'dividends.csv', { type: 'text/csv' });
    const result = validateUploadedFile(file, 1024);

    expect(uploadedFileValidationResponse(result)).toBeNull();
  });
});
