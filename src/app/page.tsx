'use client';

import React, { useMemo, useCallback } from 'react';
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
  } = useTaxForm();
  const toast = useToast();

  // Calculate tax whenever form changes
  const calc = useMemo(() => calculateTax(form), [form]);

  const handleDownloadXml = useCallback(() => {
    const xml = convertToXML(form, calc);
    downloadXML(xml);
    toast.success('XML stiahnutý');
  }, [form, calc, toast]);

  const handleNext = useCallback(() => {
    setStep(Math.min(form.currentStep + 1, STEP_LABELS.length - 1));
  }, [form.currentStep, setStep]);

  const handlePrev = useCallback(() => {
    setStep(Math.max(form.currentStep - 1, 0));
  }, [form.currentStep, setStep]);

  const handleReset = useCallback(() => {
    if (window.confirm('Naozaj chcete vymazat vsetky ulozene udaje? Tato akcia sa neda vratit.')) {
      resetForm();
      toast.success('Údaje vymazané');
    }
  }, [resetForm, toast]);

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
          />
        );
      case 2:
        return (
          <Step5Mortgage
            data={form.mortgage}
            onChange={updateMortgage}
            calculatedBonus={calc.r123}
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
          />
        );
      case 4:
        return (
          <Step4MutualFunds
            data={form.mutualFunds}
            onChange={updateMutualFunds}
            stockData={form.stockSales}
            onStockChange={updateStockSales}
          />
        );
      case 5:
        return (
          <Step3Dividends
            data={form.dividends}
            onChange={updateDividends}
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
          />
        );
      case 7:
        return (
          <Step7Review
            form={form}
            calc={calc}
            onDownloadXml={handleDownloadXml}
            onGoToStep={setStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <WizardLayout
      currentStep={form.currentStep}
      totalSteps={STEP_LABELS.length}
      stepLabels={STEP_LABELS}
      onNext={handleNext}
      onPrev={handlePrev}
      onGoToStep={setStep}
      onReset={handleReset}
      onExport={handleDownloadXml}
      onImport={importXml}
      lastSaved={form.lastSaved}
    >
      {renderStep()}
    </WizardLayout>
  );
}
