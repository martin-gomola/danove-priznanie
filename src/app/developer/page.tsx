'use client';

import { useEffect, useState } from 'react';
import { AIProviderSettings } from '@/components/developer/AIProviderSettings';

const SESSION_TOKEN_KEY = 'dane-priznanie-session-token';

function getSessionToken(): string {
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

export default function DeveloperPage() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3015');

  useEffect(() => {
    setToken(getSessionToken());
    setBaseUrl(window.location.origin);
  }, []);

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveToken = () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    localStorage.setItem(SESSION_TOKEN_KEY, trimmed);
    setToken(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const regenerateToken = () => {
    const newToken = crypto.randomUUID();
    localStorage.setItem(SESSION_TOKEN_KEY, newToken);
    setToken(newToken);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Header */}
        <div>
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Späť na formulár
          </a>
          <h1 className="text-2xl font-semibold mt-4 tracking-tight">
            API & AI integrácia
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Automatické vyplnenie formulára pomocou AI nástrojov (Cursor, Claude Code, Codex)
          </p>
        </div>

        {/* Session token */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Váš API token</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <p className="text-sm text-gray-600">
              Tento token sa používa pri volaniach API aj pri pollingu formulára.
              Môžete ho skopírovať, vložiť vlastný, alebo vygenerovať nový.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Vložte alebo vygenerujte token..."
                className="flex-1 px-3 py-2 bg-gray-900 text-emerald-400 rounded-lg text-sm font-mono placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                spellCheck={false}
              />
              <button
                onClick={saveToken}
                disabled={!token.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {saved ? '✓ Uložené' : 'Uložiť'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToken}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {copied ? '✓ Skopírované' : 'Kopírovať'}
              </button>
              <button
                onClick={regenerateToken}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Vygenerovať nový
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Token je uložený v localStorage. Po uložení sa formulár automaticky prepne na polling s týmto tokenom.
            </p>
          </div>
        </section>

        <AIProviderSettings />

        {/* How it works */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Ako to funguje</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 text-sm text-gray-600">
            <p>
              Aplikácia poskytuje jednoduché REST API, cez ktoré môžu externé AI nástroje odoslať dáta priamo do formulára.
              Každý prehliadač má vlastný session token - dáta sú izolované.
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
              <li>AI agent prečíta váš PDF/obrázok (napr. Potvrdenie o zdaniteľných príjmoch)</li>
              <li>Extrahuje hodnoty pomocou vstavanej schopnosti čítať dokumenty</li>
              <li>Odošle ich cez <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">POST /api/form</code> s vaším tokenom</li>
              <li>Aplikácia automaticky prevezme dáta do formulára (polling každé 3s)</li>
            </ol>
          </div>
        </section>

        {/* API Reference */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">API Reference</h2>

          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {/* POST */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-mono font-medium rounded">
                  POST
                </span>
                <code className="text-sm font-mono">/api/form</code>
              </div>
              <p className="text-sm text-gray-600">
                Odošle čiastočné dáta formulára. Aplikácia ich automaticky zlúči do aktuálneho stavu.
              </p>
              <div className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto">
                <pre>{`curl -X POST ${baseUrl}/api/form \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token || '<your-token>'}" \\
  -d '{
    "employment": {
      "enabled": true,
      "r36": "32400.00",
      "r37": "4341.60",
      "r131": "3648.00",
      "r36a": "0.00"
    }
  }'`}</pre>
              </div>
              <p className="text-xs text-gray-400">
                Odpoveď: <code className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded">{`{ "ok": true }`}</code>
              </p>
            </div>

            {/* GET */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono font-medium rounded">
                  GET
                </span>
                <code className="text-sm font-mono">/api/form?session=<span className="text-blue-400">&lt;token&gt;</span></code>
              </div>
              <p className="text-sm text-gray-600">
                Klient polluje každé 3s s session tokenom. Vráti čakajúce dáta a vymaže ich (jednorazové čítanie).
              </p>
            </div>
          </div>
        </section>

        {/* Supported sections */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Podporované sekcie</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                ['personalInfo', 'Osobné údaje (meno, RC, adresa)'],
                ['employment', 'Zamestnanie (r.36, r.37, r.131, r.36a)'],
                ['dividends', 'Zahraničné dividendy + kurzy'],
                ['mutualFunds', 'Podielové fondy'],
                ['mortgage', 'Hypotekárny bonus'],
                ['spouse', 'NCZD na manžela/ku'],
                ['childBonus', 'Daňový bonus na deti'],
                ['twoPercent', '2%/3% poukázanie dane'],
                ['parentAllocation', '2% dane rodičom (§50aa)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-start gap-2">
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700 shrink-0 mt-0.5">
                    {key}
                  </code>
                  <span className="text-gray-500 text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Employment mapping */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Mapovanie: Potvrdenie → API</h2>
          <p className="text-sm text-gray-500">
            Pre automatické vyplnenie zo zamestnaneckého potvrdenia (ročné zúčtovanie):
          </p>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Potvrdenie</th>
                  <th className="text-left px-4 py-2 font-medium">API pole</th>
                  <th className="text-left px-4 py-2 font-medium">Popis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                <tr><td className="px-4 py-2">II. oddiel, r. 01</td><td className="px-4 py-2 font-mono text-xs">r36</td><td className="px-4 py-2">Úhrn príjmov</td></tr>
                <tr><td className="px-4 py-2">II. oddiel, r. 01a</td><td className="px-4 py-2 font-mono text-xs">r36a</td><td className="px-4 py-2">Príjmy z dohôd</td></tr>
                <tr><td className="px-4 py-2">II. oddiel, r. 02</td><td className="px-4 py-2 font-mono text-xs">r37</td><td className="px-4 py-2">Povinné poistné (sociálne + zdravotné)</td></tr>
                <tr><td className="px-4 py-2">II. oddiel, r. 04</td><td className="px-4 py-2 font-mono text-xs">r131</td><td className="px-4 py-2">Preddavky na daň</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Cursor Skill */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Cursor Skill</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 text-sm text-gray-600">
            <p>
              V repozitári je pripravený skill v{' '}
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">
                .cursor/skills/fill-potvrdenie/SKILL.md
              </code>
            </p>
            <p>Použitie v Cursor (agent mode):</p>
            <div className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono">
              Fill the employment section from this PDF: ~/Documents/potvrdenie-2025.pdf
            </div>
            <p className="text-xs text-gray-400">
              Agent prečíta PDF, extrahuje 4 hodnoty, overí krížovú kontrolu (r.01 − r.02 = r.03)
              a odošle ich cez API. Formulár sa aktualizuje automaticky.
            </p>
          </div>
        </section>

        {/* Claude Code / Codex */}
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Claude Code / Codex</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 text-sm text-gray-600">
            <p>
              V terminálových AI agentoch stačí poskytnúť PDF a použiť curl:
            </p>
            <div className="rounded-lg bg-gray-900 text-gray-100 p-4 text-xs font-mono overflow-x-auto">
              <pre>{`# Agent reads the PDF, extracts values, then:
curl -X POST ${baseUrl}/api/form \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token || '<your-token>'}" \\
  -d '{"employment":{"enabled":true,"r36":"32400.00","r37":"4341.60","r131":"3648.00"}}'`}</pre>
            </div>
            <p className="text-xs text-gray-400">
              Použite token zobrazený vyššie. Každý prehliadač má vlastný token - dáta sú izolované medzi používateľmi.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Späť na formulár
          </a>
        </div>
      </div>
    </div>
  );
}
