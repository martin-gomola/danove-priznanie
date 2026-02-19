'use client';

import React from 'react';
import { TwoPercentAllocation, ParentTaxAllocation, ParentAllocationChoice, ParentInfo } from '@/types/TaxForm';
import { FormField, Input, SectionCard, Toggle, InfoBox, MarginNote } from '@/components/ui/FormField';
import { PrijimatelSelect } from '@/components/ui/PrijimatelSelect';
import { getRodneCisloError } from '@/lib/utils/validateRodneCislo';
import { safeDecimal, fmtEur, requiredError } from '@/lib/utils/decimal';

interface Props {
  data: TwoPercentAllocation;
  onChange: (updates: Partial<TwoPercentAllocation>) => void;
  calculatedAmount: string;
  parentData: ParentTaxAllocation;
  onParentChange: (updates: Partial<ParentTaxAllocation>) => void;
  calculatedPerParent: string;
  showErrors?: boolean;
}

function ParentForm({
  label,
  parent,
  onParentChange,
  showErrors,
}: {
  label: string;
  parent: ParentInfo;
  onParentChange: (updates: Partial<ParentInfo>) => void;
  showErrors: boolean;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 border-l-2 border-gray-300 pl-3">
        {label}
      </h4>
      <FormField label="Meno" required error={requiredError(showErrors, parent.meno)}>
        <Input
          value={parent.meno}
          onChange={(e) => onParentChange({ meno: e.target.value })}
          placeholder="Meno"
        />
      </FormField>
      <FormField label="Priezvisko" required error={requiredError(showErrors, parent.priezvisko)}>
        <Input
          value={parent.priezvisko}
          onChange={(e) => onParentChange({ priezvisko: e.target.value })}
          placeholder="Priezvisko"
        />
      </FormField>
      <FormField
        label="Rodné číslo"
        required
          hint="Formát YYMMDDXXXX (bez lomítka)"
        hintIcon
        error={getRodneCisloError(parent.rodneCislo, showErrors)}
      >
        <Input
          value={parent.rodneCislo}
          onChange={(e) => onParentChange({ rodneCislo: e.target.value.replace(/\D/g, '') })}
          placeholder="5001011234"
          maxLength={10}
        />
      </FormField>
    </div>
  );
}

const PARENT_CHOICES: { value: ParentAllocationChoice; label: string; description: string }[] = [
  { value: 'both', label: 'Áno, obidvom rodičom', description: 'Každý rodič dostane 2 % z vašej dane' },
  { value: 'one', label: 'Áno, iba jednému rodičovi', description: 'Jeden rodič dostane 2 % z vašej dane' },
  { value: 'none', label: 'Nie', description: 'Nepoukážem dane rodičom' },
];

