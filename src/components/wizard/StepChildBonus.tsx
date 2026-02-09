'use client';

import React, { useCallback } from 'react';
import { ChildBonus, ChildEntry, SpouseNCZD } from '@/types/TaxForm';
import { DEFAULT_CHILD_ENTRY } from '@/types/TaxForm';
import { FormField, Input, SectionCard, Toggle, InfoBox, SourceNote } from '@/components/ui/FormField';
import { CHILD_BONUS_UNDER_15, CHILD_BONUS_15_TO_18 } from '@/lib/tax/constants';
import { parseRodneCislo, getMonthlyRates2025 } from '@/lib/rodneCislo';
import { Plus, Trash2 } from 'lucide-react';

const MONTH_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const MAX_CHILDREN = 4;

interface Props {
  data: ChildBonus;
  onChange: (updates: Partial<ChildBonus>) => void;
  calculatedBonus: string;
  /** Oddiel III - §11 ods.3: nezdaniteľná časť na manžela/manželku */
  spouse: SpouseNCZD;
  onSpouseChange: (updates: Partial<SpouseNCZD>) => void;
  /** Calculated r.74 (NCZD na manžela) for display */
  calculatedR74?: string;
}

function getAgeCategoryLabel(rc: string): string {
  const birth = parseRodneCislo(rc);
  if (!birth) return '';
  const rates = getMonthlyRates2025(birth);
  const r0 = rates[0];
  if (r0 === CHILD_BONUS_UNDER_15) return `do 15 r.: ${CHILD_BONUS_UNDER_15} EUR/mes`;
  if (r0 === CHILD_BONUS_15_TO_18) return `15–18 r.: ${CHILD_BONUS_15_TO_18} EUR/mes`;
  return '18+ r.: bez bonusu';
}

