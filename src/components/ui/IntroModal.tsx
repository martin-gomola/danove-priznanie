'use client';

import React, { useRef, useEffect } from 'react';
import { HardDrive, ShieldCheck, FileDown, Check, CalendarClock } from 'lucide-react';

export const INTRO_DISMISSED_KEY = 'dane-priznanie-notice-dismissed';

interface IntroModalProps {
  onDismiss: () => void;
}

const SUPPORTED_ITEMS = [
  'Zamestnanie',
  'Dividendy',
  'Podielové fondy a akcie',
  'Hypoteka - daňový bonus na zaplatené úroky',
  'Deti - daňový bonus na dieťa',
  '2% dane',
];

function IntroModalContent({ onDismiss }: IntroModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first && last) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last && first) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-hidden="false">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-[fadeIn_300ms_ease-out]"
        onClick={onDismiss}
      />

      {/* Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-modal-title"
        className="relative w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden animate-[slideUp_350ms_ease-out]"
      >
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-stone-300 via-stone-400 to-stone-300" />

        <div className="px-8 pt-8 pb-6">
          {/* Logo + title */}
          <div className="flex items-center gap-3 mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-10 h-10 shrink-0">
              <defs>
                <linearGradient id="intro-bg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="url(#intro-bg)" />
              <text
                x="16"
                y="22.5"
                textAnchor="middle"
                fontFamily="system-ui,sans-serif"
                fontWeight="700"
                fontSize="18"
                fill="white"
              >
                D
              </text>
              <circle cx="24" cy="8" r="4.5" fill="#10b981" />
              <path
                d="M22 8l1.5 1.5L25.5 6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div>
              <h2 id="intro-modal-title" className="font-heading text-xl font-semibold text-gray-900 leading-tight">
                Daňové priznanie
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                DPFO typ B · za rok 2025
              </p>
            </div>
          </div>

          {/* Scope description */}
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Vyplňte daňové priznanie pre{' '}
            <span className="text-gray-800 font-medium">zamestnanca s príjmom z dividend, podielových fondov a akcií</span>.
            Podporujeme aj odpočet hypotéky a daňové bonusy na deti. Aplikácia vás prevedie krok za krokom a vygeneruje XML na podanie cez portál Finančnej správy.
          </p>

          {/* Supported scenarios */}
          <ul className="space-y-2 mb-5">
            {SUPPORTED_ITEMS.map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          {/* Deadline callout */}
          <div className="flex items-center gap-2 text-sm text-stone-600 mb-5">
            <CalendarClock className="w-4 h-4 text-stone-500 shrink-0" />
            <span>Termín podania: 31.3.2026</span>
          </div>

          {/* Privacy strip */}
          <div className="flex flex-wrap items-center gap-4 py-4 border-t border-stone-200 mb-6">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <HardDrive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>Lokálne</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <FileDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>Export XML</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>Bez registrácie</span>
            </div>
          </div>

          {/* CTA */}
          <button
            ref={buttonRef}
            type="button"
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium
              hover:bg-gray-800 active:bg-gray-950 transition-colors duration-150 cursor-pointer"
          >
            Začať vyplňovanie
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Shows a one-time intro modal on first visit.
 * Persists dismissal to localStorage so it never shows again.
 */
export function IntroModal() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    // Only show if not previously dismissed
    if (localStorage.getItem(INTRO_DISMISSED_KEY) !== '1') {
      setShow(true);
    }
  }, []);

  const dismiss = React.useCallback(() => {
    setShow(false);
    localStorage.setItem(INTRO_DISMISSED_KEY, '1');
  }, []);

  if (!show) return null;

  return <IntroModalContent onDismiss={dismiss} />;
}
