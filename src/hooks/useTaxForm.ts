'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { TaxFormData, DEFAULT_TAX_FORM } from '@/types/TaxForm';
import { parseDpfoXmlToFormData } from '@/lib/utils/parseDpfoXml';
import { useToast } from '@/components/ui/Toast';
import { INTRO_DISMISSED_KEY } from '@/components/ui/IntroModal';
import { applyExternalFormUpdate, hydrateTaxFormData, mergeTaxFormData, resetTaxFormData } from '@/lib/form/formState';

const STORAGE_KEY = 'dane-priznanie-2025';
const SESSION_TOKEN_KEY = 'dane-priznanie-session-token';

/** Get or create a per-browser session token (random UUID stored in localStorage). */
function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Custom hook for managing the tax form state with localStorage persistence.
 */
export function useTaxForm() {
  const toast = useToast();
  const [form, setForm] = useState<TaxFormData>(() => {
    if (typeof window === 'undefined') return DEFAULT_TAX_FORM;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? hydrateTaxFormData(JSON.parse(saved) as Partial<TaxFormData>) : DEFAULT_TAX_FORM;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to load saved form data:', e);
      }
      return DEFAULT_TAX_FORM;
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const saveTimerRef = useRef<number | null>(null);

  const markSaving = useCallback(() => {
    setSaveStatus('saving');
    if (typeof window === 'undefined') return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => setSaveStatus('saved'), 250);
  }, []);

  // Mark browser-only session state ready after hydration.
  useEffect(() => {
    queueMicrotask(() => {
      setSessionToken(getSessionToken());
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Sync session token across tabs (e.g. when changed on /developer page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_TOKEN_KEY && e.newValue) {
        setSessionToken(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Poll for pending form updates from external tools (MCP / Cursor skill / Claude Code).
  // GET /api/form with X-Session-Token header (avoids token in URL/logs).
  useEffect(() => {
    if (!isLoaded || !sessionToken) return;
    const POLL_INTERVAL = 3_000;

    const poll = async () => {
      try {
        const res = await fetch('/api/form', {
          headers: { 'X-Session-Token': sessionToken },
        });
        if (!res.ok) return;
        const { data } = await res.json();
        if (!data || typeof data !== 'object') return;

        setForm((prev) => applyExternalFormUpdate(prev, data));
        toast.success('Údaje boli doplnené z externého nástroja');
      } catch {
        // Silently ignore - API might not be available
      }
    };

    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [isLoaded, sessionToken, toast]);

  // Save to localStorage whenever form changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const toSave = {
        ...form,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to save form data:', e);
      }
    }
  }, [form, isLoaded]);

  const updateForm = useCallback((updates: Partial<TaxFormData>) => {
    markSaving();
    setForm((prev) => ({ ...prev, ...updates }));
  }, [markSaving]);

  const updatePersonalInfo = useCallback(
    (updates: Partial<TaxFormData['personalInfo']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...updates },
      }));
    },
    [markSaving]
  );

  const updateEmployment = useCallback(
    (updates: Partial<TaxFormData['employment']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        employment: { ...prev.employment, ...updates },
      }));
    },
    [markSaving]
  );

  const updateDividends = useCallback(
    (updates: Partial<TaxFormData['dividends']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        dividends: { ...prev.dividends, ...updates },
      }));
    },
    [markSaving]
  );

  const updateMutualFunds = useCallback(
    (updates: Partial<TaxFormData['mutualFunds']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        mutualFunds: { ...prev.mutualFunds, ...updates },
      }));
    },
    [markSaving]
  );

  const updateStockSales = useCallback(
    (updates: Partial<TaxFormData['stockSales']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        stockSales: { ...prev.stockSales, ...updates },
      }));
    },
    [markSaving]
  );

  const updateMortgage = useCallback(
    (updates: Partial<TaxFormData['mortgage']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        mortgage: { ...prev.mortgage, ...updates },
      }));
    },
    [markSaving]
  );

  const updateSpouse = useCallback(
    (updates: Partial<TaxFormData['spouse']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        spouse: { ...prev.spouse, ...updates },
      }));
    },
    [markSaving]
  );

  const updateDds = useCallback(
    (updates: Partial<TaxFormData['dds']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        dds: { ...prev.dds, ...updates },
      }));
    },
    [markSaving]
  );

  const updateChildBonus = useCallback(
    (updates: Partial<TaxFormData['childBonus']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        childBonus: { ...prev.childBonus, ...updates },
      }));
    },
    [markSaving]
  );

  const updateTwoPercent = useCallback(
    (updates: Partial<TaxFormData['twoPercent']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        twoPercent: { ...prev.twoPercent, ...updates },
      }));
    },
    [markSaving]
  );

  const updateParentAllocation = useCallback(
    (updates: Partial<TaxFormData['parentAllocation']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        parentAllocation: { ...prev.parentAllocation, ...updates },
      }));
    },
    [markSaving]
  );

  const updateRefundRequest = useCallback(
    (updates: Partial<TaxFormData['refundRequest']>) => {
      markSaving();
      setForm((prev) => ({
        ...prev,
        refundRequest: { ...prev.refundRequest, ...updates },
      }));
    },
    [markSaving]
  );

  const setStep = useCallback((step: number) => {
    markSaving();
    setForm((prev) => ({ ...prev, currentStep: step }));
  }, [markSaving]);

  const resetForm = useCallback(() => {
    markSaving();
    setForm(resetTaxFormData());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INTRO_DISMISSED_KEY);
  }, [markSaving]);

  /** Import form from DPFO XML (same format as real form / export). */
  const importXml = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xml = e.target?.result as string;
          const parsed = parseDpfoXmlToFormData(xml);
          setForm(mergeTaxFormData(DEFAULT_TAX_FORM, parsed));
          markSaving();
          toast.success('XML importované');
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to import XML:', err);
          }
          toast.error('Neplatný súbor. Nahrajte XML súbor (DPFO priznanie).');
        }
      };
      reader.readAsText(file);
    },
    [toast, markSaving]
  );

  return {
    form,
    isLoaded,
    sessionToken,
    saveStatus,
    updateForm,
    updatePersonalInfo,
    updateEmployment,
    updateDividends,
    updateMutualFunds,
    updateStockSales,
    updateMortgage,
    updateSpouse,
    updateDds,
    updateChildBonus,
    updateTwoPercent,
    updateParentAllocation,
    updateRefundRequest,
    setStep,
    resetForm,
    importXml,
  };
}
