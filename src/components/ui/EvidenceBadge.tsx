'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import type { EvidenceItem } from '@/types/TaxForm';

interface EvidenceBadgeProps {
  items: EvidenceItem[];
  /** Document display name (e.g. from DocumentInboxItem); optional, falls back to docId */
  docName?: string;
}

function confidenceColor(confidence: number): string {
  if (confidence > 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (confidence >= 0.5) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export function EvidenceBadge({ items, docName }: EvidenceBadgeProps) {
  const [open, setOpen] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!items.length) return null;

  const primary = items[0];
  const confidenceClass = confidenceColor(primary.confidence);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border
          ${confidenceClass}
          hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-300
        `}
        title="Zdroj údajov z dokumentu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Sparkles className="w-3 h-3" />
        <span>AI</span>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-w-sm rounded-lg border border-gray-200 bg-white shadow-lg py-2 px-3 text-left"
          role="dialog"
          aria-label="Zdroj údajov"
        >
          <p className="text-xs font-medium text-gray-700 mb-1.5">
            {docName ?? primary.docId}
          </p>
          {items.map((item, i) => (
            <div key={i} className="text-xs text-gray-600 border-t border-gray-100 pt-1.5 mt-1.5 first:border-t-0 first:pt-0 first:mt-0">
              {item.snippet && <p className="italic">&quot;{item.snippet}&quot;</p>}
              <p className="mt-0.5">
                Dôvera: <span className={confidenceColor(item.confidence).split(' ')[0]}>{Math.round(item.confidence * 100)}%</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
