'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AIProviderConfig } from '@/types/TaxForm';

const AI_SETTINGS_KEY = 'dane-priznanie-ai-settings';

const DEFAULT_SETTINGS: AIProviderConfig = {
  mode: 'byok',
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o',
  lastConnectionCheck: '',
  connectionOk: false,
};

function loadSettings(): AIProviderConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AIProviderConfig>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: AIProviderConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function AIProviderSettings() {
  const [settings, setSettings] = useState<AIProviderConfig>(DEFAULT_SETTINGS);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const load = useCallback(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback((patch: Partial<AIProviderConfig>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTestError(null);
    setTesting(true);
    const payload = {
      mode: 'byok' as const,
      provider: settings.provider,
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl,
      model: settings.model || 'gpt-4o',
    };
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        update({
          lastConnectionCheck: new Date().toISOString(),
          connectionOk: true,
        });
      } else {
        update({
          lastConnectionCheck: new Date().toISOString(),
          connectionOk: false,
        });
        setTestError(data.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      update({
        lastConnectionCheck: new Date().toISOString(),
        connectionOk: false,
      });
      setTestError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setTesting(false);
    }
  }, [settings.provider, settings.apiKey, settings.baseUrl, settings.model, update]);

  const handleApiKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => update({ apiKey: e.target.value }),
    [update]
  );

  const handleBaseUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => update({ baseUrl: e.target.value }),
    [update]
  );

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => update({ model: e.target.value }),
    [update]
  );

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">AI poskytovateľ</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Vlastný kľúč (BYOK):</strong> Dáta sa odosielajú na vášmi zadaný endpoint. Overte dôveryhodnú URL a API kľúč.
        </p>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">API kľúč</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={handleApiKeyChange}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            spellCheck={false}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Base URL</label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={handleBaseUrlChange}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            spellCheck={false}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Model</label>
          <input
            type="text"
            value={settings.model}
            onChange={handleModelChange}
            placeholder="gpt-4o"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !settings.apiKey?.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Testujem…' : 'Test pripojenia'}
          </button>
          {settings.lastConnectionCheck && (
            <span className="text-xs text-gray-500">
              Naposledy:{' '}
              {new Date(settings.lastConnectionCheck).toLocaleString('sk-SK')}
              {settings.connectionOk ? (
                <span className="ml-1 text-emerald-600">✓ OK</span>
              ) : (
                <span className="ml-1 text-red-600">✗ Zlyhanie</span>
              )}
            </span>
          )}
        </div>
        {testError && (
          <p className="text-xs text-red-600">
            Chyba: {testError}
          </p>
        )}
        <p className="text-xs text-gray-400">
          Nastavenia sú uložené v localStorage pod kľúčom <code>{AI_SETTINGS_KEY}</code>.
        </p>
      </div>
    </section>
  );
}
