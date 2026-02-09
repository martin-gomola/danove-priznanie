'use client';

import React, { useCallback } from 'react';
import { ForeignDividends, DividendEntry } from '@/types/TaxForm';
import { FormField, Input, Select, SectionCard, Toggle, InfoBox, SourceNote } from '@/components/ui/FormField';
import { DIVIDEND_COUNTRIES, findCountryByCode } from '@/lib/countries';
import { Plus, Trash2 } from 'lucide-react';
import Decimal from 'decimal.js';

interface Props {
  data: ForeignDividends;
  onChange: (updates: Partial<ForeignDividends>) => void;
}

function convertUsdToEur(usdAmount: string, rate: string): string {
  try {
    if (!usdAmount || !rate) return '';
    const usd = new Decimal(usdAmount);
    const r = new Decimal(rate);
    if (r.isZero()) return '';
    return usd.div(r).toDecimalPlaces(2).toFixed(2);
  } catch {
    return '';
  }
}

export function Step3Dividends({ data, onChange }: Props) {
  const addEntry = useCallback(() => {
    const newEntry: DividendEntry = {
      id: Date.now().toString(),
      ticker: '',
      country: '840',
      countryName: 'USA',
      amountUsd: '',
      amountEur: '',
      withheldTaxUsd: '',
      withheldTaxEur: '',
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
    (id: string, updates: Partial<DividendEntry>) => {
      onChange({
        entries: data.entries.map((e) => {
          if (e.id !== id) return e;
          const updated = { ...e, ...updates };
          // Auto-convert when USD amount changes
          if (updates.amountUsd !== undefined) {
            updated.amountEur = convertUsdToEur(updated.amountUsd, data.ecbRate);
          }
          // Auto-convert withheld tax when it changes
          if (updates.withheldTaxUsd !== undefined) {
            updated.withheldTaxEur = convertUsdToEur(updated.withheldTaxUsd, data.ecbRate);
          }
          return updated;
        }),
      });
    },
    [data.entries, data.ecbRate, onChange]
  );

  // Recalculate all EUR amounts when rate changes
  const handleRateChange = useCallback(
    (newRate: string) => {
      const updatedEntries = data.entries.map((e) => ({
        ...e,
        amountEur: convertUsdToEur(e.amountUsd, newRate),
        withheldTaxEur: convertUsdToEur(e.withheldTaxUsd, newRate),
      }));
      onChange({ ecbRate: newRate, ecbRateOverride: true, entries: updatedEntries });
    },
    [data.entries, onChange]
  );

  const totalUsd = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.amountUsd || '0')); } catch { return sum; }
  }, new Decimal(0));

  const totalEur = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.amountEur || '0')); } catch { return sum; }
  }, new Decimal(0));

  const totalWithheldEur = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.withheldTaxEur || '0')); } catch { return sum; }
  }, new Decimal(0));

  const slovakTax = totalEur.mul(0.07).toDecimalPlaces(2);
  const creditableAmount = Decimal.min(slovakTax, totalWithheldEur);
  const taxAfterCredit = Decimal.max(slovakTax.minus(creditableAmount), new Decimal(0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          PRÍLOHA Č.2 / XIII. ODDIEL
        </h2>
        <p className="text-sm text-gray-500">
          Podiely na zisku (dividendy)
        </p>
        <SourceNote
          text="Zákon č. 595/2003 Z.z. §51e -- Sadzba dane z podielov na zisku (7%)"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-51e"
        />
      </div>

      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Mal/a som zahranicne dividendy"
        description="Aktivujte ak ste v roku 2025 dostali dividendy zo zahranicia"
      />

      {data.enabled && (
        <>
          <SectionCard title="Kurz USD/EUR" subtitle="Prepočet dividend na EUR (ročný priemer)">
            <div className="space-y-3">
              <FormField
                label="USD za 1 EUR"
                hint="Predvyplnené ECB (2025). Môžete prepísať."
              >
                <Input
                  type="number"
                  step="0.0001"
                  value={data.ecbRate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="1.13"
                />
              </FormField>
              <SourceNote
                text="Údaje o kurze: ECB – ročný priemer USD/EUR"
                href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A"
              />
              {data.ecbRateOverride && (
                <InfoBox variant="warning">
                  Používate vlastný kurz. Oficiálny ECB kurz za 2025 sa zverejní začiatkom 2026.
                </InfoBox>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Dividendove prijmy" subtitle="Pridajte kazdy ticker a celkovu sumu dividend za rok 2025">
            <div className="space-y-4">
              {data.entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium">
                      #{index + 1}
                    </span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <FormField label="Ticker">
                        <Input
                          value={entry.ticker}
                          onChange={(e) =>
                            updateEntry(entry.id, { ticker: e.target.value.toUpperCase() })
                          }
                          placeholder="AAPL"
                        />
                      </FormField>
                    </div>
                    <div className="col-span-4">
                      <FormField label="Krajina">
                        <Select
                          value={entry.country}
                          onChange={(e) => {
                            const c = findCountryByCode(e.target.value);
                            if (c) {
                              updateEntry(entry.id, { country: c.code, countryName: c.name });
                            }
                          }}
                        >
                          {!findCountryByCode(entry.country) && (
                            <option value={entry.country}>
                              {entry.countryName || 'Vyberte krajinu'}
                            </option>
                          )}
                          {DIVIDEND_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>
                    <div className="col-span-3">
                      <FormField label="Dividendy brutto (USD)">
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.amountUsd}
                          onChange={(e) =>
                            updateEntry(entry.id, { amountUsd: e.target.value })
                          }
                          placeholder="0.00"
                          suffix="$"
                        />
                      </FormField>
                    </div>
                    <div className="col-span-2">
                      <FormField label="EUR">
                        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums">
                          {entry.amountEur ? `${parseFloat(entry.amountEur).toLocaleString('sk-SK', { minimumFractionDigits: 2 })}` : '--'}
                        </div>
                      </FormField>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-3 mt-2">
                    <div className="col-span-7">
                      <FormField
                        label="Daň zrazená v zahraničí (USD)"
                        hint="Napr. 15% W-8BEN (USA), 12.8% (FR), 25% (IE)"
                      >
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.withheldTaxUsd}
                          onChange={(e) =>
                            updateEntry(entry.id, { withheldTaxUsd: e.target.value })
                          }
                          placeholder="0.00"
                          suffix="$"
                        />
                      </FormField>
                    </div>
                    <div className="col-span-3">
                      <FormField label="Daň EUR">
                        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums">
                          {entry.withheldTaxEur ? `${parseFloat(entry.withheldTaxEur).toLocaleString('sk-SK', { minimumFractionDigits: 2 })}` : '--'}
                        </div>
                      </FormField>
                    </div>
                    <div className="col-span-2">
                      <FormField label="Sadzba">
                        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400 tabular-nums">
                          {entry.amountUsd && entry.withheldTaxUsd && parseFloat(entry.amountUsd) > 0
                            ? `${((parseFloat(entry.withheldTaxUsd) / parseFloat(entry.amountUsd)) * 100).toFixed(1)}%`
                            : '--'}
                        </div>
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
                Pridat ticker
              </button>

              {data.entries.length > 0 && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Spolu dividendy (brutto)</span>
                    <div className="text-right">
                      <span className="text-gray-500 mr-4">
                        ${totalUsd.toFixed(2)}
                      </span>
                      <span className="text-gray-900 font-semibold tabular-nums">
                        {totalEur.toFixed(2)} EUR
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Daň zrazená v zahraničí</span>
                    <span className="text-gray-500 tabular-nums">
                      {totalWithheldEur.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Slovenská daň 7% (pred zápočtom)</span>
                    <span className="text-gray-500 tabular-nums">
                      {slovakTax.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Zápočet zahraničnej dane</span>
                    <span className="text-emerald-600 tabular-nums">
                      −{creditableAmount.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Daň po zápočte</span>
                    <span className={`font-semibold tabular-nums ${taxAfterCredit.isZero() ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {taxAfterCredit.toFixed(2)} EUR
                    </span>
                  </div>
                  {taxAfterCredit.isZero() && totalWithheldEur.gt(0) && (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Zahraničná daň ({totalWithheldEur.gt(0) && slovakTax.gt(0) ? `${totalWithheldEur.div(totalEur).mul(100).toFixed(1)}%` : '0%'}) prevyšuje slovenskú sadzbu 7% — neplatíte nič navyše.
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
