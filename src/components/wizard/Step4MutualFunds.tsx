'use client';

import React, { useCallback } from 'react';
import { MutualFundSales, MutualFundEntry } from '@/types/TaxForm';
import { FormField, Input, SectionCard, Toggle, InfoBox, SourceNote } from '@/components/ui/FormField';
import { Plus, Trash2 } from 'lucide-react';
import Decimal from 'decimal.js';

interface Props {
  data: MutualFundSales;
  onChange: (updates: Partial<MutualFundSales>) => void;
}

export function Step4MutualFunds({ data, onChange }: Props) {
  const addEntry = useCallback(() => {
    const newEntry: MutualFundEntry = {
      id: Date.now().toString(),
      fundName: '',
      purchaseAmount: '',
      saleAmount: '',
    };
    onChange({ entries: [...data.entries, newEntry] });
  }, [data.entries, onChange]);

  const removeEntry = useCallback(
    (id: string) => {
      onChange({ entries: data.entries.filter((e) => e.id !== id) });
    },
    [data.entries, onChange]
  );

  const updateEntry = useCallback(
    (id: string, updates: Partial<MutualFundEntry>) => {
      onChange({
        entries: data.entries.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      });
    },
    [data.entries, onChange]
  );

  const totalIncome = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.saleAmount || '0')); } catch { return sum; }
  }, new Decimal(0));

  const totalExpense = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.purchaseAmount || '0')); } catch { return sum; }
  }, new Decimal(0));

  const profit = Decimal.max(totalIncome.minus(totalExpense), new Decimal(0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          VII. ODDIEL
        </h2>
        <p className="text-sm text-gray-500">
          Výpočet základu dane z kapitálového majetku (§7 ods. 1 písm. g)
        </p>
        <SourceNote
          text="Zákon č. 595/2003 Z.z. §7 ods.1 písm.g — Príjmy z kapitálového majetku (19 %)"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-7"
        />
      </div>

      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Predal/a som podielové fondy"
        description="Aktivujte, ak ste v roku 2025 predali alebo vyplatili podielové listy"
      />

      {data.enabled && (
        <>
          <InfoBox>
            Zadajte každý fond osobitne — <strong>kúpna cena</strong> (koľko ste investovali, vrátane vstupných/nákupných poplatkov, ak ste ich mali) a <strong>predajná cena</strong> (koľko ste skutočne dostali pri výplate/predaji). Daň sa platí len zo zisku. Príjem z podielových fondov (§7) tvorí <strong>osobitný základ dane</strong> a zdaňuje sa <strong>jednotnou sadzbou 19&nbsp;%</strong> — nie progresívnou 19/25&nbsp;% ako pri príjmoch zo zamestnania.
          </InfoBox>

          <SectionCard title="Podielové fondy" subtitle="Tabuľka 2, riadok 7 — §7 ods. 1 písm. g">
            <div className="space-y-4">
              {data.entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium">
                      Fond #{index + 1}
                    </span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <FormField label="Názov fondu">
                      <Input
                        value={entry.fundName}
                        onChange={(e) =>
                          updateEntry(entry.id, { fundName: e.target.value })
                        }
                        placeholder="napr. IAD Premium Conservative"
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        label="Kúpna cena (investované)"
                        hint="Suma za nákup vrátane vstupných/nákupných poplatkov (ak ste ich platili)"
                      >
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.purchaseAmount}
                          onChange={(e) =>
                            updateEntry(entry.id, { purchaseAmount: e.target.value })
                          }
                          placeholder="0.00"
                          suffix="EUR"
                        />
                      </FormField>
                      <FormField
                        label="Predajná cena (vyplatené)"
                        hint="Suma, ktorú ste skutočne dostali pri predaji/výplate (po odpočítaní poplatkov)"
                      >
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.saleAmount}
                          onChange={(e) =>
                            updateEntry(entry.id, { saleAmount: e.target.value })
                          }
                          placeholder="0.00"
                          suffix="EUR"
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addEntry}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-dashed border-gray-300 text-sm text-gray-500
                  hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50
                  transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Pridať fond
              </button>

              {data.entries.length > 0 && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Celkový príjem (predaj)</span>
                    <span className="text-gray-600 tabular-nums">{totalIncome.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Celkové výdavky (nákup vrátane poplatkov)</span>
                    <span className="text-gray-600 tabular-nums">{totalExpense.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                    <span className="text-gray-600">Základ dane (zisk)</span>
                    <span className="text-gray-900 font-semibold tabular-nums">{profit.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Daň 19 %</span>
                    <span className="text-amber-600 tabular-nums">{profit.mul(0.19).toDecimalPlaces(2).toFixed(2)} EUR</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