export function StepChildBonus({ data, onChange, calculatedBonus, spouse, onSpouseChange, calculatedR74 }: Props) {
  const addChild = useCallback(() => {
    if (data.children.length >= MAX_CHILDREN) return;
    const newChild = DEFAULT_CHILD_ENTRY(Date.now().toString());
    onChange({ children: [...data.children, newChild] });
  }, [data.children, onChange]);

  const removeChild = useCallback(
    (id: string) => {
      onChange({ children: data.children.filter((c) => c.id !== id) });
    },
    [data.children, onChange]
  );

  const updateChild = useCallback(
    (id: string, updates: Partial<ChildEntry>) => {
      onChange({
        children: data.children.map((c) => (c.id !== id ? c : { ...c, ...updates })),
      });
    },
    [data.children, onChange]
  );

  const setWholeYear = useCallback(
    (id: string, wholeYear: boolean) => {
      const child = data.children.find((c) => c.id === id);
      if (!child) return;
      const months = wholeYear ? Array(12).fill(true) : child.months;
      updateChild(id, { wholeYear, months });
    },
    [data.children, updateChild]
  );

  const toggleMonth = useCallback(
    (id: string, index: number) => {
      const child = data.children.find((c) => c.id === id);
      if (!child) return;
      const next = [...child.months];
      next[index] = !next[index];
      updateChild(id, { months: next, wholeYear: next.every(Boolean) });
    },
    [data.children, updateChild]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          III. ODDIEL
        </h2>
        <p className="text-sm text-gray-500">
          Údaje na uplatnenie zníženia základu dane (§11) a daňového bonusu (§33)
        </p>
        <SourceNote
          text="Zákon č. 595/2003 Z.z. §33: Daňový bonus na vyživované dieťa"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-33"
        />
      </div>

      {/* §11 ods.3 - NCZD na manžela/manželku (r.31, r.32) */}
      <Toggle
        enabled={spouse.enabled}
        onToggle={(enabled) => onSpouseChange({ enabled })}
        label="Uplatňujem nezdaniteľnú časť na manžela/manželku (§11 ods.3)"
        description="Aktivujte, ak máte manželku/manžela so spoločnou domácnosťou a spĺňate podmienky (r.31, r.32)"
      />
      {spouse.enabled && (
        <SectionCard title="Údaje o manželovi / manželke" subtitle="Riadky 31–32">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priezvisko a meno" hint="r.31" required>
              <Input
                value={spouse.priezviskoMeno}
                onChange={(e) => onSpouseChange({ priezviskoMeno: e.target.value })}
                placeholder="Nováková Mária"
              />
            </FormField>
            <FormField label="Rodné číslo" hint="r.31" required>
              <Input
                value={spouse.rodneCislo}
                onChange={(e) => onSpouseChange({ rodneCislo: e.target.value.replace(/\s/g, '') })}
                placeholder="8501011234"
              />
            </FormField>
            <FormField label="Vlastné príjmy manžela/manželky (EUR)" hint="r.32: úhrn za zdaňovacie obdobie">
              <Input
                type="number"
                step="0.01"
                value={spouse.vlastnePrijmy}
                onChange={(e) => onSpouseChange({ vlastnePrijmy: e.target.value })}
                placeholder="0.00"
              />
            </FormField>
            <FormField label="Počet mesiacov nároku" hint="r.32: 1–12 mesiacov so spoločnou domácnosťou">
              <Input
                type="number"
                min={1}
                max={12}
                value={spouse.pocetMesiacov}
                onChange={(e) => onSpouseChange({ pocetMesiacov: e.target.value })}
                placeholder="12"
              />
            </FormField>
          </div>
          {calculatedR74 != null && parseFloat(calculatedR74) > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span className="text-slate-500">NCZD na manžela/manželku (r.74):</span>{' '}
              <strong className="tabular-nums">{parseFloat(calculatedR74).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</strong>
            </div>
          )}
        </SectionCard>
      )}

      {/* §33 - Daňový bonus na deti */}
      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Uplatňujem daňový bonus na deti (§33)"
        description="Aktivujte, ak máte vyživované deti a spĺňate podmienky (90 % príjmov zo SR, spoločná domácnosť)"
      />
      {data.enabled && (
        <>
          <InfoBox>
            V roku 2025: <strong>{CHILD_BONUS_UNDER_15} EUR</strong> mesačne na dieťa do 15 r.,{' '}
            <strong>{CHILD_BONUS_15_TO_18} EUR</strong> mesačne na dieťa 15–18 r. Bonus sa znižuje pri vyššom príjme.
          </InfoBox>

          <SectionCard title="Vyživované deti" subtitle="Priezvisko a meno, rodné číslo, mesiace nároku">
            <div className="space-y-6">
              {data.children.map((child) => (
                <div
                  key={child.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                      <FormField label="Priezvisko a meno dieťaťa" hint="Napr. Novák Peter" required>
                        <Input
                          value={child.priezviskoMeno}
                          onChange={(e) => updateChild(child.id, { priezviskoMeno: e.target.value })}
                          placeholder="Priezvisko Meno"
                        />
                      </FormField>
                      <FormField
                        label="Rodné číslo"
                        hint="Formát YYMMDD/XXXX alebo YYMMDDXXXX"
                        required
                      >
                        <Input
                          value={child.rodneCislo}
                          onChange={(e) => updateChild(child.id, { rodneCislo: e.target.value.replace(/\s/g, '') })}
                          placeholder="0506151234"
                        />
                      </FormField>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeChild(child.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Odstrániť dieťa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {child.rodneCislo && (
                    <div className="text-xs text-gray-500">
                      {getAgeCategoryLabel(child.rodneCislo) || 'Neplatné rodné číslo'}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={child.wholeYear}
                        onChange={(e) => setWholeYear(child.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Celý rok
                    </label>
                    {!child.wholeYear && (
                      <div className="flex flex-wrap gap-1">
                        {child.months.map((checked, i) => (
                          <label
                            key={i}
                            className="flex items-center gap-0.5 text-xs cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMonth(child.id, i)}
                              className="rounded border-gray-300"
                            />
                            {MONTH_LABELS[i]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {data.children.length < MAX_CHILDREN && (
                <button
                  type="button"
                  onClick={addChild}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Pridať dieťa
                </button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Bonus už vyplatený zamestnávateľom" subtitle="Riadok 119">
            <FormField
              label="Suma bonusu na deti vyplatená v priebehu roka zamestnávateľom"
              hint="Z potvrdenia od zamestnávateľa alebo výplatnej pásky"
            >
              <Input
                type="number"
                step="0.01"
                value={data.bonusPaidByEmployer}
                onChange={(e) => onChange({ bonusPaidByEmployer: e.target.value })}
                placeholder="0.00"
                suffix="EUR"
              />
            </FormField>
          </SectionCard>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-600">Celkový daňový bonus na deti (r.117)</span>
                <p className="text-xs text-emerald-500 mt-0.5">
                  Po znížení o príjem a po mesiacoch
                </p>
              </div>
              <span className="text-lg font-semibold text-emerald-600 tabular-nums">
                {calculatedBonus
                  ? `${parseFloat(calculatedBonus).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR`
                  : '0,00 EUR'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
