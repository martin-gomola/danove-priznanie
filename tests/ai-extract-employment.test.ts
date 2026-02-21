/**
 * Tests for client-side employment extraction (extractEmploymentFromText).
 * Mocks fetch to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractEmploymentFromText } from '../src/lib/ai/extractEmployment';

const mockProvider = {
  mode: 'byok' as const,
  provider: 'openai' as const,
  apiKey: 'sk-test-key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  lastConnectionCheck: '',
  connectionOk: true,
};

describe('extractEmploymentFromText', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends document text in request body and uses correct URL', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"r36":"32400.00","r36a":"0.00","r37":"4341.60","r131":"3648.00"}' } }],
        }),
        { status: 200 }
      )
    );

    await extractEmploymentFromText('II. oddiel r.01 32400.00', mockProvider, 'doc-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-test-key',
    });
    const body = JSON.parse((options?.body as string) ?? '{}');
    expect(body.model).toBe('gpt-4o');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[1].content).toContain('II. oddiel r.01 32400.00');
  });

  it('parses valid JSON response into fields and evidence', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"r36":"32400.00","r36a":"0.00","r37":"4341.60","r131":"3648.00","snippets":{"r36":"r.01 32400"}}',
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const result = await extractEmploymentFromText('doc text', mockProvider, 'doc-1');

    expect(result.fields).toEqual({
      r36: '32400.00',
      r36a: '0.00',
      r37: '4341.60',
      r131: '3648.00',
    });
    expect(result.evidence).toHaveLength(4);
    expect(result.evidence.map((e) => e.fieldPath)).toEqual([
      'employment.r36',
      'employment.r36a',
      'employment.r37',
      'employment.r131',
    ]);
    expect(result.evidence[0].docId).toBe('doc-1');
    expect(result.evidence[0].confidence).toBe(0.9);
    expect(result.evidence[0].snippet).toBe('r.01 32400');
    expect(result.raw).toContain('32400.00');
  });

  it('throws when API key is empty', async () => {
    const noKeyProvider = { ...mockProvider, apiKey: '' };
    await expect(extractEmploymentFromText('text', noKeyProvider, 'doc-1')).rejects.toThrow('API key is required');
  });

  it('throws on API error and sanitizes response', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(
      () => Promise.resolve(new Response('Invalid key sk-xxx-secret', { status: 401 }))
    );

    await expect(extractEmploymentFromText('text', mockProvider, 'doc-1')).rejects.toThrow(/401/);
    await expect(extractEmploymentFromText('text', mockProvider, 'doc-1')).rejects.toThrow(/\[REDACTED\]/);
  });

  it('throws when response is not valid JSON', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'No JSON here' } }] }),
        { status: 200 }
      )
    );

    await expect(extractEmploymentFromText('text', mockProvider, 'doc-1')).rejects.toThrow(
      'Could not parse extraction response'
    );
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"r36":"100.00"}' } }] }),
        { status: 200 }
      )
    );

    await extractEmploymentFromText('x', { ...mockProvider, baseUrl: 'https://api.example.com/v1/' }, 'd');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.any(Object)
    );
  });
});
