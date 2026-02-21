'use client';

import React, { useCallback, useRef, useState } from 'react';
import type {
  AIProviderConfig,
  DocumentInboxItem,
  EmploymentIncome,
  EvidenceItem,
} from '@/types/TaxForm';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { extractTextFromPdf } from '@/lib/ai/extractPdfText';
import { extractEmploymentFromText } from '@/lib/ai/extractEmployment';

const AI_SETTINGS_KEY = 'dane-priznanie-ai-settings';

function loadAISettings(): AIProviderConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AIProviderConfig>;
    if (!parsed.apiKey?.trim() || !parsed.baseUrl?.trim()) return null;
    return {
      mode: 'byok',
      provider: parsed.provider ?? 'openai',
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model ?? 'gpt-4o',
      lastConnectionCheck: parsed.lastConnectionCheck ?? '',
      connectionOk: parsed.connectionOk ?? false,
    };
  } catch {
    return null;
  }
}

function isPdf(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return name.endsWith('.pdf') || type === 'application/pdf';
}

interface DocumentInboxProps {
  documentInbox: DocumentInboxItem[];
  onUpdateInbox: (items: DocumentInboxItem[]) => void;
  onExtractionComplete: (fields: Partial<EmploymentIncome>, evidence: EvidenceItem[]) => void;
  onConsentRequired?: () => Promise<boolean>;
}

export function DocumentInbox({
  documentInbox,
  onUpdateInbox,
  onExtractionComplete,
  onConsentRequired,
}: DocumentInboxProps) {
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addInboxItem = useCallback(
    (item: DocumentInboxItem) => {
      onUpdateInbox([...documentInbox, item]);
    },
    [documentInbox, onUpdateInbox]
  );

  const updateInboxItem = useCallback(
    (id: string, patch: Partial<DocumentInboxItem>) => {
      onUpdateInbox(
        documentInbox.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
    },
    [documentInbox, onUpdateInbox]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      if (!isPdf(file)) {
        setError('Podporovaný je len PDF (Potvrdenie o zdaniteľných príjmoch).');
        return;
      }
      const settings = loadAISettings();
      if (!settings) {
        setError('Nastavte AI poskytovateľa (BYOK) na stránke API & AI a vyplňte API kľúč.');
        return;
      }
      if (onConsentRequired && !(await onConsentRequired())) return;

      const id = crypto.randomUUID();
      const item: DocumentInboxItem = {
        id,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        documentType: 'unknown',
        parseStatus: 'queued',
      };
      addInboxItem(item);
      setProcessingId(id);

      try {
        const text = await extractTextFromPdf(file);
        const result = await extractEmploymentFromText(text, settings, id);
        const fields = result.fields;
        const isAllZeros =
          (fields.r36 === '0.00' || !fields.r36) &&
          (fields.r37 === '0.00' || !fields.r37) &&
          (fields.r131 === '0.00' || !fields.r131);
        const docType = isAllZeros ? 'other' : 'employment';
        updateInboxItem(id, {
          parseStatus: 'parsed',
          documentType: docType,
        });
        onExtractionComplete(
          { enabled: true, ...result.fields },
          result.evidence
        );
        if (isAllZeros) {
          setError('Dokument nevyzerá ako Potvrdenie o zdaniteľných príjmoch. Import iných dokumentov je v príslušnom kroku.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Extrakcia zlyhala';
        setError(message);
        updateInboxItem(id, { parseStatus: 'failed' });
      } finally {
        setProcessingId(null);
      }
    },
    [addInboxItem, updateInboxItem, onExtractionComplete, onConsentRequired]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = '';
    },
    [handleFileSelect]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          Dokumenty a AI extrakcia
          {documentInbox.length > 0 && (
            <span className="text-xs text-gray-500">
              ({documentInbox.filter((d) => d.parseStatus === 'parsed').length}/{documentInbox.length})
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          <p className="text-xs text-gray-600">
            Len pre <strong>Potvrdenie o zdaniteľných príjmoch</strong>. PDF sa odošle na váš AI endpoint (BYOK) a vyplní krok Zamestnanie. Import iných dokumentov je v príslušnom kroku (dividendy → krok 3).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleInputChange}
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!processingId}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processingId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {processingId ? 'Spracovávam…' : 'Nahrať PDF'}
          </button>
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          {documentInbox.length > 0 && (
            <ul className="space-y-1.5">
              {documentInbox.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between text-xs text-gray-600 py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="truncate max-w-[12rem]" title={doc.fileName}>
                    {doc.fileName}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {doc.id === processingId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    ) : doc.parseStatus === 'parsed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : doc.parseStatus === 'failed' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <span className="text-gray-400">Čaká</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
