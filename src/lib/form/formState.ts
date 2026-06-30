import type { TaxFormData } from '@/types/TaxForm';
import { DEFAULT_TAX_FORM } from '@/types/TaxForm';
import { reconcileForeignDividends } from '@/lib/dividends/normalization';

export const ALLOWED_FORM_SECTIONS = [
  'personalInfo',
  'employment',
  'dividends',
  'mutualFunds',
  'stockSales',
  'mortgage',
  'spouse',
  'dds',
  'childBonus',
  'twoPercent',
  'parentAllocation',
  'refundRequest',
] as const;

export type FormSection = typeof ALLOWED_FORM_SECTIONS[number];
type DeepPartial<T> = T extends unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type FormPatch = { [K in FormSection]?: DeepPartial<TaxFormData[K]> } & Partial<Pick<TaxFormData, 'currentStep' | 'lastSaved'>>;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeSection<T extends object>(base: T, patch?: unknown): T {
  if (!isPlainRecord(patch)) return base;
  const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, value] of Object.entries(patch)) {
    const baseValue = merged[key];
    merged[key] = isPlainRecord(baseValue) && isPlainRecord(value)
      ? deepMergeSection(baseValue, value)
      : value;
  }

  return merged as T;
}

export function mergeTaxFormData(base: TaxFormData, patch: FormPatch | undefined | null): TaxFormData {
  if (!patch) return base;

  return {
    ...base,
    ...patch,
    personalInfo: deepMergeSection(base.personalInfo, patch.personalInfo),
    employment: deepMergeSection(base.employment, patch.employment),
    dividends: reconcileForeignDividends(deepMergeSection(base.dividends, patch.dividends)),
    mutualFunds: deepMergeSection(base.mutualFunds, patch.mutualFunds),
    stockSales: deepMergeSection(base.stockSales, patch.stockSales),
    mortgage: deepMergeSection(base.mortgage, patch.mortgage),
    spouse: deepMergeSection(base.spouse, patch.spouse),
    dds: deepMergeSection(base.dds, patch.dds),
    childBonus: deepMergeSection(base.childBonus, patch.childBonus),
    twoPercent: deepMergeSection(base.twoPercent, patch.twoPercent),
    parentAllocation: deepMergeSection(base.parentAllocation, patch.parentAllocation),
    refundRequest: deepMergeSection(base.refundRequest, patch.refundRequest),
  };
}

export function hydrateTaxFormData(saved: DeepPartial<TaxFormData> | undefined | null): TaxFormData {
  return mergeTaxFormData(DEFAULT_TAX_FORM, saved ?? {});
}

export function applyExternalFormUpdate(prev: TaxFormData, patch: unknown): TaxFormData {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return prev;
  return mergeTaxFormData(prev, patch as FormPatch);
}

export function resetTaxFormData(): TaxFormData {
  return hydrateTaxFormData({});
}
