/**
 * Browser-only PDF text extraction using pdfjs-dist.
 * Used to get document text from uploaded PDFs before sending to AI extraction.
 */

/** Extract plain text from a PDF file (browser). Uses pdfjs-dist. */
export async function extractTextFromPdf(file: File): Promise<string> {
  const { getDocument } = await import('pdfjs-dist');
  const arrayBuffer = await file.arrayBuffer();
  const doc = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = doc.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    parts.push(pageText);
  }

  return parts.join('\n\n').trim();
}

/** Read a PDF file as base64 data URL (for APIs that accept PDF inline). */
export function readPdfAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Failed to read file as base64'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
