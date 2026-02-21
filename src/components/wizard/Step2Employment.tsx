'use client';

import React from 'react';
import { DDSContributions, EmploymentIncome, EvidenceItem } from '@/types/TaxForm';
import { FormField, Input, SectionCard, MarginNote, Toggle } from '@/components/ui/FormField';
import { safeDecimal, fmtEur, requiredError } from '@/lib/utils/decimal';

interface Props {
  data: EmploymentIncome;
  onChange: (updates: Partial<EmploymentIncome>) => void;
  calculatedR38: string;
  /** IX. ODDIEL - zníženie ZD o príspevky na DDS (§11 ods.8), r.75 */
  dds: DDSContributions;
  onDdsChange: (updates: Partial<DDSContributions>) => void;
  calculatedR75?: string;
  showErrors?: boolean;
  /** AI extraction evidence for employment fields (employment.r36, r37, r131, r36a) */
  evidence?: EvidenceItem[];
  /** Display name for the source document in evidence badges */
  evidenceDocName?: string;
}

const EMPLOYMENT_FIELD_PATHS = {
  r36: 'employment.r36',
  r36a: 'employment.r36a',
  r37: 'employment.r37',
  r131: 'employment.r131',
} as const;

function evidenceForField(evidence: EvidenceItem[] | undefined, fieldPath: string): EvidenceItem[] {
  if (!evidence?.length) return [];
  return evidence.filter((e) => e.fieldPath === fieldPath);
}

export function Step2Employment({ data, onChange, calculatedR38, dds, onDdsChange, calculatedR75, showErrors = false, evidence, evidenceDocName }: Props) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
          V. ODDIEL
        </h2>
        <p className="text-sm text-gray-600">
          Výpočet základu dane z príjmov zo závislej činnosti (§5)
        </p>
        <MarginNote
          section="§5"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-5"
        >
          Zákon č. 595/2003 Z.z. §5:<br />Príjmy zo závislej činnosti. Všetky hodnoty (r.36, r.37, r.131, r.36a) nájdete na &quot;Potvrdení o zdaniteľných príjmoch&quot; od zamestnávateľa - II. oddiel (ročné zúčtovanie).
        </MarginNote>
      </div>

      <div className="relative">
        <SectionCard title="Údaje z ročného zúčtovania" subtitle="Potvrdenie od zamestnávateľa - II. oddiel">
        <div className="space-y-5">
          <FormField
            label="r. 36: Úhrn príjmov"
            hint="Potvrdenie → II. oddiel, riadok 01"
            required
            error={requiredError(showErrors, data.r36)}
            evidence={evidenceForField(evidence, EMPLOYMENT_FIELD_PATHS.r36)}
            evidenceDocName={evidenceDocName}
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
            error={requiredError(showErrors, data.r37)}
            evidence={evidenceForField(evidence, EMPLOYMENT_FIELD_PATHS.r37)}
            evidenceDocName={evidenceDocName}
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
                <p className="text-xs text-gray-600 mt-0.5">r.36 − r.37 (zodpovedá riadku 03 na potvrdení)</p>
              </div>
              <span className="font-heading text-lg font-semibold text-gray-900 tabular-nums">
                {calculatedR38 ? `${fmtEur(calculatedR38)} EUR` : '- EUR'}
              </span>
            </div>
          </div>

          <FormField
            label="r. 131: Úhrn preddavkov na daň"
            hint="Potvrdenie → II. oddiel, riadok 04"
            required
            error={requiredError(showErrors, data.r131)}
            evidence={evidenceForField(evidence, EMPLOYMENT_FIELD_PATHS.r131)}
            evidenceDocName={evidenceDocName}
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
            evidence={evidenceForField(evidence, EMPLOYMENT_FIELD_PATHS.r36a)}
            evidenceDocName={evidenceDocName}
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

      {/* IX. ODDIEL - nezdaniteľná časť ZD (§11) a DDS (r.75) */}
      <div className="pt-6 border-t border-gray-200">
        <Toggle
          enabled={dds.enabled}
          onToggle={(enabled) => onDdsChange({ enabled })}
          label="Príspevky na III. pilier / DDS (§11 ods.8)"
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
            {calculatedR75 != null && safeDecimal(calculatedR75).gt(0) && safeDecimal(calculatedR75).lt(safeDecimal(dds.prispevky)) && (
              <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <span className="text-slate-500">NCZD na DDS (r.75):</span>{' '}
                <strong className="font-heading tabular-nums">{fmtEur(calculatedR75)} EUR</strong>
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
