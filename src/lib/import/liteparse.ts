import { LiteParse, type LiteParseConfig, type LiteParseInput } from '@llamaindex/liteparse';

const DEFAULT_CONFIG: Partial<LiteParseConfig> = {
  outputFormat: 'text',
  ocrEnabled: true,
  preserveVerySmallText: true,
  dpi: 200,
};

function normalizeParsedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();
}

export async function extractDocumentText(
  input: LiteParseInput,
  config: Partial<LiteParseConfig> = {},
): Promise<string> {
  const parser = new LiteParse({
    ...DEFAULT_CONFIG,
    ...config,
    outputFormat: 'text',
  });

  const result = await parser.parse(input);
  return normalizeParsedText(result.text ?? '');
}

export async function extractPdfTextWithFallback(
  buffer: Buffer,
  config: Partial<LiteParseConfig> = {},
): Promise<string> {
  try {
    return await extractDocumentText(buffer, config);
  } catch {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return normalizeParsedText(result?.text ?? '');
  }
}
