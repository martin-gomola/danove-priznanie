'use client';

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useTaxForm } from '@/hooks/useTaxForm';
import { calculateTax } from '@/lib/tax/calculator';
import { convertToXML, defaultXmlFilename, downloadXML } from '@/lib/xml/xmlGenerator';
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
import { DocumentInbox } from '@/components/wizard/DocumentInbox';
import { StepDocumentUpload } from '@/components/wizard/StepDocumentUpload';
import { getStepBlockingIssues } from '@/lib/validation/wizard';
import { dividendToEur } from '@/lib/utils/dividendEur';
import type { DocumentInboxItem, EmploymentIncome, EvidenceItem } from '@/types/TaxForm';

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
    updateAICopilot,
    setStep,
    resetForm,
    importXml,
    saveStatus,
  } = useTaxForm();
  const toast = useToast();
  const [showStepErrors, setShowStepErrors] = useState(false);
  const [showAIConsentModal, setShowAIConsentModal] = useState(false);
  const [aiConsentModalBaseUrl, setAIConsentModalBaseUrl] = useState('');
  const aiConsentGivenThisSession = useRef(false);
  const pendingConsentResolve = useRef<((value: boolean) => void) | null>(null);

  // Calculate tax whenever form changes
  const calc = useMemo(() => calculateTax(form), [form]);

  const handleDownloadXml = useCallback(async () => {
    const hasDic = !!form.personalInfo?.dic?.trim();
    const hasDividendEntries = form.dividends.enabled && form.dividends.entries.length > 0;
    if (!hasDic) {
      toast.error('Chýba IČO/DIČ. XML bude prázdne - vyplňte krok 1 (Osobné údaje).');
      const proceed = window.confirm(
        'Nemáte vyplnené IČO/DIČ. Stiahnutý XML súbor bude prázdny a nebude ho možné odoslať. Naozaj stiahnuť?'
      );
      if (!proceed) return;
    } else if (form.dividends.enabled && !hasDividendEntries) {
      toast.info('Zapnuté dividendy, ale žiadne položky - importujte CSV/PDF alebo pridajte riadky v kroku 3.');
    }
    const xml = convertToXML(form, calc);
    const suggestedName = defaultXmlFilename(form.personalInfo?.priezvisko);
    await downloadXML(xml, suggestedName);
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

  const handleInboxUpdate = useCallback(
    (items: DocumentInboxItem[]) => {
      updateAICopilot({ documentInbox: items });
    },
    [updateAICopilot]
  );

  const handleExtractionComplete = useCallback(
    (fields: Partial<EmploymentIncome>, evidence: EvidenceItem[]) => {
      updateEmployment(fields);
      updateAICopilot({ evidence: [...(form.aiCopilot?.evidence ?? []), ...evidence] });
      toast.success('Údaje zo zamestnania vyplnené z dokumentu');
    },
    [form.aiCopilot?.evidence, updateEmployment, updateAICopilot, toast]
  );

  const handleConsentRequired = useCallback((): Promise<boolean> => {
    if (aiConsentGivenThisSession.current) return Promise.resolve(true);
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('dane-priznanie-ai-settings') : null;
      const parsed = raw ? (JSON.parse(raw) as { baseUrl?: string }) : null;
      setAIConsentModalBaseUrl(parsed?.baseUrl?.trim() ?? '');
    } catch {
      setAIConsentModalBaseUrl('');
    }
    setShowAIConsentModal(true);
    return new Promise<boolean>((resolve) => {
      pendingConsentResolve.current = resolve;
    });
  }, []);

  const handleAIConsentConfirm = useCallback(() => {
    aiConsentGivenThisSession.current = true;
    pendingConsentResolve.current?.(true);
    pendingConsentResolve.current = null;
    setShowAIConsentModal(false);
  }, []);

  const handleAIConsentCancel = useCallback(() => {
    pendingConsentResolve.current?.(false);
    pendingConsentResolve.current = null;
    setShowAIConsentModal(false);
  }, []);

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
        const { ecbRate, czkRate } = form.dividends;
        const converted = entries.map((e: { currency: 'USD' | 'EUR' | 'CZK'; amountEur: string; amountOriginal: string; withheldTaxEur: string; withheldTaxOriginal: string }) => {
          const currency = e.currency ?? 'USD';
          const amountEur = e.amountEur && parseFloat(e.amountEur) > 0
            ? e.amountEur
            : dividendToEur(e.amountOriginal, currency, ecbRate || '1.13', czkRate || '25.21');
          const withheldTaxEur = e.withheldTaxEur !== undefined && e.withheldTaxEur !== ''
            ? e.withheldTaxEur
            : dividendToEur(e.withheldTaxOriginal, currency, ecbRate || '1.13', czkRate || '25.21');
          return { ...e, amountEur, withheldTaxEur };
        });
        updateDividends({ entries: [...form.dividends.entries, ...converted], enabled: true });
        const inbox = form.aiCopilot?.documentInbox ?? [];
        handleInboxUpdate([
          ...inbox,
          {
            id: crypto.randomUUID(),
            fileName: file.name,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
            documentType: '1042s',
            parseStatus: 'parsed',
          },
        ]);
        toast.success(`Importované ${converted.length} položiek`);
      } catch {
        toast.error('Import zlyhal');
      }
    },
    [sessionToken, form.dividends.entries, form.dividends.ecbRate, form.dividends.czkRate, form.aiCopilot?.documentInbox, updateDividends, handleInboxUpdate, toast]
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
            evidence={form.aiCopilot?.evidence}
            evidenceDocName={
              form.aiCopilot?.evidence?.[0] && form.aiCopilot?.documentInbox?.length
                ? form.aiCopilot.documentInbox.find((d) => d.id === form.aiCopilot?.evidence?.[0]?.docId)?.fileName
                : undefined
            }
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
    {showAIConsentModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title">
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl max-w-md w-full">
          <h2 id="ai-consent-title" className="text-lg font-semibold text-gray-900 mb-2">
            Odoslať dokument na spracovanie?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Váš dokument bude odoslaný na <strong>{aiConsentModalBaseUrl || '(nakonfigurovaná URL)'}</strong> na extrakciu údajov.
            API kľúč sa používa priamo z vášho prehliadača, náš server ho nevidí. Chcete pokračovať?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleAIConsentCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              Zrušiť
            </button>
            <button
              type="button"
              onClick={handleAIConsentConfirm}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
            >
              Pokračovať
            </button>
          </div>
        </div>
      </div>
    )}
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
      <div className="space-y-6">
        {form.currentStep === STEP_LABELS.indexOf('Deti') && (
          <StepDocumentUpload
            documentType="childBonus"
            label="rodné listy (voliteľné)"
            hint="Priložte kópiu rodného listu dieťaťa pre prehľad. Údaje sa neextrahujú automaticky."
            documentInbox={form.aiCopilot?.documentInbox ?? []}
            onUpdateInbox={handleInboxUpdate}
          />
        )}
        {form.currentStep === STEP_LABELS.indexOf('Hypoteka') && (
          <StepDocumentUpload
            documentType="mortgage"
            label="potvrdenie o úrokoch"
            hint="Priložte potvrdenie banky o zaplatených úrokoch z hypotéky."
            documentInbox={form.aiCopilot?.documentInbox ?? []}
            onUpdateInbox={handleInboxUpdate}
          />
        )}
        {form.currentStep === STEP_LABELS.indexOf('Zamestnanie') && (
          <DocumentInbox
            documentInbox={form.aiCopilot?.documentInbox ?? []}
            onUpdateInbox={handleInboxUpdate}
            onExtractionComplete={handleExtractionComplete}
            onConsentRequired={handleConsentRequired}
          />
        )}
        {form.currentStep === STEP_LABELS.indexOf('Fondy a akcie') && (
          <StepDocumentUpload
            documentType="broker_report"
            label="výpis z fondov / obchodov"
            hint="Priložte výpis od brokera (podielové fondy alebo predaj akcií) pre prehľad."
            documentInbox={form.aiCopilot?.documentInbox ?? []}
            onUpdateInbox={handleInboxUpdate}
          />
        )}
        {renderStep()}
      </div>
    </WizardLayout>
    </>
  );
}
