'use client';

import React, { useCallback, useRef, useState } from 'react';
import type { DocumentInboxItem } from '@/types/TaxForm';
import { Upload, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export type StepDocumentType = 'dividends' | '1042s' | 'broker_report' | 'mortgage' | 'childBonus';

interface StepDocumentUploadProps {
  documentType: StepDocumentType;
  label: string;
  hint?: string;
  accept?: string;
  documentInbox: DocumentInboxItem[];
  onUpdateInbox: (items: DocumentInboxItem[]) => void;
}

export function StepDocumentUpload({
  documentType,
  label,
  hint,
  accept = '.pdf,application/pdf',
  documentInbox,
  onUpdateInbox,
}: StepDocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const itemsForStep = documentInbox.filter((d) => d.documentType === documentType);

  const addItem = useCallback(
    (file: File) => {
      const item: DocumentInboxItem = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        documentType,
        parseStatus: 'parsed',
      };
      onUpdateInbox([...documentInbox, item]);
    },
    [documentInbox, documentType, onUpdateInbox]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) addItem(file);
      e.target.value = '';
    },
    [addItem]
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
          Dokumenty – {label}
          {itemsForStep.length > 0 && (
            <span className="text-xs text-gray-500">({itemsForStep.length})</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3">
          {hint && <p className="text-xs text-gray-600">{hint}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Nahrať dokument
          </button>
          {itemsForStep.length > 0 && (
            <ul className="space-y-1.5">
              {itemsForStep.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between text-xs text-gray-600 py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="truncate max-w-[12rem]" title={doc.fileName}>
                    {doc.fileName}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
