'use client';

import React from 'react';
import { TwoPercentAllocation } from '@/types/TaxForm';
import { FormField, SectionCard, Toggle, InfoBox, SourceNote } from '@/components/ui/FormField';
import { PrijimatelSelect } from '@/components/ui/PrijimatelSelect';

interface Props {
  data: TwoPercentAllocation;
  onChange: (updates: Partial<TwoPercentAllocation>) => void;
  calculatedAmount: string;
}

export function Step6TwoPercent({ data, onChange, calculatedAmount }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          XII. ODDIEL
        </h2>
        <p className="text-sm text-gray-500">
          §50 Podiel zaplatenej dane (2% alebo 3%)
        </p>
        <SourceNote
          text="Zákon č. 595/2003 Z.z. §50: Použitie podielu zaplatenej dane"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-50"
        />
      </div>

      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Chcem poukázať 2 % (alebo 3 %) z dane"
        description="Poukážete časť zaplatenej dane vybranej organizácii"
      />

      {data.enabled && (
        <>
          <InfoBox>
            Môžete poukázať <strong>2&nbsp;%</strong> zaplatenej dane (alebo <strong>3&nbsp;%</strong> ak ste dobrovoľník
            s potvrdením o odpracovaní min. 40 hodín). Minimum je <strong>3 EUR</strong>.
            Táto suma vám nebude strhnutá - je to časť dane, ktorú by ste zaplatili tak či tak.
          </InfoBox>

          <SectionCard title="Príjemca podielu" subtitle="Organizácia, ktorej poukážete podiel dane">
            <div className="space-y-4">
              <SourceNote
                text="Zoznam oprávnených prijímateľov 2 % (Finančná správa)"
                href="https://www.financnasprava.sk/sk/elektronicke-sluzby/verejne-sluzby/zoznamy/zoznam-prijimatelov-dane"
              />
              <FormField
                label="Organizácia (príjemca 2 %)"
                hint="Vyberte z oficiálneho zoznamu FS alebo hľadajte podľa názvu / IČO"
                required
              >
                <PrijimatelSelect
                  valueIco={data.ico}
                  valueObchMeno={data.obchMeno}
                  onSelect={(item) => onChange({ ico: item.ico, obchMeno: item.obchMeno })}
                  placeholder="Hľadať podľa názvu alebo IČO..."
                />
              </FormField>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.splnam3per}
                    onChange={(e) => onChange({ splnam3per: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div>
                    <span className="text-sm text-gray-700">
                      Spĺňam podmienky pre 3 %
                    </span>
                    <p className="text-xs text-gray-500">
                      Dobrovoľník s potvrdením (min. 40 hodín)
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.suhlasSoZaslanim}
                    onChange={(e) => onChange({ suhlasSoZaslanim: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div>
                    <span className="text-sm text-gray-700">
                      Súhlasím so zaslaním údajov príjemcovi
                    </span>
                    <p className="text-xs text-gray-500">
                      Organizácia bude vedieť, kto jej poukázal podiel dane
                    </p>
                  </div>
                </label>
              </div>

              {/* Calculated amount */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">
                      Poukázaná suma ({data.splnam3per ? '3 %' : '2 %'})
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Automaticky z riadku 124
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 tabular-nums">
                    {calculatedAmount && parseFloat(calculatedAmount) > 0
                      ? `${parseFloat(calculatedAmount).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR`
                      : '-- EUR'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
