/**
 * AI Copilot Hook Merge Tests
 *
 * Asserts that deep-merge behavior preserves new aiCopilot defaults when
 * older saved payloads are loaded (payloads saved before aiCopilot was added).
 * Run: npm test -- tests/ai-copilot-hook-merge.test.ts
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_AI_COPILOT, TaxFormData } from '@/types/TaxForm';
import { mergeLoadedFormData } from '@/hooks/useTaxForm';

describe('aiCopilot deep-merge in form load', () => {
  it('preserves aiCopilot defaults when old payload has no aiCopilot', () => {
    // Simulate old saved payload from before aiCopilot was added.
    // Cast needed because real localStorage payloads can have partial nested objects.
    const oldPayload = {
      personalInfo: { dic: '1234567890' },
      employment: { r36: '20000' },
      currentStep: 1,
      lastSaved: '2025-01-15T10:00:00.000Z',
    } as Partial<TaxFormData>;
    // Explicitly omit aiCopilot - as would an old localStorage entry

    const merged = mergeLoadedFormData(oldPayload);

    expect(merged.aiCopilot).toBeDefined();
    expect(merged.aiCopilot).toEqual(DEFAULT_AI_COPILOT);
    expect(merged.aiCopilot.provider.mode).toBe('managed');
    expect(merged.aiCopilot.documentInbox).toEqual([]);
    expect(merged.aiCopilot.warnings).toEqual([]);
    expect(merged.aiCopilot.evidence).toEqual([]);
    expect(merged.aiCopilot.readinessScore).toBe(0);
  });

  it('merges partial aiCopilot updates when payload has some aiCopilot data', () => {
    // Payload with partial aiCopilot (e.g. old version with fewer fields)
    const payloadWithPartialAiCopilot: Partial<TaxFormData> = {
      aiCopilot: {
        readinessScore: 75,
      } as TaxFormData['aiCopilot'],
    };

    const merged = mergeLoadedFormData(payloadWithPartialAiCopilot);

    expect(merged.aiCopilot.readinessScore).toBe(75);
    expect(merged.aiCopilot.provider.mode).toBe('managed');
    expect(merged.aiCopilot.documentInbox).toEqual([]);
  });
});
