'use client';

import { useState, useCallback, useEffect } from 'react';
import { TaxFormData, DEFAULT_TAX_FORM } from '@/types/TaxForm';
import { parseDpfoXmlToFormData } from '@/lib/utils/parseDpfoXml';
import { useToast } from '@/components/ui/Toast';

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
  const [form, setForm] = useState<TaxFormData>(DEFAULT_TAX_FORM);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sessionToken, setSessionToken] = useState('');

  // Load from localStorage on mount - deep-merge each section so newly added
  // fields (e.g. czkRate) get their defaults even when saved data is older.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TaxFormData>;
        setForm({
          ...DEFAULT_TAX_FORM,
          ...parsed,
          personalInfo: { ...DEFAULT_TAX_FORM.personalInfo, ...parsed.personalInfo },
          employment: { ...DEFAULT_TAX_FORM.employment, ...parsed.employment },
          dividends: { ...DEFAULT_TAX_FORM.dividends, ...parsed.dividends },
          mutualFunds: { ...DEFAULT_TAX_FORM.mutualFunds, ...parsed.mutualFunds },
          mortgage: { ...DEFAULT_TAX_FORM.mortgage, ...parsed.mortgage },
          spouse: { ...DEFAULT_TAX_FORM.spouse, ...parsed.spouse },
          childBonus: { ...DEFAULT_TAX_FORM.childBonus, ...parsed.childBonus },
          twoPercent: { ...DEFAULT_TAX_FORM.twoPercent, ...parsed.twoPercent },
        });
      }
    } catch (e) {
      console.warn('Failed to load saved form data:', e);
    }
    setSessionToken(getSessionToken());
    setIsLoaded(true);
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
  // GET /api/form?session=<token> returns { data: null } when idle, or { data: {...} } with a queued update.
  useEffect(() => {
    if (!isLoaded || !sessionToken) return;
    const POLL_INTERVAL = 3_000;

    const poll = async () => {
      try {
        const res = await fetch(`/api/form?session=${encodeURIComponent(sessionToken)}`);
        if (!res.ok) return;
        const { data } = await res.json();
        if (!data || typeof data !== 'object') return;

        // Deep-merge each section so partial updates work correctly
        setForm((prev) => {
          const next = { ...prev, ...data } as TaxFormData;
          if (data.personalInfo) next.personalInfo = { ...prev.personalInfo, ...data.personalInfo };
          if (data.employment) next.employment = { ...prev.employment, ...data.employment };
          if (data.dividends) next.dividends = { ...prev.dividends, ...data.dividends };
          if (data.mutualFunds) next.mutualFunds = { ...prev.mutualFunds, ...data.mutualFunds };
          if (data.mortgage) next.mortgage = { ...prev.mortgage, ...data.mortgage };
          if (data.spouse) next.spouse = { ...prev.spouse, ...data.spouse };
          if (data.childBonus) next.childBonus = { ...prev.childBonus, ...data.childBonus };
          if (data.twoPercent) next.twoPercent = { ...prev.twoPercent, ...data.twoPercent };
          return next;
        });
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
      console.warn('Failed to save form data:', e);
    }
  }, [form, isLoaded]);

  const updateForm = useCallback((updates: Partial<TaxFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const updatePersonalInfo = useCallback(
    (updates: Partial<TaxFormData['personalInfo']>) => {
      setForm((prev) => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...updates },
      }));
    },
    []
  );

  const updateEmployment = useCallback(
    (updates: Partial<TaxFormData['employment']>) => {
      setForm((prev) => ({
        ...prev,
        employment: { ...prev.employment, ...updates },
      }));
    },
    []
  );

  const updateDividends = useCallback(
    (updates: Partial<TaxFormData['dividends']>) => {
      setForm((prev) => ({
        ...prev,
        dividends: { ...prev.dividends, ...updates },
      }));
    },
    []
  );

  const updateMutualFunds = useCallback(
    (updates: Partial<TaxFormData['mutualFunds']>) => {
      setForm((prev) => ({
        ...prev,
        mutualFunds: { ...prev.mutualFunds, ...updates },
      }));
    },
    []
  );

  const updateMortgage = useCallback(
    (updates: Partial<TaxFormData['mortgage']>) => {
      setForm((prev) => ({
        ...prev,
        mortgage: { ...prev.mortgage, ...updates },
      }));
    },
    []
  );

  const updateSpouse = useCallback(
    (updates: Partial<TaxFormData['spouse']>) => {
      setForm((prev) => ({
        ...prev,
        spouse: { ...prev.spouse, ...updates },
      }));
    },
    []
  );

  const updateChildBonus = useCallback(
    (updates: Partial<TaxFormData['childBonus']>) => {
      setForm((prev) => ({
        ...prev,
        childBonus: { ...prev.childBonus, ...updates },
      }));
    },
    []
  );

  const updateTwoPercent = useCallback(
    (updates: Partial<TaxFormData['twoPercent']>) => {
      setForm((prev) => ({
        ...prev,
        twoPercent: { ...prev.twoPercent, ...updates },
      }));
    },
    []
  );

  const setStep = useCallback((step: number) => {
    setForm((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_TAX_FORM);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /** Import form from DPFO XML (same format as real form / export). */
  const importXml = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xml = e.target?.result as string;
          const parsed = parseDpfoXmlToFormData(xml);
          setForm({
            ...DEFAULT_TAX_FORM,
            ...parsed,
            dividends: { ...DEFAULT_TAX_FORM.dividends, ...parsed.dividends },
          });
          toast.success('XML importované');
        } catch (err) {
          console.error('Failed to import XML:', err);
          toast.error('Neplatný súbor. Nahrajte XML súbor (DPFO priznanie).');
        }
      };
      reader.readAsText(file);
    },
    [toast]
  );

  return {
    form,
    isLoaded,
    sessionToken,
    updateForm,
    updatePersonalInfo,
    updateEmployment,
    updateDividends,
    updateMutualFunds,
    updateMortgage,
    updateSpouse,
    updateChildBonus,
    updateTwoPercent,
    setStep,
    resetForm,
    importXml,
  };
}