export function Step6TwoPercent({
  data, onChange, calculatedAmount,
  parentData, onParentChange, calculatedPerParent,
  showErrors = false,
}: Props) {
  const parentAmount = safeDecimal(calculatedPerParent).toNumber();
  const parentCount = parentData.choice === 'both' ? 2 : parentData.choice === 'one' ? 1 : 0;

  const updateParent1 = (updates: Partial<ParentInfo>) => {
    onParentChange({ parent1: { ...parentData.parent1, ...updates } });
  };
  const updateParent2 = (updates: Partial<ParentInfo>) => {
    onParentChange({ parent2: { ...parentData.parent2, ...updates } });
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <h2 className="font-heading text-2xl font-semibold text-gray-900 mb-1">
          XII. ODDIEL
        </h2>
        <p className="text-sm text-gray-600">
          Podiel zaplatenej dane (§50 + §50aa)
        </p>
        <MarginNote
          section="§50, §50aa"
          href="https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/#paragraf-50"
        >
          Zákon č. 595/2003 Z.z. §50 a §50aa:<br />Použitie podielu zaplatenej dane. 2 % (alebo 3 % pre dobrovoľníkov), min. 3 EUR. Zoznam prijímateľov: financnasprava.sk.
        </MarginNote>
      </div>

      {/* §50: 2%/3% to NGO */}
      <Toggle
        enabled={data.enabled}
        onToggle={(enabled) => onChange({ enabled })}
        label="Chcem poukázať 2 % (alebo 3 %) z dane organizácii"
      />

      {data.enabled && (
        <>
          <div className="relative">
          <SectionCard title="Príjemca podielu" subtitle="Organizácia, ktorej poukážete podiel dane. Zoznam prijímateľov: financnasprava.sk">
            <div className="space-y-4">
              <FormField
                label="Organizácia (príjemca 2 %)"
                hint="Vyberte z oficiálneho zoznamu FS alebo hľadajte podľa názvu / IČO"
                required
                error={data.enabled ? requiredError(showErrors, data.ico) : undefined}
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
                    <span className="text-sm text-gray-700">Spĺňam podmienky pre 3 %</span>
                    <p className="text-xs text-gray-500">Dobrovoľník s potvrdením (min. 40 hodín)</p>
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
                    <span className="text-sm text-gray-700">Súhlasím so zaslaním údajov príjemcovi</span>
                    <p className="text-xs text-gray-500">Organizácia bude vedieť, kto jej poukázal podiel dane</p>
                  </div>
                </label>
              </div>

              {/* Calculated amount */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                  <div>
                    <span className="text-xs text-gray-500">
                      Poukázaná suma ({data.splnam3per ? '3 %' : '2 %'})
                    </span>
                    <p className="text-xs text-gray-600 mt-0.5">Automaticky z riadku 124</p>
                  </div>
                  <span className="font-heading text-lg font-semibold text-gray-900 tabular-nums">
                    {calculatedAmount && safeDecimal(calculatedAmount).gt(0)
                      ? `${fmtEur(calculatedAmount)} EUR`
                      : '-- EUR'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
          </div>
        </>
      )}

      {/* §50aa: 2% to parents */}
      {/* ═══════════════════════════════════════════════════ */}

      <div className="border-t border-gray-200 pt-6">
        <SectionCard
          title="Chcete poukázať 2% dane rodičom? (§50aa)"
          subtitle="Rodič musí k 31.12. poberať starobný dôchodok alebo invalidný dôchodok po dovŕšení dôchodkového veku. Neovplyvňuje poukázanie organizácii vyššie."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              {PARENT_CHOICES.map((choice) => (
                <label
                  key={choice.value}
                  className={`
                    flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${parentData.choice === choice.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="parentChoice"
                    value={choice.value}
                    checked={parentData.choice === choice.value}
                    onChange={() => onParentChange({ choice: choice.value })}
                    className="mt-0.5 w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500/20"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">{choice.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{choice.description}</p>
                  </div>
                </label>
              ))}
            </div>

            {parentData.choice !== 'none' && (
              <>
                {parentAmount > 0 && (
                  <InfoBox>
                    {parentData.choice === 'both'
                      ? <>Každý rodič dostane <strong>{parentAmount.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</strong>.</>
                      : <>Rodič dostane <strong>{parentAmount.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR</strong>.</>
                    }
                    {' '}Minimum je <strong>3 EUR</strong>.
                  </InfoBox>
                )}

                <div className="pt-2">
                  {parentData.choice === 'both' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <ParentForm label="Údaje o rodičovi 1" parent={parentData.parent1} onParentChange={updateParent1} showErrors={showErrors} />
                      <ParentForm label="Údaje o rodičovi 2" parent={parentData.parent2} onParentChange={updateParent2} showErrors={showErrors} />
                    </div>
                  ) : (
                    <ParentForm label="Údaje o rodičovi" parent={parentData.parent1} onParentChange={updateParent1} showErrors={showErrors} />
                  )}
                </div>

                {/* Adopted checkbox */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentData.osvojeny}
                    onChange={(e) => onParentChange({ osvojeny: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div>
                    <span className="text-sm text-gray-700">Bol/a som osvojený/á rodičmi</span>
                    <p className="text-xs text-gray-500">Zverený/á do starostlivosti nahrádzajúcej starostlivosť rodičov</p>
                  </div>
                </label>

                {/* Calculated amount */}
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <div>
                      <span className="text-xs text-gray-500">
                        Suma na {parentCount === 2 ? 'každého rodiča' : 'rodiča'} (2 %)
                      </span>
                      <p className="text-xs text-gray-600 mt-0.5">Automaticky z riadku 124</p>
                    </div>
                    <span className="font-heading text-lg font-semibold text-gray-900 tabular-nums">
                      {parentAmount > 0
                        ? `${parentAmount.toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR`
                        : '-- EUR'}
                    </span>
                  </div>
                  {parentCount === 2 && parentAmount > 0 && (
                    <p className="text-xs text-gray-600 text-right mt-1">
                      Spolu: {(parentAmount * 2).toLocaleString('sk-SK', { minimumFractionDigits: 2 })} EUR
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
