'use client';

import React, { useCallback } from 'react';
import { ForeignDividends, DividendEntry } from '@/types/TaxForm';
import { FormField, Input, Select, SectionCard, Toggle, InfoBox, MarginNote, MarginNotePanel } from '@/components/ui/FormField';
import { DIVIDEND_COUNTRIES, findCountryByCode, getCurrencyForCountry } from '@/lib/countries';
import { Plus, Trash2 } from 'lucide-react';
import Decimal from 'decimal.js';

interface Props {
  data: ForeignDividends;
  onChange: (updates: Partial<ForeignDividends>) => void;
  showErrors?: boolean;
}

/** Convert a foreign-currency amount to EUR by dividing by the rate (units per 1 EUR). */
function convertToEur(amount: string, rate: string): string {
  try {
    if (!amount || !rate) return '';
    const a = new Decimal(amount);
    const r = new Decimal(rate);
    if (r.isZero()) return '';
    return a.div(r).toDecimalPlaces(2).toFixed(2);
  } catch {
    return '';
  }
}

/** Pick the right rate for a given currency */
function rateForCurrency(currency: 'USD' | 'EUR' | 'CZK', ecbRate: string, czkRate: string): string {
  if (currency === 'EUR') return '1';
  if (currency === 'CZK') return czkRate;
  return ecbRate; // USD
}

