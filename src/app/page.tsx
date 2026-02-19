'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { useTaxForm } from '@/hooks/useTaxForm';
import { calculateTax } from '@/lib/tax/calculator';
import { convertToXML, downloadXML } from '@/lib/xml/xmlGenerator';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { Step1PersonalInfo } from '@/components/wizard/Step1PersonalInfo';
import { Step2Employment } from '@/components/wizard/Step2Employment';
import { Step3Dividends } from '@/components/wizard/Step3Dividends';
import { Step4MutualFunds } from '@/components/wizard/Step4MutualFunds';
import { Step5Mortgage } from '@/components/wizard/Step5Mortgage';
import { StepChildBonus } from '@/components/wizard/StepChildBonus';
import { Step6TwoPercent } from '@/components/wizard/Step6TwoPercent';
import { Step7Review } from '@/components/wizard/Step7Review';
import { useToast } from '@/components/ui/Toast';
import { IntroModal } from '@/components/ui/IntroModal';
import { getStepBlockingIssues } from '@/lib/validation/wizard';

const STEP_LABELS = [
  'Osobné údaje',
  'Deti',
  'Hypoteka',
  'Zamestnanie',
  'Fondy a akcie',
  'Dividendy',
  '2% dane',
  'Súhrn',
];

export default function Home() {
  const {
    form,
    isLoaded,
    sessionToken,
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
    setStep,
    resetForm,
    importXml,
    saveStatus,
  } = useTaxForm();
  const toast = useToast();
  const [showStepErrors, setShowStepErrors] = useState(false);

  // Calculate tax whenever form changes
  const calc = useMemo(() => calculateTax(form), [form]);

  const handleDownloadXml = useCallback(() => {
    const xml = convertToXML(form, calc);
    downloadXML(xml);
    toast.success('XML stiahnutý');
  }, [form, calc, toast]);

  const handleNext = useCallback(() => {
    const issues = getStepBlockingIssues(form, form.currentStep);
    if (issues.length > 0) {
      setShowStepErrors(true);
      return;
    }
    setShowStepErrors(false);
    setStep(Math.min(form.currentStep + 1, STEP_LABELS.length - 1));
  }, [form, setStep]);

  const handlePrev = useCallback(() => {
    setShowStepErrors(false);
    setStep(Math.max(form.currentStep - 1, 0));
  }, [form.currentStep, setStep]);

  const handleGoToStep = useCallback((step: number) => {
    setShowStepErrors(false);
    setStep(step);
  }, [setStep]);

  const handleReset = useCallback(() => {
    if (window.confirm('Naozaj chcete vymazat vsetky ulozene udaje? Tato akcia sa neda vratit.')) {
      resetForm();
      toast.success('Údaje vymazané');
    }
  }, [resetForm, toast]);

  const handleImportDividends = useCallback(
    async (file: File) => {
      if (!sessionToken) {
        toast.error('Chýba session token. Obnovte stránku.');
        return;
      }
      try {
        const formData = new FormData();
        formData.set('file', file);
        const res = await fetch('/api/dividends/import', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error ?? 'Import zlyhal');
          return;
        }
        const entries = data?.entries ?? [];
        if (entries.length === 0) {
          toast.error('V súbore sa nenašli žiadne dividendy.');
          return;
        }
        const ecbRate = form.dividends.ecbRate || '1.13';
        const usdToEur = (amount: string, rate: string) => {
          const a = parseFloat(amount) || 0;
          const r = parseFloat(rate) || 1.13;
          if (!r) return '';
          return (a / r).toFixed(2);
        };
        const converted = entries.map((e: { currency: string; amountEur: string; amountOriginal: string; withheldTaxEur: string; withheldTaxOriginal: string }) =>
          e.currency === 'USD' && !e.amountEur && e.amountOriginal
            ? { ...e, amountEur: usdToEur(e.amountOriginal, ecbRate), withheldTaxEur: usdToEur(e.withheldTaxOriginal, ecbRate) }
            : e
        );
        updateDividends({ entries: [...form.dividends.entries, ...converted], enabled: true });
        toast.success(`Importované ${converted.length} položiek`);
      } catch {
        toast.error('Import zlyhal');
      }
    },
    [sessionToken, form.dividends.entries, form.dividends.ecbRate, updateDividends, toast]
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Nacitavam...</div>
      </div>
    );
  }

  const renderStep = () => {
    switch (form.currentStep) {
      case 0:
        return (
          <Step1PersonalInfo
            data={form.personalInfo}
            onChange={updatePersonalInfo}
            onImport={importXml}
            showErrors={showStepErrors}
          />
        );
      case 1:
        return (
          <StepChildBonus
            data={form.childBonus}
            onChange={updateChildBonus}
            calculatedBonus={calc.r117}
            spouse={form.spouse}
            onSpouseChange={updateSpouse}
            calculatedR74={calc.r74}
            showErrors={showStepErrors}
          />
        );
      case 2:
        return (
          <Step5Mortgage
            data={form.mortgage}
            onChange={updateMortgage}
            calculatedBonus={calc.r123}
            showErrors={showStepErrors}
          />
        );
      case 3:
        return (
          <Step2Employment
            data={form.employment}
            onChange={updateEmployment}
            calculatedR38={calc.r38}
            dds={form.dds}
            onDdsChange={updateDds}
            calculatedR75={calc.r75}
            showErrors={showStepErrors}
          />
        );
      case 4:
        return (
          <Step4MutualFunds
            data={form.mutualFunds}
            onChange={updateMutualFunds}
            stockData={form.stockSales}
            onStockChange={updateStockSales}
            showErrors={showStepErrors}
          />
        );
      case 5:
        return (
          <Step3Dividends
            data={form.dividends}
            onChange={updateDividends}
            onImportFile={handleImportDividends}
            showErrors={showStepErrors}
          />
        );
      case 6:
        return (
          <Step6TwoPercent
            data={form.twoPercent}
            onChange={updateTwoPercent}
            calculatedAmount={calc.r152}
            parentData={form.parentAllocation}
            onParentChange={updateParentAllocation}
            calculatedPerParent={calc.parentAllocPerParent}
            showErrors={showStepErrors}
          />
        );
      case 7:
        return (
          <Step7Review
            form={form}
            calc={calc}
            onDownloadXml={handleDownloadXml}
            onGoToStep={handleGoToStep}
          />
        );
      default:
        return null;
    }
  };

  // Steps 0 (Osobné údaje) and 7 (Súhrn) have no margin notes
  const hasAsideNotes = form.currentStep !== 0 && form.currentStep !== STEP_LABELS.length - 1;

  return (
    <>
    <IntroModal />
    <WizardLayout
      currentStep={form.currentStep}
      totalSteps={STEP_LABELS.length}
      stepLabels={STEP_LABELS}
      onNext={handleNext}
      onPrev={handlePrev}
      onGoToStep={handleGoToStep}
      onReset={handleReset}
      onExport={handleDownloadXml}
      onImport={importXml}
      lastSaved={form.lastSaved}
      saveStatus={saveStatus}
      hasAsideNotes={hasAsideNotes}
    >
      {renderStep()}
    </WizardLayout>
    </>
  );
}
