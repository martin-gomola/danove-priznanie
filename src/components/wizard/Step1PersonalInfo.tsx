'use client';

import React, { useRef, useCallback } from 'react';
import { PersonalInfo } from '@/types/TaxForm';
import { FormField, Input, SectionCard } from '@/components/ui/FormField';
import { validateRodneCislo } from '@/lib/utils/validateRodneCislo';
import { Upload } from 'lucide-react';

/**
 * Validate DIČ or rodné číslo (digits only, no slash).
 * DIČ = exactly 10 digits. RC = 9 or 10 digits with valid checksum.
 */
function validateDicOrRc(value: string): string | undefined {
  if (!value) return undefined;
  // Exactly 10 digits → valid DIČ
  if (/^\d{10}$/.test(value)) return undefined;
  // Otherwise validate as rodné číslo (without delimiter)
  const rc = validateRodneCislo(value);
  return rc.valid ? undefined : rc.error;
}

interface Props {
  data: PersonalInfo;
  onChange: (updates: Partial<PersonalInfo>) => void;
  onImport: (file: File) => void;
}

export function Step1PersonalInfo({ data, onChange, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportXml = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onImport(file);
      e.target.value = '';
    },
    [onImport]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            I. ODDIEL
          </h2>
          <p className="text-sm text-gray-500">
            Údaje o daňovníkovi
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            onChange={onFileChange}
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={handleImportXml}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import z XML
          </button>
        </div>
      </div>

      <SectionCard title="Identifikácia">
        <div className="space-y-4">
          <FormField
            label="DIČ / Rodné číslo"
            hint="DIČ (10 číslic) alebo rodné číslo (YYMMDDXXXX, bez lomítka)"
            hintIcon
            required
            error={validateDicOrRc(data.dic)}
          >
            <Input
              value={data.dic}
              onChange={(e) => onChange({ dic: e.target.value.replace(/\D/g, '') })}
              placeholder="1234567890"
              maxLength={10}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Titul pred menom">
              <Input
                value={data.titul}
                onChange={(e) => onChange({ titul: e.target.value })}
                placeholder="Ing."
              />
            </FormField>
            <FormField label="Titul za menom">
              <Input
                value={data.titulZa}
                onChange={(e) => onChange({ titulZa: e.target.value })}
                placeholder="PhD."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Meno" required>
              <Input
                value={data.meno}
                onChange={(e) => onChange({ meno: e.target.value })}
                placeholder="Ján"
              />
            </FormField>
            <FormField label="Priezvisko" required>
              <Input
                value={data.priezvisko}
                onChange={(e) => onChange({ priezvisko: e.target.value })}
                placeholder="Novák"
              />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Adresa trvalého pobytu">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <FormField label="Ulica" required>
                <Input
                  value={data.ulica}
                  onChange={(e) => onChange({ ulica: e.target.value })}
                  placeholder="Hlavná"
                />
              </FormField>
            </div>
            <FormField label="Číslo" required>
              <Input
                value={data.cislo}
                onChange={(e) => onChange({ cislo: e.target.value })}
                placeholder="1"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="PSČ" required>
              <Input
                value={data.psc}
                onChange={(e) => onChange({ psc: e.target.value })}
                placeholder="81101"
                maxLength={5}
              />
            </FormField>
            <div className="col-span-2">
              <FormField label="Obec" required>
                <Input
                  value={data.obec}
                  onChange={(e) => onChange({ obec: e.target.value })}
                  placeholder="Bratislava"
                />
              </FormField>
            </div>
          </div>

          <FormField label="Štát">
            <Input
              value={data.stat}
              onChange={(e) => onChange({ stat: e.target.value })}
              placeholder="Slovenská republika"
            />
          </FormField>
        </div>
      </SectionCard>
    </div>
  );
}
