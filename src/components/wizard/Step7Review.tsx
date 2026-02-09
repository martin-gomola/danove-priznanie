'use client';

import React, { useState } from 'react';
import { TaxFormData, TaxCalculationResult } from '@/types/TaxForm';
import { SectionCard, InfoBox } from '@/components/ui/FormField';
import { Download, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  form: TaxFormData;
  calc: TaxCalculationResult;
  onDownloadXml: () => void;
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
    ? (value && parseFloat(value) !== 0 ? `${parseFloat(value).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR` : '--')
    : (value || '--');

  return (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-4' : ''}`}>
      <span className="text-xs text-gray-600">
        {row && <span className="text-gray-400 font-mono mr-2">{row}</span>}
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

export function Step7Review({ form, calc, onDownloadXml }: Props) {
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const documents: { label: string; needed: boolean }[] = [
    {
      label: 'Potvrdenie o zdaniteľných príjmoch (od zamestnávateľa)',
      needed: form.employment.enabled,
    },
    {
      label: 'Výkazy dividend od brokera (povinné pri dividendách)',
      needed: form.dividends.enabled,
    },
    {
      label: 'Doklady k príjmom a výdavkom z podielových fondov (§7)',
      needed: form.mutualFunds.enabled,
    },
    {
      label: 'Potvrdenie o zaplatených úrokoch (od banky)',
      needed: form.mortgage.enabled,
    },
    {
      label: 'Potvrdenie o dobrovoľníckej činnosti (pre 3%)',
      needed: form.twoPercent.enabled && form.twoPercent.splnam3per,
    },
  ];

  const neededDocs = documents.filter((d) => d.needed);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          SÚHRN
        </h2>
        <p className="text-sm text-gray-500">
          Kontrola výpočtu dane a export XML
        </p>
      </div>

      {/* Final result card */}
      <div
        className={`rounded-2xl border p-6 ${
          calc.isRefund
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            {calc.isRefund ? 'Daňový preplatok (vrátka)' : 'Daň na úhradu (doplatok)'}
          </p>
          <p
            className={`text-4xl font-bold tabular-nums ${
              calc.isRefund ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {calc.isRefund ? '+' : ''}{parseFloat(calc.isRefund ? calc.finalTaxRefund : calc.finalTaxToPay).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR
          </p>
        </div>
      </div>

      {/* Employment Section */}
      {form.employment.enabled && (
        <SectionCard title="Oddiel V -- Príjem zo závislej činnosti (§5)">
          <div className="space-y-0.5">
            <Row row="r.36" label="Úhrn príjmov (brutto)" value={form.employment.r36} />
            <Row row="r.37" label="Povinné poistné" value={form.employment.r37} />
            <Divider />
            <Row row="r.38" label="Základ dane zo závislej činnosti" value={calc.r38} highlight="amber" />
            {form.employment.r36a && (
              <Row row="r.36a" label="Príjmy z dohôd" value={form.employment.r36a} />
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
            <Row row="r.66" label="Úhrn príjmov z tabuľky 2" value={calc.r66} />
            <Row row="r.67" label="Úhrn výdavkov z tabuľky 2" value={calc.r67} />
            <Row row="r.68" label="Osobitný základ dane z §7" value={calc.r68} highlight="amber" />
          </div>
          <div className="mt-3">
            <InfoBox variant="info">
              Príjem z podielových fondov sa zdaňuje <strong>jednotnou sadzbou 19&nbsp;%</strong> (nie progresívnou 19&nbsp;/&nbsp;25&nbsp;% ako pri zamestnaní).
            </InfoBox>
          </div>
        </SectionCard>
      )}

      {/* Dividends Section */}
      {form.dividends.enabled && (
        <SectionCard title="Príloha č.2 -- Podiely na zisku (§51e)">
          <div className="space-y-0.5">
            <Row row="pr.01" label="Podiel na zisku (dividendy EUR)" value={calc.pril2_pr1} />
            <Row row="pr.07" label="Osobitný základ dane" value={calc.pril2_pr7} />
            <Row row="pr.08" label="Sadzba dane" value="7%" />
            <Row row="pr.09" label="Daň pred zápočtom (7%)" value={calc.pril2_pr9} />
            <Divider />
            {parseFloat(calc.totalWithheldTaxEur) > 0 && (
              <>
                <Row row="pr.14" label="Daň zaplatená v zahraničí" value={calc.pril2_pr14} />
                <Row row="pr.17" label="Daň uznaná na zápočet" value={calc.pril2_pr17} highlight="green" />
              </>
            )}
            <Row
              row="pr.18"
              label="Daň po zápočte"
              value={calc.pril2_pr18}
              highlight={parseFloat(calc.pril2_pr18) === 0 ? 'green' : 'amber'}
            />
            <Row row="pr.28" label="Celková daň z dividend" value={calc.pril2_pr28} highlight="amber" />
          </div>
          {parseFloat(calc.pril2_pr18) === 0 && parseFloat(calc.totalWithheldTaxEur) > 0 && (
            <InfoBox variant="success">
              Zahraničná zrážková daň prevyšuje slovenskú sadzbu 7% - žiadna ďalšia daň z dividend.
            </InfoBox>
          )}
        </SectionCard>
      )}

      {/* Tax Calculation */}
      <SectionCard title="Oddiel IX -- Výpočet dane">
        <div className="space-y-0.5">
          {/* NCZD */}
          <Row row="r.72" label="ZD z §5 pred znížením o NCZD" value={calc.r72} />
          <Row row="r.73" label="NCZD na daňovníka (§11 ods.2)" value={calc.r73} />
          {form.spouse?.enabled && (
            <Row row="r.74" label="NCZD na manžela/manželku (§11 ods.3)" value={calc.r74} />
          )}
          <Row row="r.77" label="Nezdaniteľná časť celkom" value={calc.r77} />
          <Divider />
          <Row row="r.78" label="ZD z §5 po znížení o NCZD" value={calc.r78} />

          {/* Tax base */}
          <Row row="r.80" label="ZD podľa §4 ods.1 písm.a" value={calc.r80} />
          <Divider />

          {/* Taxes */}
          <Row row="r.81" label="Daň z r.80 (19%/25%)" value={calc.r81} />
          <Row row="r.90" label="Daň z §4 ods.1 písm.a" value={calc.r90} />

          {form.mutualFunds.enabled && (
            <>
              <Divider />
              <Row row="r.106" label="Daň z §7 (19% z r.68, jednotná sadzba)" value={calc.r106} />
              <Row row="r.115" label="Daň z §7 po úprave" value={calc.r115} />
            </>
          )}

          <Divider />
          <Row row="r.116" label="Daň celkovo" value={calc.r116} highlight="amber" />
          <InfoBox variant="info">
            r.116 = r.90 (daň zo zamestnania){form.mutualFunds.enabled ? ' + r.115 (daň z fondov)' : ''}{form.dividends.enabled ? ' + príl.2 r.28 (daň z dividend)' : ''}
          </InfoBox>

          {/* Bonuses */}
          <Row row="r.117" label="Daňový bonus na deti" value={calc.r117} />
          <Row row="r.118" label="Daň po bonuse na deti" value={calc.r118} />
          {form.childBonus?.enabled && (
            <>
              <Row row="r.119" label="Bonus na deti (vyplatený zamestnávateľom)" value={calc.r119} />
              <Row row="r.120" label="Zostávajúci bonus na deti (r.117 − r.119)" value={calc.r120} />
              <Row row="r.121" label="Bonus na deti na poukázanie správcom dane" value={calc.r121} highlight="green" />
            </>
          )}

          {form.mortgage.enabled && (
            <Row row="r.123" label="Bonus na zaplatené úroky (§33a)" value={calc.r123} highlight="green" />
          )}

          <Row row="r.124" label="Daň po všetkých bonusoch" value={calc.r124} highlight="amber" />

          <Divider />

          {/* Advances and final */}
          <Row row="r.131" label="Preddavky na daň (zrazené)" value={calc.r131} />
          <Divider />

          <Row
            row="r.135"
            label="Daň na úhradu (doplatok)"
            value={calc.r135}
            highlight={parseFloat(calc.r135) > 0 ? 'red' : undefined}
          />
          <Row
            row="r.136"
            label="Daňový preplatok (vrátka)"
            value={calc.r136}
            highlight={parseFloat(calc.r136) > 0 ? 'green' : undefined}
          />
        </div>
      </SectionCard>

      {/* 2% Allocation */}
      {form.twoPercent.enabled && (
        <SectionCard title="Oddiel XII -- Podiel zaplatenej dane (§50)">
          <div className="space-y-0.5">
            <Row label="IČO organizácie" value={form.twoPercent.ico} numeric={false} />
            <Row label="Názov" value={form.twoPercent.obchMeno} numeric={false} />
            <Row
              row="r.152"
              label={`Suma (${form.twoPercent.splnam3per ? '3%' : '2%'} z r.124)`}
              value={calc.r152}
              highlight="green"
            />
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
            <p className="text-xs text-gray-500 mt-0.5">Dokumenty, ktoré môžete priložiť (voliteľné prehľad)</p>
          </div>
          {attachmentsOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </button>
        {attachmentsOpen && (
          <div className="px-6 pb-5 pt-0 border-t border-gray-100">
            <div className="space-y-2 pt-4">
              {neededDocs.length === 0 ? (
                <p className="text-xs text-gray-500">Žiadne prílohy nie sú potrebné.</p>
              ) : (
                neededDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {doc.label}
                  </div>
                ))
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              FS vyžaduje doklady o príjmoch zo všetkých zdrojov; pri dividendách sú povinne výkazy od brokera. Pre príjmy z §7 (podielové fondy) sa konkrétny názov dokladu v znení FS neuvádza - postačujú výkazy alebo potvrdenia, z ktorých vyplývajú príjmy a výdavky (r.66, r.67).
            </p>
          </div>
        )}
      </div>

      {/* Export + Validation */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onDownloadXml}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl
            bg-gray-900 border border-gray-900 text-white font-medium
            hover:bg-gray-800 hover:border-gray-800 transition-all duration-200"
        >
          <Download className="w-5 h-5" />
          Stiahnuť XML súbor
        </button>
        <a
          href="https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl
            bg-emerald-600 border border-emerald-600 text-white font-medium text-center
            hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-200"
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          Overiť vo vzore formulára (otvorí FS)
        </a>
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <p className="font-medium mb-1">Pre nahranie XML do formulara FS:</p>
          <p>
            Kliknite <strong>&quot;Nacitaj&quot;</strong> na nahranie suboru, potom <strong>&quot;Skontroluj&quot;</strong> na prepocitanie vsetkych hodnot.
          </p>
        </div>
        <p className="text-center text-xs text-gray-400">
          XML nahrajete a DPFO podáte cez{' '}
          <a
            href="https://www.financnasprava.sk/sk/elektronicke-sluzby/koncove-sluzby/podanie-dp-dpfo-szco-typb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 underline decoration-gray-300 hover:text-gray-900"
          >
            financnasprava.sk
          </a>
          {' '}(prihlasenie eID / KEP)
        </p>
      </div>
    </div>
  );
}
