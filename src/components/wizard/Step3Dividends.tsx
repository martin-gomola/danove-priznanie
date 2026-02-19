'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ForeignDividends, DividendEntry } from '@/types/TaxForm';
import { FormField, Input, Select, SectionCard, Toggle, InfoBox, MarginNote, MarginNotePanel, Disclosure } from '@/components/ui/FormField';
import { DIVIDEND_COUNTRIES, findCountryByCode, getCurrencyForCountry } from '@/lib/countries';
import { Plus, Trash2, Upload } from 'lucide-react';
import Decimal from 'decimal.js';
import { safeDecimal, fmtEur, sumDecimal } from '@/lib/utils/decimal';

/** Optional screenshot for broker guide; hides if image fails to load (e.g. file not yet in public). */
function BrokerGuideImage({ src, alt }: { src: string; alt: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHidden(true)}
      className="rounded-lg border border-gray-200 w-full max-w-md shadow-sm"
    />
  );
}

/** Props for the dividends step (Príloha Č.2 / XIII). */
interface Props {
  data: ForeignDividends;
  onChange: (updates: Partial<ForeignDividends>) => void;
  onImportFile?: (file: File) => void;
  showErrors?: boolean;
}

/** Convert a foreign-currency amount to EUR by dividing by the rate (units per 1 EUR). */
function convertToEur(amount: string, rate: string): string {
  try {
    if (!amount || !rate) return '';
    const amt = new Decimal(amount);
    const rt = new Decimal(rate);
    if (rt.isZero()) return '';
    return amt.div(rt).toDecimalPlaces(2).toFixed(2);
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

/** Single dividend entry card: ticker, country, amounts, withheld tax. */
function DividendEntryCard({
  entry,
  index,
  updateEntry,
  removeEntry,
}: {
  entry: DividendEntry;
  index: number;
  updateEntry: (id: string, updates: Partial<DividendEntry>) => void;
  removeEntry: (id: string) => void;
}) {
  const cur = entry.currency ?? 'USD';
  const isEur = cur === 'EUR';
  const needsConversion = !isEur;
  const currencySymbol = cur === 'EUR' ? '€' : cur === 'CZK' ? 'Kč' : '$';
  const currencyLabel = cur;
  const removeLabel = entry.ticker ? `Odstrániť ${entry.ticker}` : `Odstrániť položku ${index + 1}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
          {isEur && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">EUR</span>
          )}
          {cur === 'CZK' && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">CZK</span>
          )}
        </div>
        <button
          onClick={() => removeEntry(entry.id)}
          className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
          aria-label={removeLabel}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FormField label="Ticker">
          <Input
            value={entry.ticker}
            onChange={(e) => updateEntry(entry.id, { ticker: e.target.value.toUpperCase() })}
            placeholder={cur === 'CZK' ? 'CEZ.PR' : isEur ? 'MC.PA' : 'AAPL'}
          />
        </FormField>
        <FormField label="Krajina">
          <Select
            value={entry.country}
            onChange={(e) => {
              const country = findCountryByCode(e.target.value);
              if (country) updateEntry(entry.id, { country: country.code, countryName: country.name });
            }}
          >
            {!findCountryByCode(entry.country) && (
              <option value={entry.country}>{entry.countryName || 'Vyberte krajinu'}</option>
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
            value={entry.amountOriginal}
            onChange={(e) => updateEntry(entry.id, { amountOriginal: e.target.value })}
            placeholder="0.00"
            suffix={currencySymbol}
          />
        </FormField>
        {needsConversion ? (
          <FormField label="Dividendy (EUR)">
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums h-[38px] flex items-center">
              {entry.amountEur ? fmtEur(entry.amountEur) : '-'}
            </div>
          </FormField>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <FormField
          label={`Daň zrazená (${currencyLabel})`}
          hint="Napr. 15% W-8BEN (USA), 12.8% (FR), 25% (IE), 15% (CZ)"
          hintIcon
        >
          <Input
            type="number"
            step="0.01"
            value={entry.withheldTaxOriginal}
            onChange={(e) => updateEntry(entry.id, { withheldTaxOriginal: e.target.value })}
            placeholder="0.00"
            suffix={currencySymbol}
          />
        </FormField>
        {needsConversion ? (
          <FormField label="Daň zrazená (EUR)">
            <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums h-[38px] flex items-center">
              {entry.withheldTaxEur ? fmtEur(entry.withheldTaxEur) : '-'}
            </div>
          </FormField>
        ) : (
          <div className="hidden sm:block" />
        )}
        <FormField label="Sadzba">
          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 tabular-nums h-[38px] flex items-center">
            {entry.amountOriginal && entry.withheldTaxOriginal && safeDecimal(entry.amountOriginal).gt(0)
              ? `${safeDecimal(entry.withheldTaxOriginal).div(safeDecimal(entry.amountOriginal)).mul(100).toDecimalPlaces(1).toFixed(1)}%`
              : '-'}
          </div>
        </FormField>
        <div className="hidden sm:block" />
      </div>
    </div>
  );
}

/**
 * Step 3: Foreign dividends (Príloha Č.2 / XIII).
 * Toggle, exchange rates, broker guide, and dividend entries with optional IBKR CSV/PDF import.
 */
export function Step3Dividends({ data, onChange, onImportFile, showErrors = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImportFile) return;
      onImportFile(file);
      e.target.value = '';
    },
    [onImportFile]
  );

  const addEntry = useCallback(() => {
    const newEntry: DividendEntry = {
      id: crypto.randomUUID(),
      ticker: '',
      country: '840',
      countryName: 'USA',
      currency: 'USD',
      amountOriginal: '',
      amountEur: '',
      withheldTaxOriginal: '',
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
            updated.amountEur = convertToEur(updated.amountOriginal, rate);
            updated.withheldTaxEur = convertToEur(updated.withheldTaxOriginal, rate);
          }

          // When amount changes, convert using the entry's rate
          if (updates.amountOriginal !== undefined && !updates.country) {
            const rate = rateForCurrency(updated.currency, data.ecbRate, data.czkRate);
            updated.amountEur = convertToEur(updated.amountOriginal, rate);
          }
          if (updates.withheldTaxOriginal !== undefined && !updates.country) {
            const rate = rateForCurrency(updated.currency, data.ecbRate, data.czkRate);
            updated.withheldTaxEur = convertToEur(updated.withheldTaxOriginal, rate);
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
          amountEur: convertToEur(e.amountOriginal, rate),
          withheldTaxEur: convertToEur(e.withheldTaxOriginal, rate),
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
          amountEur: convertToEur(e.amountOriginal, rate),
          withheldTaxEur: convertToEur(e.withheldTaxOriginal, rate),
        };
      });
      onChange({ czkRate: newRate, czkRateOverride: true, entries: updatedEntries });
    },
    [data.entries, data.ecbRate, onChange]
  );

  const hasUsdEntries = data.entries.some((e) => (e.currency ?? 'USD') === 'USD');
  const hasCzkEntries = data.entries.some((e) => e.currency === 'CZK');
  const hasDividendEntry = data.entries.some(
    (entry) => Boolean(entry.country) && (safeDecimal(entry.amountOriginal).gt(0) || safeDecimal(entry.amountEur).gt(0))
  );

  const totalEur = sumDecimal(data.entries, (e) => e.amountEur);
  const totalWithheldEur = sumDecimal(data.entries, (e) => e.withheldTaxEur);

  const slovakTax = totalEur.mul(0.07).toDecimalPlaces(2);
  const creditableAmount = Decimal.min(slovakTax, totalWithheldEur);
  const taxAfterCredit = Decimal.max(slovakTax.minus(creditableAmount), new Decimal(0));

  const note51e = <>Zákon č. 595/2003 Z.z. §51e:<br />Sadzba dane z podielov na zisku (dividendy) 7 %.</>;
  const noteUsdEur = <>Údaje o kurze: ECB - ročný priemer USD/EUR.</>;
  const noteCzkEur = <>Údaje o kurze: ECB - ročný priemer CZK/EUR.</>;

  return (
    <div className="relative">
      {/* Single notes column on 2xl so aside panels don't overlap */}
      <div
        className="hidden 2xl:flex 2xl:flex-col 2xl:gap-4 2xl:absolute 2xl:top-0 2xl:right-[-17rem] 2xl:w-56 2xl:pt-1"
      >
        <MarginNotePanel section="§51e" href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-51e">
          {note51e}
        </MarginNotePanel>
        {data.enabled && hasUsdEntries && (
          <MarginNotePanel href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A" hrefLabel="ECB - kurz USD/EUR (údaje)">
            {noteUsdEur}
          </MarginNotePanel>
        )}
        {data.enabled && hasCzkEntries && (
          <MarginNotePanel href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.CZK.EUR.SP00.A" hrefLabel="ECB - kurz CZK/EUR (údaje)">
            {noteCzkEur}
          </MarginNotePanel>
        )}
        {data.enabled && (
          <MarginNotePanel section="Tip">
            Väčšina brokerov vydáva výkazy dividend v január–február.
          </MarginNotePanel>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
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
          {onImportFile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,text/csv,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden
              />
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  aria-label="Import z IBKR (CSV alebo PDF)"
                >
                  <Upload className="w-4 h-4" />
                  Import z IBKR
                </button>
                <span className="text-xs text-gray-500">CSV alebo PDF, max. 1 MB</span>
              </div>
            </>
          )}
        </div>

        <Toggle
          enabled={data.enabled}
          onToggle={(enabled) => onChange({ enabled })}
          label="Mal/a som zahraničné dividendy"
        />

        {data.enabled && (
          <>
            {hasUsdEntries && (
              <SectionCard title="Kurz USD/EUR" subtitle="Prepočet dividend na EUR (ročný priemer)">
              <MarginNote skipDesktopAside href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A" hrefLabel="ECB - kurz USD/EUR (údaje)">
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
                    min="0"
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
              <MarginNote skipDesktopAside href="https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.CZK.EUR.SP00.A" hrefLabel="ECB - kurz CZK/EUR (údaje)">
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
                    min="0"
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

          <SectionCard
            title="Kde nájdem výkaz dividend?"
            subtitle="Inštrukcie podľa brokera"
          >
            <div className="space-y-2">
              <Disclosure summary={<>Interactive Brokers (IBKR) <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200">Import CSV</span></>}>
                <div className="space-y-3">
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Prihláste sa do Client Portal</li>
                    <li>Prejdite na <strong>Tax Reports</strong> (alebo Performance &amp; Reports → Tax Documents)</li>
                    <li>Vyberte <strong>Select a Tax Year</strong> (napr. 2024)</li>
                    <li><strong>Form 1042-S</strong>: stiahnite PDF (iba ak potrebujete oficiálny výpis pre US)</li>
                    <li><strong>Dividend Report</strong>: stiahnite CSV – súhrn dividend podľa tickerov vrátane US; na priznanie stačí tento CSV</li>
                  </ul>
                  <BrokerGuideImage src="/images/dividend-guide/ibkr.png" alt="IBKR Tax Reports – Tax year, 1042-S a Dividend Report" />
                </div>
              </Disclosure>
              <Disclosure summary={<span className="text-gray-500">Revolut, Schwab, E-Trade (manuálne zadávanie)</span>}>
                <p className="text-sm text-gray-500 mb-3">Pre týchto brokerov zatiaľ len textové inštrukcie – údaje zadajte ručne do tabuľky nižšie.</p>
                <div className="space-y-2 pl-0">
                  <Disclosure summary="Revolut">
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Otvorte aplikáciu Revolut</li>
                      <li>Kliknite na profil (ľavo hore) → <strong>Documents &amp; statements</strong></li>
                      <li>Vyberte <strong>Consolidated statement</strong> pre ročný prehľad</li>
                      <li>Alternatívne: Stocks Home → tri bodky → <strong>Statements</strong></li>
                    </ul>
                  </Disclosure>
                  <Disclosure summary="Charles Schwab">
                    <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                      <li>Prihláste sa na schwab.com</li>
                      <li>Prejdite do <strong>Tax Center</strong> (alebo <strong>1099 Dashboard</strong>)</li>
                      <li>1099-DIV je súčasťou formulára <strong>1099 Composite</strong></li>
                      <li>Dostupné od konca januára do konca februára</li>
                    </ul>
                  </Disclosure>
                  <Disclosure summary="E-Trade">
                    <div className="space-y-3">
                      <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                        <li>Prihláste sa na etrade.com</li>
                        <li>V hornej navigácii kliknite na <strong>Documents</strong> (alebo Accounts → <strong>Documents</strong>)</li>
                        <li>Zapnite <strong>Show quick filters</strong> a kliknite na kartu <strong>Tax documents</strong> s rokom (napr. 2025), alebo nastavte <strong>Document type</strong>: Tax Documents, <strong>Tax year</strong> a stlačte <strong>Apply</strong></li>
                        <li>Stiahnite formulár <strong>1099 Composite</strong> (obsahuje 1099-DIV) v PDF</li>
                      </ul>
                      <BrokerGuideImage src="/images/dividend-guide/e-trade-dividend.png" alt="E-Trade Documents – Tax documents filter" />
                    </div>
                  </Disclosure>
                </div>
              </Disclosure>
            </div>
          </SectionCard>

          <SectionCard title="Dividendové príjmy" subtitle="Pridajte každý ticker a celkovú sumu dividend za rok 2025">
            <div className="space-y-4">
              {showErrors && !hasDividendEntry && (
                <InfoBox variant="warning">Pridajte aspoň 1 položku.</InfoBox>
              )}
              {data.entries.map((entry, index) => (
                <DividendEntryCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  updateEntry={updateEntry}
                  removeEntry={removeEntry}
                />
              ))}

              <button
                onClick={addEntry}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                  border border-dashed border-gray-300 text-sm text-gray-500
                  hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50
                  transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Pridať ticker
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
