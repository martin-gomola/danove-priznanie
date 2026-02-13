'use client';

import React from 'react';
import { DDSContributions, EmploymentIncome } from '@/types/TaxForm';
import { FormField, Input, SectionCard, InfoBox, SourceNote, Toggle } from '@/components/ui/FormField';

interface Props {
  data: EmploymentIncome;
  onChange: (updates: Partial<EmploymentIncome>) => void;
  calculatedR38: string;
  /** IX. ODDIEL – zníženie ZD o príspevky na DDS (§11 ods.8), r.75 */
  dds: DDSContributions;
  onDdsChange: (updates: Partial<DDSContributions>) => void;
  calculatedR75?: string;
}

export function Step2Employment({ data, onChange, calculatedR38, dds, onDdsChange, calculatedR75 }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          V. ODDIEL
        </h2>
        <p className="text-sm text-gray-500">
          Výpočet základu dane z príjmov zo závislej činnosti (§5)
        </p>
        <SourceNote
          text="Zákon č. 595/2003 Z.z. §5 -- Príjmy zo závislej činnosti"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-5"
        />
      </div>

      <InfoBox>
        <strong>Kde nájdete tieto údaje?</strong>
        <br />
        Všetky hodnoty nájdete na dokumente{' '}
        <strong>&quot;Potvrdenie o zdaniteľných príjmoch&quot;</strong> (ročné
        zúčtovanie) od zamestnávateľa - II. oddiel. Nižšie je pri každom
        poli uvedené číslo riadku z potvrdenia.
      </InfoBox>

      <SectionCard title="Údaje z ročného zúčtovania" subtitle="Zadajte hodnoty z potvrdenia od zamestnávateľa">
        <div className="space-y-5">
          <FormField
            label="r. 36: Úhrn príjmov"
            hint="Potvrdenie → II. oddiel, riadok 01"
            required
          >
            <Input
              type="number"
              step="0.01"
              value={data.r36}
              onChange={(e) => onChange({ r36: e.target.value })}
              placeholder="0.00"
              suffix="EUR"
            />
          </FormField>

          <FormField
            label="r. 37: Úhrn povinného poistného"
            hint="Potvrdenie → II. oddiel, riadok 02 (súčet sociálneho a zdravotného poistenia)"
            required
          >
            <Input
              type="number"
              step="0.01"
              value={data.r37}
              onChange={(e) => onChange({ r37: e.target.value })}
              placeholder="0.00"
              suffix="EUR"
            />
          </FormField>

          {/* Auto-calculated r38 */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
              <div>
                <span className="text-xs text-gray-500">r. 38: Základ dane (automaticky)</span>
                <p className="text-xs text-gray-400 mt-0.5">r.36 − r.37 (zodpovedá riadku 03 na potvrdení)</p>
              </div>
              <span className="text-lg font-semibold text-gray-900 tabular-nums">
                {calculatedR38 ? `${parseFloat(calculatedR38).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR` : '- EUR'}
              </span>
            </div>
          </div>

          <FormField
            label="r. 131: Úhrn preddavkov na daň"
            hint="Potvrdenie → II. oddiel, riadok 04"
            required
          >
            <Input
              type="number"
              step="0.01"
              value={data.r131}
              onChange={(e) => onChange({ r131: e.target.value })}
              placeholder="0.00"
              suffix="EUR"
            />
          </FormField>

          <FormField
            label="r. 36a: Príjmy z dohôd"
            hint="Potvrdenie → II. oddiel, riadok 01a (len ak ste mali príjmy z dohôd)"
          >
            <Input
              type="number"
              step="0.01"
              value={data.r36a}
              onChange={(e) => onChange({ r36a: e.target.value })}
              placeholder="0.00"
              suffix="EUR"
            />
          </FormField>
        </div>
      </SectionCard>

      {/* IX. ODDIEL – nezdaniteľná časť ZD (§11) a DDS (r.75) */}
      <div className="pt-6 border-t border-gray-200">
        <Toggle
          enabled={dds.enabled}
          onToggle={(enabled) => onDdsChange({ enabled })}
          label="Príspevky na III. pilier / DDS (§11 ods.8)"
          description="Uplatňujem zníženie základu dane o zaplatené príspevky na DDS, max 180 EUR/rok"
        />
        {dds.enabled && (
          <div className="mt-4">
            <SectionCard title="Príspevky na DDS" subtitle="Riadok 75">
            <FormField
              label="Ročná suma príspevkov (EUR)"
            >
              <Input
                type="number"
                step="0.01"
                min={0}
                value={dds.prispevky}
                onChange={(e) => onDdsChange({ prispevky: e.target.value })}
                placeholder="0.00"
                suffix="EUR"
              />
            </FormField>
            {calculatedR75 != null && parseFloat(calculatedR75) > 0 && parseFloat(calculatedR75) < parseFloat(dds.prispevky || '0') && (
              <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <span className="text-slate-500">NCZD na DDS (r.75):</span>{' '}
                <strong className="tabular-nums">{parseFloat(calculatedR75).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</strong>
                <span className="text-slate-500 ml-1">(max. limit)</span>
              </div>
            )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
