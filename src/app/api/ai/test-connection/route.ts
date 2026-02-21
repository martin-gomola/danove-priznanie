import { NextRequest } from 'next/server';

/** Max payload size: 10KB */
const MAX_PAYLOAD_BYTES = 10_000;

/** Timeout for BYOK probe: 10 seconds */
const PROBE_TIMEOUT_MS = 10_000;

type Mode = 'managed' | 'byok';

interface TestConnectionPayload {
  mode?: Mode;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function isValidUrl(url: string): boolean {
  return url.startsWith('https://') || (url.startsWith('http://') && url.includes('localhost'));
}

function validatePayload(body: TestConnectionPayload): { error?: string } {
  if (!body.mode || (body.mode !== 'managed' && body.mode !== 'byok')) {
    return { error: 'mode must be "managed" or "byok"' };
  }

  if (body.mode === 'managed') {
    return {};
  }

  // BYOK mode
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  if (!apiKey) {
    return { error: 'apiKey is required for BYOK mode' };
  }
  if (!model) {
    return { error: 'model is required for BYOK mode' };
  }
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
  if (!baseUrl) {
    return { error: 'baseUrl is required for BYOK mode' };
  }
  if (!isValidUrl(baseUrl)) {
    return { error: 'baseUrl must start with https:// or http:// (for localhost)' };
  }
  return {};
}

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'Connection timeout';
    return err.message.replace(/sk-[^\s]*/gi, '[REDACTED]');
  }
  return 'Connection failed';
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = (await req.json()) as TestConnectionPayload;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Payload must be a JSON object' }, { status: 400 });
    }

    const validation = validatePayload(body);
    if (validation.error) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    if (body.mode === 'managed') {
      return Response.json({
        ok: true,
        message: 'Managed mode – no external configuration needed.',
      });
    }

    // BYOK mode: probe the endpoint
    const baseUrl = (body.baseUrl ?? '').replace(/\/$/, '');
    const url = `${baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${body.apiKey}`,
      },
      body: JSON.stringify({
        model: body.model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return Response.json({ ok: true });
    }

    return Response.json(
      { ok: false, error: `Upstream returned HTTP ${response.status}` },
      { status: 502 },
    );
  } catch (err) {
    const msg = sanitizeError(err);
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
