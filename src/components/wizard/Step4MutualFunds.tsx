'use client';

import React, { useCallback } from 'react';
import { MutualFundSales, MutualFundEntry, StockSales, StockEntry } from '@/types/TaxForm';
import { STOCK_SHORT_TERM_EXEMPTION } from '@/lib/tax/constants';
import { FormField, Input, SectionCard, Toggle, InfoBox, MarginNote, MarginNotePanel } from '@/components/ui/FormField';
import { Plus, Trash2 } from 'lucide-react';
import Decimal from 'decimal.js';
import { safeDecimal } from '@/lib/utils/decimal';

interface Props {
  data: MutualFundSales;
  onChange: (updates: Partial<MutualFundSales>) => void;
  stockData: StockSales;
  onStockChange: (updates: Partial<StockSales>) => void;
  showErrors?: boolean;
}

export function Step4MutualFunds({ data, onChange, stockData, onStockChange, showErrors = false }: Props) {
  const addEntry = useCallback(() => {
    const newEntry: MutualFundEntry = {
      id: crypto.randomUUID(),
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

  const addStockEntry = useCallback(() => {
    const newEntry: StockEntry = {
      id: crypto.randomUUID(),
      ticker: '',
      purchaseAmount: '',
      saleAmount: '',
    };
    onStockChange({ entries: [...stockData.entries, newEntry] });
  }, [stockData.entries, onStockChange]);

  const removeStockEntry = useCallback(
    (id: string) => {
      onStockChange({ entries: stockData.entries.filter((e) => e.id !== id) });
    },
    [stockData.entries, onStockChange]
  );

  const updateStockEntry = useCallback(
    (id: string, updates: Partial<StockEntry>) => {
      onStockChange({
        entries: stockData.entries.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      });
    },
    [stockData.entries, onStockChange]
  );

  const stockIncome = stockData.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.saleAmount || '0')); } catch { return sum; }
  }, new Decimal(0));
  const stockExpense = stockData.entries.reduce((sum, e) => {
    try { return sum.plus(new Decimal(e.purchaseAmount || '0')); } catch { return sum; }
  }, new Decimal(0));
  const stockProfit = Decimal.max(stockIncome.minus(stockExpense), new Decimal(0));
  const hasFundSale = data.entries.some((entry) => safeDecimal(entry.saleAmount).gt(0));
  const hasStockTrade = stockData.entries.some(
    (entry) => safeDecimal(entry.saleAmount).gt(0) || safeDecimal(entry.purchaseAmount).gt(0)
  );

  const noteSection78 = (
    <>
      Zákon č. 595/2003 Z.z. §7 ods.1 písm.g, §8 ods.1 písm.e.<br />Príjem z fondov zdaňuje sa 19 %. Akcie držané menej ako 1 rok - ostatný príjem, progresívna sadzba.
    </>
  );
  const noteFondy = (
    <>
      Zadajte každý fond osobitne: kúpna cena (investícia vrátane poplatkov) a predajná cena (výnos). Daň zo zisku, jednotná sadzba 19 %.
    </>
  );
  const noteSection8Law = (
    <>Zákon 595/2003 Z.z. §8 ods.1 písm.e, §9 ods.1 písm.i.<br />Príjem z predaja cenných papierov držaných menej ako 1 rok. Oslobodenie do 500 EUR (§9 ods.1 písm.i).</>
  );
  const noteSection8Blog = (
    <>Praktický návod na zdanenie akcií, ETF a cenných papierov.</>
  );

  return (
    <div className="relative">
      {/* Single notes column on 2xl: all panels stack with consistent gap, no layout-driven spacing */}
      <div
        className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4 2xl:absolute 2xl:top-0 2xl:right-[-17rem] 2xl:w-56 2xl:pt-1"
      >
        <MarginNotePanel section="§7, §8" href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/">
          {noteSection78}
        </MarginNotePanel>
        {data.enabled && (
          <MarginNotePanel>{noteFondy}</MarginNotePanel>
        )}
        {stockData.enabled && (
          <>
            <MarginNotePanel section="§8, §9" href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-8">
              {noteSection8Law}
            </MarginNotePanel>
            <MarginNotePanel href="https://akcie.sk/dan-z-akcii-etf-cennych-papierov-postup/" hrefLabel="akcie.sk – daň z akcií a ETF">
              {noteSection8Blog}
            </MarginNotePanel>
          </>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
            Fondy a akcie
          </h2>
          <p className="text-sm text-gray-600">
            §7 podielové fondy (19 %) · §8 akcie držané menej ako 1 rok (progresívna daň)
          </p>
          <MarginNote
            skipDesktopAside
            section="§7, §8"
            href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/"
          >
            {noteSection78}
          </MarginNote>
        </div>

        <Toggle
          enabled={data.enabled}
          onToggle={(enabled) => onChange({ enabled })}
          label="Predal/a som podielové fondy"
        />

        {data.enabled && (
          <>
            <SectionCard title="Podielové fondy" subtitle="Tabuľka 2, riadok 7: §7 ods. 1 písm. g">
            <MarginNote skipDesktopAside>{noteFondy}</MarginNote>
            <div className="space-y-4">
              {showErrors && !hasFundSale && (
                <InfoBox variant="warning">Pridajte aspoň 1 predaj fondu.</InfoBox>
              )}
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
                      aria-label={`Odstrániť fond ${index + 1}`}
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
                    <span className="font-heading text-gray-900 font-semibold tabular-nums">{profit.toFixed(2)} EUR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Daň 19 %</span>
                    <span className="font-heading text-amber-600 tabular-nums">{profit.mul(0.19).toDecimalPlaces(2).toFixed(2)} EUR</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </>
      )}

      <Toggle
        enabled={stockData.enabled}
        onToggle={(enabled) => onStockChange({ enabled })}
        label="Predal/a som akcie (držané menej ako 1 rok)"
      />

      {stockData.enabled && (
        <>
          <InfoBox variant="warning">
            Príjem z predaja akcií držaných <strong>menej ako 365 dní</strong> sa zdaňuje ako <strong>ostatný príjem (§8)</strong> – započíta sa do základu dane (r.80) spolu so mzdou a zdaňuje sa <strong>progresívnou sadzbou 19&nbsp;/&nbsp;25&nbsp;%</strong>. Základ dane sa znižuje o <strong>oslobodenie do 500&nbsp;EUR</strong> (raz za priznanie). Strata v rámci §8 môže znížiť zisk (základ sa neprepočítava do mínusa).
          </InfoBox>

          <SectionCard title="Predaj akcií (§8)" subtitle="Tabuľka 3: cenné papiere držané menej ako 1 rok">
            <MarginNote skipDesktopAside section="§8, §9" href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-8">
              {noteSection8Law}
            </MarginNote>
            <MarginNote skipDesktopAside href="https://akcie.sk/dan-z-akcii-etf-cennych-papierov-postup/" hrefLabel="akcie.sk – daň z akcií a ETF">
              {noteSection8Blog}
            </MarginNote>
            <div className="space-y-4">
              {showErrors && !hasStockTrade && (
                <InfoBox variant="warning">Pridajte aspoň 1 obchod.</InfoBox>
              )}
              {stockData.entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium">
                      Obchod #{index + 1}
                    </span>
                    <button
                      onClick={() => removeStockEntry(entry.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Odstrániť obchod ${index + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <FormField label="Ticker (voliteľné)">
                      <Input
                        value={entry.ticker}
                        onChange={(e) =>
                          updateStockEntry(entry.id, { ticker: e.target.value })
                        }
                        placeholder="napr. AAPL"
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        label="Kúpna cena"
                        hint="Suma za nákup (EUR)"
                      >
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.purchaseAmount}
                          onChange={(e) =>
                            updateStockEntry(entry.id, { purchaseAmount: e.target.value })
                          }
                          placeholder="0.00"
                          suffix="EUR"
                        />
                      </FormField>
                      <FormField
                        label="Predajná cena"
                        hint="Suma pri predaji (EUR)"
                      >
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.saleAmount}
                          onChange={(e) =>
                            updateStockEntry(entry.id, { saleAmount: e.target.value })
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
                onClick={addStockEntry}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-dashed border-gray-300 text-sm text-gray-500
                  hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50
                  transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Pridať obchod
              </button>

              {stockData.entries.length > 0 && (() => {
                const exemption = Decimal.min(stockProfit, new Decimal(STOCK_SHORT_TERM_EXEMPTION));
                const taxableBase = Decimal.max(stockProfit.minus(STOCK_SHORT_TERM_EXEMPTION), new Decimal(0));
                return (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Celkový príjem (predaj)</span>
                      <span className="text-gray-600 tabular-nums">{stockIncome.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Celkové výdavky (nákup)</span>
                      <span className="text-gray-600 tabular-nums">{stockExpense.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Zisk (r.69 − r.70)</span>
                      <span className="text-gray-600 tabular-nums">{stockProfit.toFixed(2)} EUR</span>
                    </div>
                    {stockProfit.gt(0) && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Oslobodenie (do {STOCK_SHORT_TERM_EXEMPTION} EUR)</span>
                        <span className="text-emerald-600 tabular-nums">−{exemption.toFixed(2)} EUR</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-200">
                      <span className="text-gray-600">Základ dane (r.71)</span>
                      <span className="font-heading text-gray-900 font-semibold tabular-nums">{taxableBase.toFixed(2)} EUR</span>
                    </div>
                    <p className="text-xs text-gray-600 pt-1">
                      Zapríčítava sa do r.80 a zdaňuje sa progresívnou sadzbou 19&nbsp;/&nbsp;25&nbsp;%.
                    </p>
                  </div>
                );
              })()}
            </div>
          </SectionCard>
        </>
      )}
      </div>
    </div>
  );
}
