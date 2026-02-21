/**
 * Client-side AI extraction of employment fields (Potvrdenie o zdaniteľných príjmoch).
 * Calls OpenAI-compatible chat completions with document text; returns structured fields + evidence.
 * Runs in the browser; API key never leaves the client.
 */

import type { AIProviderConfig, EmploymentIncome, EvidenceItem } from '@/types/TaxForm';

const EXTRACT_TIMEOUT_MS = 10_000;

/** Expected JSON shape from the model (r36, r37, r131 from Potvrdenie; optional snippets). */
interface ExtractedPayload {
  r36?: string;
  r36a?: string;
  r37?: string;
  r131?: string;
  snippets?: Partial<Record<'r36' | 'r36a' | 'r37' | 'r131', string>>;
}

export interface ExtractionResult {
  fields: Partial<EmploymentIncome>;
  evidence: EvidenceItem[];
  raw: string;
}

const EMPLOYMENT_EXTRACT_PROMPT = `You are extracting data from a Slovak "Potvrdenie o zdaniteľných príjmoch" (annual income confirmation from employer) for a tax form.

IMPORTANT: Only extract from a real Potvrdenie o zdaniteľných príjmoch (Slovak employment income confirmation with sections like "II. oddiel", "r. 01", "r. 02"). If the document is something else (e.g. US Form 1042-S, broker statement, dividend summary, contract, or any non-employment document), respond with all zeros and do NOT use any numbers from the document:
{"r36":"0.00","r36a":"0.00","r37":"0.00","r131":"0.00"}

When the document IS a Potvrdenie, extract exactly these numeric fields (two decimal places; "0.00" if not found or zero):
- r36: Úhrn príjmov (II. oddiel, r. 01) - total gross income in EUR
- r36a: Príjmy z dohôd (II. oddiel, r. 01a) - income from work agreements, often 0
- r37: Úhrn povinného poistného (II. oddiel, r. 02) - total insurance (social + health)
- r131: Úhrn preddavkov na daň (II. oddiel, r. 04) - tax advances withheld

Respond with a single JSON object only, no markdown or explanation. Include an optional "snippets" object with the exact text you used for each field (short quote from the document). For non-Potvrdenie documents omit snippets.
Example for a valid Potvrdenie: {"r36":"12345.00","r36a":"0.00","r37":"2345.00","r131":"1500.00","snippets":{"r36":"r.01 12345.00","r37":"r.02 2345.00"}}`;

function buildUserMessage(documentText: string): string {
  return `${EMPLOYMENT_EXTRACT_PROMPT}\n\n---\nDocument text:\n\n${documentText.slice(0, 30000)}`;
}

function parseExtractedPayload(content: string): ExtractedPayload | null {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd <= jsonStart) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as ExtractedPayload;
  } catch {
    return null;
  }
}

function toEvidenceItem(
  fieldPath: string,
  docId: string,
  value: string,
  snippet: string,
  extractedAt: string
): EvidenceItem {
  return {
    fieldPath,
    docId,
    snippet: snippet || value,
    confidence: 0.9,
    extractedAt,
  };
}

/**
 * Call OpenAI-compatible chat completions to extract employment fields from document text.
 * Uses provider.baseUrl and provider.apiKey; runs in browser.
 */
export async function extractEmploymentFromText(
  text: string,
  provider: AIProviderConfig,
  docId: string
): Promise<ExtractionResult> {
  if (!provider.apiKey?.trim()) {
    throw new Error('API key is required for extraction');
  }
  const baseUrl = (provider.baseUrl || '').replace(/\/$/, '');
  const model = provider.model || 'gpt-4o';
  const url = `${baseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You respond only with valid JSON. No markdown, no explanation.' },
          { role: 'user', content: buildUserMessage(text) },
        ],
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API error ${res.status}: ${errBody.slice(0, 200).replace(/sk-[^\s]*/gi, '[REDACTED]')}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const payload = parseExtractedPayload(raw);
    if (!payload) {
      throw new Error('Could not parse extraction response');
    }

    const extractedAt = new Date().toISOString();
    const fields: Partial<EmploymentIncome> = {};
    const evidence: EvidenceItem[] = [];
    const snippets = payload.snippets ?? {};

    if (payload.r36 != null && String(payload.r36).trim() !== '') {
      fields.r36 = String(payload.r36).trim();
      evidence.push(toEvidenceItem('employment.r36', docId, fields.r36, snippets.r36 ?? fields.r36, extractedAt));
    }
    if (payload.r36a != null && String(payload.r36a).trim() !== '') {
      fields.r36a = String(payload.r36a).trim();
      evidence.push(toEvidenceItem('employment.r36a', docId, fields.r36a, snippets.r36a ?? fields.r36a, extractedAt));
    }
    if (payload.r37 != null && String(payload.r37).trim() !== '') {
      fields.r37 = String(payload.r37).trim();
      evidence.push(toEvidenceItem('employment.r37', docId, fields.r37, snippets.r37 ?? fields.r37, extractedAt));
    }
    if (payload.r131 != null && String(payload.r131).trim() !== '') {
      fields.r131 = String(payload.r131).trim();
      evidence.push(toEvidenceItem('employment.r131', docId, fields.r131, snippets.r131 ?? fields.r131, extractedAt));
    }

    return { fields, evidence, raw };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      throw new Error(err.message.replace(/sk-[^\s]*/gi, '[REDACTED]'));
    }
    throw err;
  }
}