export function Step3Dividends({ data, onChange, showErrors = false }: Props) {
  const addEntry = useCallback(() => {
    const newEntry: DividendEntry = {
      id: Date.now().toString(),
      ticker: '',
      country: '840',
      countryName: 'USA',
      currency: 'USD',
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

          // Auto-detect currency when country changes
          if (updates.country !== undefined) {
            updated.currency = getCurrencyForCountry(updated.country);
            const rate = rateForCurrency(updated.currency, data.ecbRate, data.czkRate);
            updated.amountEur = convertToEur(updated.amountUsd, rate);
            updated.withheldTaxEur = convertToEur(updated.withheldTaxUsd, rate);
          }

          // When amount changes, convert using the entry's rate
          if (updates.amountUsd !== undefined && !updates.country) {
            const rate = rateForCurrency(updated.currency, data.ecbRate, data.czkRate);
            updated.amountEur = convertToEur(updated.amountUsd, rate);
          }
          if (updates.withheldTaxUsd !== undefined && !updates.country) {
            const rate = rateForCurrency(updated.currency, data.ecbRate, data.czkRate);
            updated.withheldTaxEur = convertToEur(updated.withheldTaxUsd, rate);
          }

          return updated;
        }),
      });
    },
    [data.entries, data.ecbRate, data.czkRate, onChange]
  );

  // Recalculate EUR amounts when USD rate changes (only affects USD entries)
  const handleUsdRateChange = useCallback(
    (newRate: string) => {
      const updatedEntries = data.entries.map((e) => {
        const rate = rateForCurrency(e.currency ?? 'USD', newRate, data.czkRate);
        return {
          ...e,
          amountEur: convertToEur(e.amountUsd, rate),
          withheldTaxEur: convertToEur(e.withheldTaxUsd, rate),
        };
      });
      onChange({ ecbRate: newRate, ecbRateOverride: true, entries: updatedEntries });
    },
    [data.entries, data.czkRate, onChange]
  );

  // Recalculate EUR amounts when CZK rate changes (only affects CZK entries)
  const handleCzkRateChange = useCallback(
    (newRate: string) => {
      const updatedEntries = data.entries.map((e) => {
        const rate = rateForCurrency(e.currency ?? 'USD', data.ecbRate, newRate);
        return {
          ...e,
          amountEur: convertToEur(e.amountUsd, rate),
          withheldTaxEur: convertToEur(e.withheldTaxUsd, rate),
        };
      });
      onChange({ czkRate: newRate, czkRateOverride: true, entries: updatedEntries });
    },
    [data.entries, data.ecbRate, onChange]
  );

  const hasUsdEntries = data.entries.some((e) => (e.currency ?? 'USD') === 'USD');
  const hasCzkEntries = data.entries.some((e) => e.currency === 'CZK');
  const hasDividendEntry = data.entries.some(
    (entry) => Boolean(entry.country) && (parseFloat(entry.amountUsd) > 0 || parseFloat(entry.amountEur) > 0)
  );

  const totalEur = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.amountEur || '0')); } catch { return sum; }
  }, new Decimal(0));

  const totalWithheldEur = data.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.withheldTaxEur || '0')); } catch { return sum; }
  }, new Decimal(0));

  const slovakTax = totalEur.mul(0.07).toDecimalPlaces(2);
  const creditableAmount = Decimal.min(slovakTax, totalWithheldEur);
  const taxAfterCredit = Decimal.max(slovakTax.minus(creditableAmount), new Decimal(0));

  const note51e = <>Zákon č. 595/2003 Z.z. §51e: Sadzba dane z podielov na zisku (dividendy) 7 %.</>;
  const noteUsdEur = <>Údaje o kurze: ECB – ročný priemer USD/EUR.</>;
  const noteCzkEur = <>Údaje o kurze: ECB – ročný priemer CZK/EUR.</>;

  return (
    <div className="relative">
      {/* Single notes column on 2xl so aside panels don't overlap */}
      <div
        className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4 2xl:absolute 2xl:top-0 2xl:right-0 2xl:w-56 2xl:pt-1"
        style={{ right: '-17rem' }}
      >
        <MarginNotePanel section="§51e" href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-51e">
          {note51e}
        </MarginNotePanel>
        {data.enabled && hasUsdEntries && (
          <MarginNotePanel href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A" hrefLabel="ECB – kurz USD/EUR (údaje)">
            {noteUsdEur}
          </MarginNotePanel>
        )}
        {data.enabled && hasCzkEntries && (
          <MarginNotePanel href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.CZK.EUR.SP00.A" hrefLabel="ECB – kurz CZK/EUR (údaje)">
            {noteCzkEur}
          </MarginNotePanel>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
            PRÍLOHA Č.2 / XIII. ODDIEL
          </h2>
          <p className="text-sm text-gray-600">
            Podiely na zisku (dividendy)
          </p>
          <MarginNote skipDesktopAside section="§51e" href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-51e">
            {note51e}
          </MarginNote>
        </div>

        <Toggle
          enabled={data.enabled}
          onToggle={(enabled) => onChange({ enabled })}
          label="Mal/a som zahranicne dividendy"
        />

        {data.enabled && (
          <>
            {hasUsdEntries && (
              <SectionCard title="Kurz USD/EUR" subtitle="Prepočet dividend na EUR (ročný priemer)">
              <MarginNote skipDesktopAside href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A" hrefLabel="ECB – kurz USD/EUR (údaje)">
                {noteUsdEur}
              </MarginNote>
              <div className="space-y-3">
                <FormField
                  label="USD za 1 EUR"
                  hint="Predvyplnené ECB (2025). Môžete prepísať."
                >
                  <Input
                    type="number"
                    step="0.0001"
                    value={data.ecbRate}
                    onChange={(e) => handleUsdRateChange(e.target.value)}
                    placeholder="1.13"
                  />
                </FormField>
                {data.ecbRateOverride && (
                  <InfoBox variant="warning">
                    Používate vlastný kurz. Oficiálny ECB kurz za 2025 sa zverejní začiatkom 2026.
                  </InfoBox>
                )}
              </div>
            </SectionCard>
          )}

          {hasCzkEntries && (
            <SectionCard title="Kurz CZK/EUR" subtitle="Prepočet dividend z CZK na EUR (ročný priemer)">
              <MarginNote skipDesktopAside href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.CZK.EUR.SP00.A" hrefLabel="ECB – kurz CZK/EUR (údaje)">
                {noteCzkEur}
              </MarginNote>
              <div className="space-y-3">
                <FormField
                  label="CZK za 1 EUR"
                  hint="Predvyplnené ECB (2025). Môžete prepísať."
                >
                  <Input
                    type="number"
                    step="0.0001"
                    value={data.czkRate}
                    onChange={(e) => handleCzkRateChange(e.target.value)}
                    placeholder="25.21"
                  />
                </FormField>
                {data.czkRateOverride && (
                  <InfoBox variant="warning">
                    Používate vlastný kurz. Oficiálny ECB kurz za 2025 sa zverejní začiatkom 2026.
                  </InfoBox>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Dividendove prijmy" subtitle="Pridajte kazdy ticker a celkovu sumu dividend za rok 2025">
            <div className="space-y-4">
              {showErrors && !hasDividendEntry && (
                <InfoBox variant="warning">Pridajte aspoň 1 položku.</InfoBox>
              )}
              {data.entries.map((entry, index) => {
                const cur = entry.currency ?? 'USD';
                const isEur = cur === 'EUR';
                const needsConversion = !isEur; // both USD and CZK need EUR column
                const currencySymbol = cur === 'EUR' ? '€' : cur === 'CZK' ? 'Kč' : '$';
                const currencyLabel = cur;

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">
                          #{index + 1}
                        </span>
                        {isEur && (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            EUR
                          </span>
                        )}
                        {cur === 'CZK' && (
                          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            CZK
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Odstrániť ticker ${index + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Row 1: Ticker, Country, amount, EUR */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <FormField label="Ticker">
                        <Input
                          value={entry.ticker}
                          onChange={(e) =>
                            updateEntry(entry.id, { ticker: e.target.value.toUpperCase() })
                          }
                          placeholder={cur === 'CZK' ? 'CEZ.PR' : isEur ? 'MC.PA' : 'AAPL'}
                        />
                      </FormField>
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
                      <FormField label={`Dividendy brutto (${currencyLabel})`}>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.amountUsd}
                          onChange={(e) =>
                            updateEntry(entry.id, { amountUsd: e.target.value })
                          }
                          placeholder="0.00"
                          suffix={currencySymbol}
                        />
                      </FormField>
                      {needsConversion ? (
                        <FormField label="Dividendy (EUR)">
                          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums h-[38px] flex items-center">
                            {entry.amountEur ? parseFloat(entry.amountEur).toLocaleString('sk-SK', { minimumFractionDigits: 2 }) : '-'}
                          </div>
                        </FormField>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                    </div>
                    {/* Row 2: Withheld tax, EUR equivalent, Rate */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <FormField
                        label={`Daň zrazená (${currencyLabel})`}
                        hint="Napr. 15% W-8BEN (USA), 12.8% (FR), 25% (IE), 15% (CZ)"
                        hintIcon
                      >
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.withheldTaxUsd}
                          onChange={(e) =>
                            updateEntry(entry.id, { withheldTaxUsd: e.target.value })
                          }
                          placeholder="0.00"
                          suffix={currencySymbol}
                        />
                      </FormField>
                      {needsConversion ? (
                        <FormField label="Daň zrazená (EUR)">
                          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums h-[38px] flex items-center">
                            {entry.withheldTaxEur ? parseFloat(entry.withheldTaxEur).toLocaleString('sk-SK', { minimumFractionDigits: 2 }) : '-'}
                          </div>
                        </FormField>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                      <FormField label="Sadzba">
                        <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums h-[38px] flex items-center">
                          {entry.amountUsd && entry.withheldTaxUsd && parseFloat(entry.amountUsd) > 0
                            ? `${((parseFloat(entry.withheldTaxUsd) / parseFloat(entry.amountUsd)) * 100).toFixed(1)}%`
                            : '-'}
                        </div>
                      </FormField>
                      <div className="hidden sm:block" />
                    </div>
                  </div>
                );
              })}

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
                    <span className="text-gray-900 font-semibold tabular-nums">
                      {totalEur.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Daň zrazená v zahraničí</span>
                    <span className="text-gray-500 tabular-nums">
                      {totalWithheldEur.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Slovenská daň 7% (pred zápočtom)</span>
                    <span className="text-gray-500 tabular-nums">
                      {slovakTax.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Zápočet zahraničnej dane</span>
                    <span className="text-emerald-600 tabular-nums">
                      −{creditableAmount.toFixed(2)} EUR
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Daň po zápočte</span>
                    <span className={`font-heading font-semibold tabular-nums ${taxAfterCredit.isZero() ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {taxAfterCredit.toFixed(2)} EUR
                    </span>
                  </div>
                  {taxAfterCredit.isZero() && totalWithheldEur.gt(0) && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Zahraničná daň ({totalWithheldEur.gt(0) && slovakTax.gt(0) ? `${totalWithheldEur.div(totalEur).mul(100).toFixed(1)}%` : '0%'}) prevyšuje slovenskú sadzbu 7% - neplatíte nič navyše.
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}
      </div>
    </div>
  );
}
