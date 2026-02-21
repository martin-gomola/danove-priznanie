/**
 * AI Test Connection Route Tests
 *
 * Tests POST /api/ai/test-connection validation and behavior.
 * Run: npm test -- tests/ai-test-connection-route.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/test-connection/route';

function createRequest(payload: object, opts?: { contentLength?: number }) {
  const body = JSON.stringify(payload);
  const contentLength = opts?.contentLength ?? body.length;
  return new NextRequest('http://localhost/api/ai/test-connection', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(contentLength),
    },
  });
}

describe('POST /api/ai/test-connection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('payload validation - 400', () => {
    it('rejects missing mode', async () => {
      const req = createRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('mode');
    });

    it('rejects invalid mode', async () => {
      const req = createRequest({ mode: 'invalid' });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('mode');
    });

    it('rejects non-object payload', async () => {
      const req = new NextRequest('http://localhost/api/ai/test-connection', {
        method: 'POST',
        body: JSON.stringify([]),
        headers: { 'Content-Type': 'application/json', 'Content-Length': '2' },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('BYOK without apiKey returns 400', async () => {
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('apiKey');
    });

    it('BYOK without model returns 400', async () => {
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('model');
    });

    it('BYOK without baseUrl returns 400', async () => {
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('baseUrl');
    });

    it('BYOK with invalid baseUrl (no https) returns 400', async () => {
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'http://evil.com',
        model: 'gpt-4o',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('baseUrl');
    });

    it('rejects payload > 10KB with 413', async () => {
      const req = createRequest(
        { mode: 'managed' },
        { contentLength: 11_000 },
      );
      const res = await POST(req);
      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.error).toContain('Payload too large');
    });
  });

  describe('managed mode', () => {
    it('returns ok immediately with message', async () => {
      const req = createRequest({ mode: 'managed' });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.message).toBe('Managed mode – no external configuration needed.');
    });
  });

  describe('BYOK mode with mocked fetch', () => {
    it('returns ok when upstream returns 2xx', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true, status: 200 }),
      );
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-secret-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data).not.toHaveProperty('error');
      expect(JSON.stringify(data)).not.toContain('sk-');
    });

    it('returns 502 with sanitized error when upstream fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 401 }),
      );
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-secret-key-123',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
      const res = await POST(req);
      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBeDefined();
      expect(JSON.stringify(data)).not.toContain('sk-');
      expect(data.error).not.toContain('sk-');
    });

    it('never echoes API key in response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Invalid key sk-xxx-leaked')));
      const req = createRequest({
        mode: 'byok',
        provider: 'openai',
        apiKey: 'sk-my-secret-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
      const res = await POST(req);
      const data = await res.json();
      const bodyStr = JSON.stringify(data);
      expect(bodyStr).not.toContain('sk-my-secret-key');
      expect(bodyStr).not.toContain('sk-xxx-leaked');
    });
  });
});
