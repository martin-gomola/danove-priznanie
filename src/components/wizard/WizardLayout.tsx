'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  FileDown,
  FileUp,
  Terminal,
  GithubIcon,
  Info,
  X,
} from 'lucide-react';

const NOTICE_DISMISSED_KEY = 'dane-priznanie-notice-dismissed';

interface WizardLayoutProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onNext: () => void;
  onPrev: () => void;
  onGoToStep: (step: number) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  lastSaved: string;
  children: React.ReactNode;
}

export function WizardLayout({
  currentStep,
  totalSteps,
  stepLabels,
  onNext,
  onPrev,
  onGoToStep,
  onReset,
  onExport,
  onImport,
  lastSaved,
  children,
}: WizardLayoutProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [noticeDismissed, setNoticeDismissed] = React.useState(true); // default hidden to avoid flash

  React.useEffect(() => {
    setNoticeDismissed(localStorage.getItem(NOTICE_DISMISSED_KEY) === '1');
  }, []);

  const dismissNotice = () => {
    setNoticeDismissed(true);
    localStorage.setItem(NOTICE_DISMISSED_KEY, '1');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Info notice */}
      {!noticeDismissed && (
        <div className="shrink-0 bg-slate-800 text-slate-200 text-xs relative z-50">
          <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <p className="font-medium text-slate-100">
              LocalStorage only architecture
              </p>
              <p className="text-slate-400 leading-relaxed">
                Aplikácia pokrýva priznanie pre <span className="text-slate-300">zamestnanca s príjmom z dividend a podielových fondov</span>.
                Dáta sú uložené v localStorage vášho prehliadača, nič sa neposiela na server.
                Exportujte XML pravidelne, dáta sa stratia pri vymazaní cache.
              </p>
            </div>
            <button
              onClick={dismissNotice}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors shrink-0 mt-0.5"
              aria-label="Zavrieť"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Logo */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-8 h-8 shrink-0 opacity-90">
                <defs>
                  <linearGradient id="hdr-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0f172a"/>
                    <stop offset="100%" stopColor="#1e293b"/>
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="7" fill="url(#hdr-bg)"/>
                <text x="16" y="22.5" textAnchor="middle" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="18" fill="white">D</text>
                <circle cx="24" cy="8" r="4.5" fill="#10b981"/>
                <path d="M22 8l1.5 1.5L25.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <div>
              <h1 className="text-lg font-semibold tracking-tight text-gray-900">
                Daňové priznanie
              </h1>
              <a
                href="https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 mt-0.5 hover:text-gray-700 hover:underline block"
              >
                DPFO typ B · 2025
              </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-[10px] text-gray-400 mr-2">
                  <Save className="w-3 h-3 inline mr-1 opacity-50" />
                  {new Date(lastSaved).toLocaleTimeString('sk-SK')}
                </span>
              )}
              <a
                href="/developer"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="API & AI integrácia"
              >
                <Terminal className="w-4 h-4" />
              </a>
              <button
                onClick={onExport}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Exportovať XML"
              >
                <FileDown className="w-4 h-4" />
              </button>
              <button
                onClick={handleImportClick}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Importovať z XML"
              >
                <FileUp className="w-4 h-4" />
              </button>
              <button
                onClick={onReset}
                className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-100 transition-colors"
                title="Vymazať všetky dáta"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Step indicator - no scrollbar; wraps on narrow screens */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {stepLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => onGoToStep(i)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                  whitespace-nowrap transition-all duration-200 shrink-0
                  ${
                    i === currentStep
                      ? 'bg-gray-900 text-white'
                      : i < currentStep
                      ? 'text-emerald-600 hover:bg-gray-100'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  }
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0
                    ${
                      i === currentStep
                        ? 'bg-white/20 text-white'
                        : i < currentStep
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}
                >
                  {i < currentStep ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - grows to fill space so footer stays at bottom */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">{children}</main>

      {/* Footer navigation + disclaimer */}
      <footer className="shrink-0 border-t border-gray-200 bg-white/80 backdrop-blur-xl mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onPrev}
              disabled={currentStep === 0}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0
                ${
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <ChevronLeft className="w-4 h-4" />
              Späť
            </button>

            <span className="text-xs text-gray-400 shrink-0">
              {currentStep + 1} / {totalSteps}
            </span>

            <button
              onClick={onNext}
              disabled={currentStep === totalSteps - 1}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all shrink-0
                ${
                  currentStep === totalSteps - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }
              `}
            >
              Ďalej
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 text-center">
              This application is provided as-is for informational purposes.
            </p>
            <a
              href="https://github.com/martin-gomola/danove-priznanie"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-gray-500 transition-colors"
              title="GitHub"
            >
              <GithubIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
