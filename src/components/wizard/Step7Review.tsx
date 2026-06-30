'use client';

import React, { useState, useMemo } from 'react';
import { TaxFormData, TaxCalculationResult, RefundRequest } from '@/types/TaxForm';
import { SectionCard, FormField, Input, InfoBox } from '@/components/ui/FormField';
import { Download, FileText, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, ExternalLink, ArrowRight, Banknote } from 'lucide-react';
import { getValidationWarnings } from '@/lib/validation/wizard';
import { safeDecimal, fmtEur } from '@/lib/utils/decimal';
import { taxRowLabelsFromCalculation, TaxRowId } from '@/lib/tax/taxRowLabels';

interface Props {
  form: TaxFormData;
  calc: TaxCalculationResult;
  onDownloadXml: () => void;
  onGoToStep: (step: number) => void;
  onUpdateRefund: (updates: Partial<RefundRequest>) => void;
}

function Row({
  label,
  value,
  row,
  highlight,
  indent,
  numeric = true,
}: {
  label: string;
  value: string;
  row?: string;
  highlight?: 'green' | 'red' | 'amber';
  indent?: boolean;
  /** If false, show value as plain text (e.g. IČO, názov); if true, format as number + EUR */
  numeric?: boolean;
}) {
  const colorMap = {
    green: 'text-emerald-600',
    red: 'text-red-500',
    amber: 'text-amber-600',
  };
  const valueColor = highlight ? colorMap[highlight] : 'text-gray-900';

  const displayValue = numeric
    ? (value && !safeDecimal(value).isZero() ? `${fmtEur(value)} EUR` : '--')
    : (value || '--');

  return (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-4' : ''}`}>
      <span className="text-xs text-gray-600">
        {row && <span className="text-gray-600 font-mono mr-2">{row}</span>}
        {label}
      </span>
      <span className={`text-sm font-medium ${numeric ? 'tabular-nums' : ''} ${valueColor} ${!numeric && value ? 'text-right max-w-[60%] truncate' : ''}`} title={!numeric && value ? value : undefined}>
        {displayValue}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-200 my-1" />;
}

/** Format IBAN with spaces every 4 characters for display */
function formatIban(raw: string): string {
  return raw.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

/** Validate IBAN: basic check for SK IBAN (SK + 2 digits + 20 digits = 24 chars) */
function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (!clean) return false;
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(clean) && clean.length >= 15 && clean.length <= 34;
}

export function Step7Review({ form, calc, onDownloadXml, onGoToStep, onUpdateRefund }: Props) {
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const warnings = useMemo(() => getValidationWarnings(form), [form]);
  const taxRows = useMemo(() => taxRowLabelsFromCalculation(calc), [calc]);
  const taxRowLabel = (row: TaxRowId) => taxRows.label(row);
  const documents: { label: string; needed: boolean; mandatory?: boolean }[] = [
    {
      label: 'Potvrdenie o zdaniteľných príjmoch (od zamestnávateľa)',
      needed: form.employment.enabled,
      mandatory: true,
    },
    {
      label: 'Výkazy dividend od brokera (1042-S alebo ekvivalent)',
      needed: form.dividends.enabled,
    },
    {
      label: 'Výkazy/potvrdenia k podielovým fondom (§7)',
      needed: form.mutualFunds.enabled,
    },
    {
      label: 'Výkazy z obchodovania s akciami (§8)',
      needed: form.stockSales.enabled,
    },
    {
      label: 'Potvrdenie o zaplatených úrokoch z hypotéky (od banky) + zmluva o úvere',
      needed: form.mortgage.enabled,
    },
    {
      label: 'Potvrdenie o dobrovoľníckej činnosti (pre 3%)',
      needed: form.twoPercent.enabled && form.twoPercent.splnam3per,
    },
    {
      label: 'Kópia rozhodnutia o zverení do starostlivosti (§50aa)',
      needed: form.parentAllocation.choice !== 'none' && form.parentAllocation.osvojeny,
    },
  ];

  const neededDocs = documents.filter((d) => d.needed);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
          SÚHRN
        </h2>
        <p className="text-sm text-gray-600">
          Kontrola výpočtu dane a export XML
        </p>
      </div>

      {/* Validation warnings */}
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-amber-800">
              Chýbajúce povinné údaje ({warnings.length})
            </h3>
          </div>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-center justify-between text-xs">
                <span className="text-amber-800">
                  <span className="font-medium">{w.section}</span>
                  <span className="text-amber-600 mx-1.5">›</span>
                  {w.field}
                </span>
                <button
                  type="button"
                  onClick={() => onGoToStep(w.step)}
                  className="text-amber-700 hover:text-amber-900 underline decoration-amber-300 hover:decoration-amber-500 transition-colors ml-3 flex-shrink-0"
                >
                  Opraviť
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final result card */}
      <div
        className={`rounded-2xl border p-6 ${
          calc.isRefund
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">
            {calc.isRefund ? 'Daňový preplatok (vrátka)' : 'Daň na úhradu (doplatok)'}
          </p>
          <p
            className={`font-heading text-4xl font-bold tabular-nums ${
              calc.isRefund ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {calc.isRefund ? '+' : ''}{fmtEur(calc.isRefund ? calc.finalTaxRefund : calc.finalTaxToPay)} EUR
          </p>
        </div>
      </div>

      {/* XIV. Oddiel: Refund / bonus payout request */}
      {(() => {
        const hasRefund = parseFloat(calc.r136) > 0;
        const hasChildBonusPayout = parseFloat(calc.r121) > 0;
        const hasMortgageBonusPayout = parseFloat(calc.r127) > 0;
        const needsPayment = hasRefund || hasChildBonusPayout || hasMortgageBonusPayout;
        if (!needsPayment) return null;
        const { refundRequest } = form;
        const ibanClean = refundRequest.iban.replace(/\s/g, '');
        const ibanValid = !ibanClean || isValidIban(ibanClean);
        return (
          <SectionCard
            title="XIV. ODDIEL - Žiadosť o vrátenie preplatku"
            subtitle="Zadajte IBAN pre vrátenie preplatku alebo vyplatenie bonusu"
          >
            <div className="space-y-3">
              {hasRefund && (
                <label className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundRequest.vratitPreplatok}
                    onChange={(e) => onUpdateRefund({ vratitPreplatok: e.target.checked })}
                    className="rounded border-gray-300 accent-emerald-600"
                  />
                  <Banknote className="w-4 h-4 flex-shrink-0" />
                  Žiadam o vrátenie daňového preplatku: <strong>{fmtEur(calc.r136)} EUR</strong>
                </label>
              )}
              {hasChildBonusPayout && (
                <label className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundRequest.vyplatitDanovyBonus}
                    onChange={(e) => onUpdateRefund({ vyplatitDanovyBonus: e.target.checked })}
                    className="rounded border-gray-300 accent-emerald-600"
                  />
                  <Banknote className="w-4 h-4 flex-shrink-0" />
                  Žiadam o vyplatenie daňového bonusu na deti: <strong>{fmtEur(calc.r121)} EUR</strong>
                </label>
              )}
              {hasMortgageBonusPayout && (
                <label className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundRequest.vyplatitDanovyBonusUroky}
                    onChange={(e) => onUpdateRefund({ vyplatitDanovyBonusUroky: e.target.checked })}
                    className="rounded border-gray-300 accent-emerald-600"
                  />
                  <Banknote className="w-4 h-4 flex-shrink-0" />
                  Žiadam o vyplatenie daňového bonusu na úroky: <strong>{fmtEur(calc.r127)} EUR</strong>
                </label>
              )}
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={refundRequest.paymentMethod === 'ucet'}
                    onChange={() => onUpdateRefund({ paymentMethod: 'ucet' })}
                    className="accent-emerald-600"
                  />
                  Na účet (IBAN)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={refundRequest.paymentMethod === 'poukazka'}
                    onChange={() => onUpdateRefund({ paymentMethod: 'poukazka' })}
                    className="accent-emerald-600"
                  />
                  Poštová poukážka
                </label>
              </div>
              {refundRequest.paymentMethod === 'ucet' && (
                <FormField label="IBAN" hint="Napr. SK31 1200 0000 1987 4263 7541">
                  <Input
                    value={formatIban(refundRequest.iban)}
                    onChange={(e) => onUpdateRefund({ iban: e.target.value.replace(/\s/g, '') })}
                    placeholder="SK31 1200 0000 1987 4263 7541"
                    maxLength={42}
                  />
                  {!ibanValid && ibanClean.length > 0 && (
                    <p className="text-xs text-red-500 mt-1">Neplatný formát IBAN</p>
                  )}
                </FormField>
              )}
            </div>
          </SectionCard>
        );
      })()}

      {/* Employment Section */}
      {form.employment.enabled && (
        <SectionCard title="Oddiel V - Príjem zo závislej činnosti (§5)">
          <div className="space-y-0.5">
            <Row row="r.36" label="Úhrn príjmov (brutto)" value={form.employment.r36} />
            <Row row="r.37" label="Povinné poistné" value={form.employment.r37} />
            <Divider />
            <Row row="r.38" label={taxRowLabel('r38')} value={taxRows.value('r38')} highlight="amber" />
            {form.employment.r36a && (
              <Row row="r.36a" label="Príjmy z dohôd" value={form.employment.r36a} />
            )}
            {form.employment.r131Dohody && safeDecimal(form.employment.r131Dohody).gt(0) && (
              <Row row="r.04a" label="Preddavky z dohôd" value={form.employment.r131Dohody} indent />
            )}
          </div>
        </SectionCard>
      )}

      {/* Mutual Funds Section */}
      {form.mutualFunds.enabled && (
        <SectionCard title="Oddiel VII: Kapitálový majetok (§7)">
          <div className="space-y-0.5">
            <Row label="Tabuľka 2, r.7 stĺ.1: Príjem z predaja" value={calc.totalFundIncome} />
            <Row label="Tabuľka 2, r.7 stĺ.2: Výdavky (nákupná cena)" value={calc.totalFundExpense} />
            <Divider />
            <Row row="r.66" label={taxRowLabel('r66')} value={taxRows.value('r66')} />
            <Row row="r.67" label={taxRowLabel('r67')} value={taxRows.value('r67')} />
            <Row row="r.68" label={taxRowLabel('r68')} value={taxRows.value('r68')} highlight="amber" />
          </div>
          <div className="mt-3">
            <InfoBox variant="info">
              Príjem z podielových fondov sa zdaňuje <strong>jednotnou sadzbou 19&nbsp;%</strong> (nie progresívnou 19&nbsp;/&nbsp;25&nbsp;% ako pri zamestnaní).
            </InfoBox>
          </div>
        </SectionCard>
      )}

      {/* Stock Sales Section (§8) */}
      {form.stockSales.enabled && (
        <SectionCard title="Oddiel VIII: Ostatné príjmy (§8) - predaj akcií">
          <div className="space-y-0.5">
            <Row row="r.69" label={taxRowLabel('r69')} value={taxRows.value('r69')} />
            <Row row="r.70" label={taxRowLabel('r70')} value={taxRows.value('r70')} />
            <Row row="r.71" label={taxRowLabel('r71')} value={taxRows.value('r71')} highlight="amber" />
          </div>
          <div className="mt-3">
            <InfoBox variant="info">
              Príjem z predaja akcií (držaných menej ako 1 rok) sa započítava do <strong>r.80</strong> a zdaňuje sa <strong>progresívnou sadzbou 19&nbsp;/&nbsp;25&nbsp;%</strong> spolu so mzdou. Základ dane (r.71) je znížený o <strong>oslobodenie do 500&nbsp;EUR</strong> (raz za priznanie).
            </InfoBox>
          </div>
        </SectionCard>
      )}

      {/* Dividends Section */}
      {form.dividends.enabled && (
        <SectionCard title="Príloha č.2 - Podiely na zisku (§51e)">
          <div className="space-y-0.5">
            <Row row="pr.01" label={taxRowLabel('pril2_pr1')} value={taxRows.value('pril2_pr1')} />
            <Row row="pr.07" label={taxRowLabel('pril2_pr7')} value={taxRows.value('pril2_pr7')} />
            <Row row="pr.08" label={taxRowLabel('pril2_pr8')} value="7%" />
            <Row row="pr.09" label={taxRowLabel('pril2_pr9')} value={taxRows.value('pril2_pr9')} />
            <Divider />
            {safeDecimal(calc.totalWithheldTaxEur).gt(0) && (
              <>
                <Row row="pr.14" label={taxRowLabel('pril2_pr14')} value={taxRows.value('pril2_pr14')} />
                <Row row="pr.17" label={taxRowLabel('pril2_pr17')} value={taxRows.value('pril2_pr17')} highlight="green" />
              </>
            )}
            <Row
              row="pr.18"
              label={taxRowLabel('pril2_pr18')}
              value={taxRows.value('pril2_pr18')}
              highlight={safeDecimal(calc.pril2_pr18).isZero() ? 'green' : 'amber'}
            />
            <Row row="pr.28" label={taxRowLabel('pril2_pr28')} value={taxRows.value('pril2_pr28')} highlight="amber" />
          </div>
          {safeDecimal(calc.pril2_pr18).isZero() && safeDecimal(calc.totalWithheldTaxEur).gt(0) && (
            <InfoBox variant="success">
              Zahraničná zrážková daň prevyšuje slovenskú sadzbu 7% - žiadna ďalšia daň z dividend.
            </InfoBox>
          )}
        </SectionCard>
      )}

      {/* Tax Calculation */}
      <SectionCard title="Oddiel IX - Výpočet dane">
        <div className="space-y-0.5">
          {/* NCZD */}
          <Row row="r.72" label={taxRowLabel('r72')} value={taxRows.value('r72')} />
          <Row row="r.73" label={taxRowLabel('r73')} value={taxRows.value('r73')} />
          {form.spouse?.enabled && (
            <Row row="r.74" label={taxRowLabel('r74')} value={taxRows.value('r74')} />
          )}
          {form.dds?.enabled && safeDecimal(calc.r75).gt(0) && (
            <Row row="r.75" label={taxRowLabel('r75')} value={taxRows.value('r75')} />
          )}
          <Row row="r.77" label={taxRowLabel('r77')} value={taxRows.value('r77')} />
          <Divider />
          <Row row="r.78" label={taxRowLabel('r78')} value={taxRows.value('r78')} />

          {/* Tax base */}
          <Row
            row="r.80"
            label={`${taxRowLabel('r80')}${form.stockSales.enabled ? ' (r.78 + r.71)' : ''}`}
            value={taxRows.value('r80')}
          />
          <Divider />

          {/* Taxes */}
          <Row row="r.81" label={taxRowLabel('r81')} value={taxRows.value('r81')} />
          <Row row="r.90" label={taxRowLabel('r90')} value={taxRows.value('r90')} />

          {form.mutualFunds.enabled && (
            <>
              <Divider />
              <Row row="r.106" label={taxRowLabel('r106')} value={taxRows.value('r106')} />
              <Row row="r.115" label={taxRowLabel('r115')} value={taxRows.value('r115')} />
            </>
          )}

          <Divider />
          <Row row="r.116" label={taxRowLabel('r116')} value={taxRows.value('r116')} highlight="amber" />
          <InfoBox variant="info">
            r.116 = r.90 (daň zo zamestnania a §8){form.mutualFunds.enabled ? ' + r.115 (daň z fondov)' : ''}{form.dividends.enabled ? ' + príl.2 r.28 (daň z dividend)' : ''}
          </InfoBox>

          {/* Bonuses */}
          {form.childBonus?.enabled && form.childBonus.childrenChoice === 'yes' &&
            form.childBonus.partnerSharing?.enabled && safeDecimal(calc.r116a).gt(0) && (
            <Row row="r.116a" label={taxRowLabel('r116a')} value={taxRows.value('r116a')} />
          )}
          <Row row="r.117" label={taxRowLabel('r117')} value={taxRows.value('r117')} />
          <Row row="r.118" label={taxRowLabel('r118')} value={taxRows.value('r118')} />
          {form.childBonus?.enabled && form.childBonus.childrenChoice === 'yes' && (
            <>
              <Row row="r.119" label={taxRowLabel('r119')} value={taxRows.value('r119')} />
              <Row row="r.120" label={taxRowLabel('r120')} value={taxRows.value('r120')} />
              <Row row="r.121" label={taxRowLabel('r121')} value={taxRows.value('r121')} highlight="green" />
              {safeDecimal(calc.r122).gt(0) && (
                <Row row="r.122" label={taxRowLabel('r122')} value={taxRows.value('r122')} highlight="red" />
              )}
            </>
          )}

          {form.mortgage.enabled && (
            <Row row="r.123" label={taxRowLabel('r123')} value={taxRows.value('r123')} highlight="green" />
          )}

          <Row row="r.124" label={taxRowLabel('r124')} value={taxRows.value('r124')} highlight="amber" />

          <Divider />

          {/* Advances and final */}
          <Row row="r.131" label={taxRowLabel('r131')} value={taxRows.value('r131')} />
          {safeDecimal(calc.r133).gt(0) && (
            <Row row="r.133" label={taxRowLabel('r133')} value={taxRows.value('r133')} />
          )}
          <Divider />

          <Row
            row="r.135"
            label={taxRowLabel('r135')}
            value={taxRows.value('r135')}
            highlight={safeDecimal(calc.r135).gt(0) ? 'red' : undefined}
          />
          <Row
            row="r.136"
            label={taxRowLabel('r136')}
            value={taxRows.value('r136')}
            highlight={safeDecimal(calc.r136).gt(0) ? 'green' : undefined}
          />
        </div>
      </SectionCard>

      {/* 2% Allocation */}
      {form.twoPercent.enabled && (
        <SectionCard title="Oddiel XII - Podiel zaplatenej dane (§50)">
          <div className="space-y-0.5">
            <Row label="IČO organizácie" value={form.twoPercent.ico} numeric={false} />
            <Row label="Názov" value={form.twoPercent.obchMeno} numeric={false} />
            <Row
              row="r.152"
              label={`${taxRowLabel('r152')} (${form.twoPercent.splnam3per ? '3%' : '2%'} z r.124)`}
              value={taxRows.value('r152')}
              highlight="green"
            />
          </div>
        </SectionCard>
      )}

      {/* 2% Parents Allocation */}
      {form.parentAllocation.choice !== 'none' && (
        <SectionCard title="Oddiel XII - Podiel zaplatenej dane rodičom (§50aa)">
          <div className="space-y-0.5">
            <Row
              label={`Rodič 1: ${[form.parentAllocation.parent1.priezvisko, form.parentAllocation.parent1.meno].filter(Boolean).join(' ') || '-'}`}
              value={form.parentAllocation.parent1.rodneCislo}
              numeric={false}
            />
            <Row
              label="Suma (2% z r.124)"
              value={calc.parentAllocPerParent}
              highlight="green"
            />
            {form.parentAllocation.choice === 'both' && (
              <>
                <Divider />
                <Row
                  label={`Rodič 2: ${[form.parentAllocation.parent2.priezvisko, form.parentAllocation.parent2.meno].filter(Boolean).join(' ') || '-'}`}
                  value={form.parentAllocation.parent2.rodneCislo}
                  numeric={false}
                />
                <Row
                  label="Suma (2% z r.124)"
                  value={calc.parentAllocPerParent}
                  highlight="green"
                />
              </>
            )}
          </div>
        </SectionCard>
      )}

      {/* Documents Checklist - collapsed by default, up to user to expand */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setAttachmentsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">Prílohy k daňovému priznaniu</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Doklady k podaniu, počet príloh v XML: {neededDocs.length}
            </p>
          </div>
          {attachmentsOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </button>
        {attachmentsOpen && (
          <div className="px-6 pb-5 pt-0 border-t border-gray-100">
            {neededDocs.length === 0 ? (
              <p className="text-xs text-gray-600 pt-4">Žiadne prílohy nie sú potrebné.</p>
            ) : (
              <>
                {neededDocs.some((d) => d.mandatory) && (
                  <div className="pt-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Povinné prílohy</h3>
                    <div className="space-y-2">
                      {neededDocs.filter((d) => d.mandatory).map((doc, i) => (
                        <div key={`m-${i}`} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          {doc.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {neededDocs.some((d) => !d.mandatory) && (
                  <div className="pt-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Uchovajte pre prípad kontroly (5 rokov)</h3>
                    <div className="space-y-2">
                      {neededDocs.filter((d) => !d.mandatory).map((doc, i) => (
                        <div key={`o-${i}`} className="flex items-center gap-2 text-sm text-gray-700">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {doc.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              K elektronickému podaniu sa prílohy neprikladajú. FS si ich môže vyžiadať pri kontrole, uchovajte ich minimálne 5 rokov.
            </p>
          </div>
        )}
      </div>

      {/* Filing Steps */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold text-gray-900">Ako podať daňové priznanie</h2>
        </div>

        {/* Warning banner inside the card */}
        {warnings.length > 0 && (
          <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              XML bude obsahovať neúplné údaje. <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="underline decoration-amber-300 hover:decoration-amber-500 font-medium">Doplňte chýbajúce polia</button> vyššie.
            </p>
          </div>
        )}

        <div className="px-6 pb-6 space-y-0">
          {/* Step 1: Download */}
          <div className="relative pl-10 pb-6">
            {/* Connector line */}
            <div className="absolute left-[15px] top-7 bottom-0 w-px bg-gray-200" />
            {/* Step number */}
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div className="pt-1">
              <h3 className="text-sm font-semibold text-gray-900">Stiahnite XML súbor</h3>
              <p className="text-xs text-gray-600 mt-0.5 mb-3">Vygenerovaný súbor s vašimi údajmi pre Finančnú správu.</p>
              <button
                onClick={onDownloadXml}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 ${
                  warnings.length > 0
                    ? 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                    : 'bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-500 hover:border-emerald-500'
                }`}
              >
                <Download className="w-4 h-4" />
                Stiahnuť XML
              </button>
            </div>
          </div>

          {/* Step 2: Verify */}
          <div className="relative pl-10 pb-6">
            {/* Connector line */}
            <div className="absolute left-[15px] top-7 bottom-0 w-px bg-gray-200" />
            {/* Step number */}
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div className="pt-1">
              <h3 className="text-sm font-semibold text-gray-900">Overte vo vzore formulára</h3>
              <p className="text-xs text-gray-600 mt-0.5 mb-1">
                Otvorte vzor na stránke FS a nahrajte stiahnutý XML:
              </p>
              <ol className="text-xs text-gray-600 mb-3 space-y-0.5 list-none">
                <li className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Kliknite <strong className="text-gray-700">&quot;Načítaj&quot;</strong> na nahranie súboru</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Kliknite <strong className="text-gray-700">&quot;Skontroluj&quot;</strong> na prepočítanie hodnôt</span>
                </li>
              </ol>
              <a
                href="https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  bg-white border border-gray-200 text-gray-700
                  hover:border-gray-400 hover:text-gray-900 transition-all duration-200"
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                Otvoriť vzor formulára
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Step 3: Submit */}
          <div className="relative pl-10">
            {/* Step number */}
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-2 border-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div className="pt-1">
              <h3 className="text-sm font-semibold text-gray-900">Podajte cez portál FS</h3>
              <p className="text-xs text-gray-600 mt-0.5 mb-1">
                Prihláste sa cez eID alebo KEP do osobnej internetovej zóny:
              </p>
              <ol className="text-xs text-gray-600 mb-3 space-y-0.5 list-none">
                <li className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Otvorte <strong className="text-gray-700">Katalóg formulárov</strong></span>
                </li>
                <li className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Vyhľadajte <strong className="text-gray-700">DPFO typ B</strong> (alebo &quot;621&quot;)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>Kliknite <strong className="text-gray-700">&quot;Načítaj&quot;</strong> a nahrajte XML súbor</span>
                </li>
              </ol>
              <a
                href="https://www.financnasprava.sk/sk/osobna-internetova-zona/katalogy/katalog-formularov"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                  bg-white border border-gray-200 text-gray-700
                  hover:border-gray-400 hover:text-gray-900 transition-all duration-200"
              >
                Katalóg formulárov
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
