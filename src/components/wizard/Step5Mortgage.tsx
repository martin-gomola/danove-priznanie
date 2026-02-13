'use client';

import React from 'react';
import { MortgageInterest } from '@/types/TaxForm';
import { FormField, Input, SectionCard, Toggle, SourceNote } from '@/components/ui/FormField';
import { MORTGAGE_MAX_OLD, MORTGAGE_MAX_NEW } from '@/lib/tax/constants';

interface Props {
  data: MortgageInterest;
  onChange: (updates: Partial<MortgageInterest>) => void;
  calculatedBonus: string;
}

export function Step5Mortgage({ data, onChange, calculatedBonus }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          IV. ODDIEL
        </h2>
        <p className="text-sm text-gray-500">
          §33a Daňový bonus na zaplatené úroky
        </p>
        <SourceNote
          text="Zákon č. 595/2003 Z.z. §33a: Daňový bonus na zaplatené úroky"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-33a"
        />
      </div>

      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Uplatňujem daňový bonus na zaplatené úroky"
        description="Aktivujte, ak máte hypotéku a chcete uplatniť bonus"
      />

      {data.enabled && (
        <>
          <SectionCard title="Údaje o hypotéke" subtitle="Údaje nájdete na potvrdení od banky">
            <div className="space-y-4">
              <FormField
                label="Zaplatené úroky za rok 2025"
                hint="Suma úrokov z potvrdenia banky"
                required
              >
                <Input
                  type="number"
                  step="0.01"
                  value={data.zaplateneUroky}
                  onChange={(e) => onChange({ zaplateneUroky: e.target.value })}
                  placeholder="0.00"
                  suffix="EUR"
                />
              </FormField>

              <FormField
                label="Počet mesiacov"
                hint="Počet mesiacov v roku 2025, počas ktorých ste splácali"
                required
              >
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={data.pocetMesiacov}
                  onChange={(e) => onChange({ pocetMesiacov: e.target.value })}
                  placeholder="12"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Dátum začatia úročenia úveru"
                  hint="Kedy začínate platiť úroky"
                  required
                >
                  <Input
                    type="date"
                    value={data.datumZacatiaUroceniaUveru}
                    onChange={(e) => onChange({ datumZacatiaUroceniaUveru: e.target.value })}
                  />
                </FormField>
                <FormField
                  label="Dátum uzavretia zmluvy"
                  hint="Kedy bola podpísaná zmluva o úvere (určuje limit 400 vs 1200 EUR)"
                  required
                >
                  <Input
                    type="date"
                    value={data.datumUzavretiaZmluvy}
                    onChange={(e) => onChange({ datumUzavretiaZmluvy: e.target.value })}
                  />
                </FormField>
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 bg-gray-50/50 p-3 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={data.confirm4Years}
                  onChange={(e) => onChange({ confirm4Years: e.target.checked })}
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  Potvrdzujem, že uplatňujem bonus v rámci 4 zdaňovacích období po sebe (podľa §33a ods. 4).
                </span>
              </label>

              {/* Calculated bonus */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                  <div>
                    <span className="text-xs text-emerald-600">Daňový bonus (výpočet)</span>
                    <p className="text-xs text-emerald-500 mt-0.5">
                      50 % z úrokov, max {data.datumUzavretiaZmluvy && data.datumUzavretiaZmluvy <= '2023-12-31' ? MORTGAGE_MAX_OLD : MORTGAGE_MAX_NEW} EUR
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-emerald-600 tabular-nums">
                    {calculatedBonus ? `${parseFloat(calculatedBonus).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR` : '-- EUR'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Podmienky nároku (§33a)" subtitle="Skontrolujte, či spĺňate všetky podmienky">
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700">
              <li>Máte <strong>potvrdenie z banky</strong> o zaplatených úrokoch za zdaňovacie obdobie</li>
              <li>Úver bol poskytnutý na <strong>obstaranie alebo budovanie obydlia</strong> (vlastné bývanie)</li>
              <li>Úroky boli skutočne <strong>zaplatené v zdaňovacom období</strong> (rok 2025)</li>
              <li>Bonus môžete uplatniť najviac <strong>4 zdaňovacie obdobia po sebe</strong> (od prvého uplatnenia)</li>
              <li>Obydlie musí byť na <strong>území Slovenskej republiky</strong></li>
              <li>Suma bonusu = 50 % zo zaplatených úrokov, max {MORTGAGE_MAX_OLD} EUR (zmluva do 31.12.2023) alebo {MORTGAGE_MAX_NEW} EUR (zmluva od 1.1.2024)</li>
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}
