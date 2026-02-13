'use client';

import React from 'react';
import { EmploymentIncome } from '@/types/TaxForm';
import { FormField, Input, SectionCard, InfoBox, SourceNote } from '@/components/ui/FormField';

interface Props {
  data: EmploymentIncome;
  onChange: (updates: Partial<EmploymentIncome>) => void;
  calculatedR38: string;
}

export function Step2Employment({ data, onChange, calculatedR38 }: Props) {
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
    </div>
  );
}
