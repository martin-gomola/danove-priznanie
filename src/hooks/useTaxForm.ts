'use client';

import { useState, useCallback, useEffect } from 'react';
import { TaxFormData, DEFAULT_TAX_FORM } from '@/types/TaxForm';
import { parseDpfoXmlToFormData } from '@/lib/utils/parseDpfoXml';
import { useToast } from '@/components/ui/Toast';

const STORAGE_KEY = 'dane-priznanie-2025';

/**
 * Custom hook for managing the tax form state with localStorage persistence.
 */
export function useTaxForm() {
  const toast = useToast();
  const [form, setForm] = useState<TaxFormData>(DEFAULT_TAX_FORM);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount (merge with defaults so new keys like childBonus exist)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TaxFormData>;
        setForm({ ...DEFAULT_TAX_FORM, ...parsed });
      }
    } catch (e) {
      console.warn('Failed to load saved form data:', e);
    }
    setIsLoaded(true);
  }, []);

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
          setForm({ ...DEFAULT_TAX_FORM, ...parsed });
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
