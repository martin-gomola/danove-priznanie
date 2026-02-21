/**
 * AI Copilot Model Tests
 *
 * Validates DEFAULT_TAX_FORM includes aiCopilot state and its defaults.
 * Run: npm test -- tests/ai-copilot-model.test.ts
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_TAX_FORM } from '@/types/TaxForm';

describe('AI Copilot state in DEFAULT_TAX_FORM', () => {
  it('DEFAULT_TAX_FORM includes aiCopilot object', () => {
    expect(DEFAULT_TAX_FORM).toHaveProperty('aiCopilot');
    expect(DEFAULT_TAX_FORM.aiCopilot).toBeDefined();
    expect(typeof DEFAULT_TAX_FORM.aiCopilot).toBe('object');
  });

  it('default mode is managed', () => {
    expect(DEFAULT_TAX_FORM.aiCopilot.provider.mode).toBe('managed');
  });

  it('documentInbox default is empty array', () => {
    expect(DEFAULT_TAX_FORM.aiCopilot.documentInbox).toEqual([]);
  });

  it('warnings default is empty array', () => {
    expect(DEFAULT_TAX_FORM.aiCopilot.warnings).toEqual([]);
  });
});
