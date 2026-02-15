'use client';

import React from 'react';
import { MortgageInterest } from '@/types/TaxForm';
import { FormField, Input, SectionCard, Toggle, MarginNote, Disclosure } from '@/components/ui/FormField';
import { MORTGAGE_MAX_OLD, MORTGAGE_MAX_NEW } from '@/lib/tax/constants';
import { fmtEur } from '@/lib/utils/decimal';

interface Props {
  data: MortgageInterest;
  onChange: (updates: Partial<MortgageInterest>) => void;
  calculatedBonus: string;
  showErrors?: boolean;
}

export function Step5Mortgage({ data, onChange, calculatedBonus, showErrors = false }: Props) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
          IV. ODDIEL
        </h2>
        <p className="text-sm text-gray-600">
          §33a Daňový bonus na zaplatené úroky
        </p>
        <MarginNote
          section="§33a"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-33a"
        >
          Zákon č. 595/2003 Z.z. §33a:<br />Daňový bonus na zaplatené úroky z hypotéky.
        </MarginNote>
      </div>

      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Uplatňujem daňový bonus na zaplatené úroky"
      />

      {data.enabled && (
        <>
          <SectionCard title="Údaje o hypotéke" subtitle="Údaje nájdete na potvrdení od banky">
            <div className="space-y-4">
              <FormField
                label="Zaplatené úroky za rok 2025"
                hint="Suma úrokov z potvrdenia banky"
                required
                error={showErrors && !data.zaplateneUroky ? 'Povinné pole' : undefined}
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
                error={showErrors && !data.pocetMesiacov ? 'Povinné pole' : undefined}
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
                  error={showErrors && !data.datumZacatiaUroceniaUveru ? 'Povinné pole' : undefined}
                >
                  <Input
                    type="date"
                    value={data.datumZacatiaUroceniaUveru}
                    onChange={(e) => onChange({ datumZacatiaUroceniaUveru: e.target.value })}
                  />
                </FormField>
                <FormField
                  label="Dátum uzavretia zmluvy"
                  hint="Kedy bola podpísaná zmluva o úvere"
                  required
                  error={showErrors && !data.datumUzavretiaZmluvy ? 'Povinné pole' : undefined}
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
                  <span className="font-heading text-lg font-semibold text-emerald-600 tabular-nums">
                    {calculatedBonus ? `${fmtEur(calculatedBonus)} EUR` : '-- EUR'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <Disclosure summary="Podmienky nároku (§33a) - Skontrolujte, či spĺňate všetky">
            <ul className="list-disc list-inside space-y-1.5 text-gray-700">
              <li>Máte <strong>potvrdenie z banky</strong> o zaplatených úrokoch za zdaňovacie obdobie</li>
              <li>Úver bol poskytnutý na <strong>obstaranie alebo budovanie obydlia</strong> (vlastné bývanie)</li>
              <li>Úroky boli skutočne <strong>zaplatené v zdaňovacom období</strong> (rok 2025)</li>
              <li>Bonus môžete uplatniť najviac <strong>4 zdaňovacie obdobia po sebe</strong> (od prvého uplatnenia)</li>
              <li>Obydlie musí byť na <strong>území Slovenskej republiky</strong></li>
              <li>Suma bonusu = 50 % zo zaplatených úrokov, max {MORTGAGE_MAX_OLD} EUR (zmluva do 31.12.2023) alebo {MORTGAGE_MAX_NEW} EUR (zmluva od 1.1.2024)</li>
            </ul>
          </Disclosure>
        </>
      )}
    </div>
  );
}
