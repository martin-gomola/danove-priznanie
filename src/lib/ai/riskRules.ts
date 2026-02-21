import type { RiskWarning, TaxFormData } from '@/types/TaxForm';

export function evaluateRiskRules(form: TaxFormData): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  if (form.employment.enabled && !form.employment.r36?.trim()) {
    warnings.push({
      severity: 'error',
      code: 'MISSING_EMPLOYMENT_DATA',
      message:
        'Zamestnanie je zapnuté, ale chýba úhrn príjmov (r.36).',
      fieldPath: 'employment.r36',
      suggestion: 'Vyplňte údaje zo zamestnaneckého potvrdenia.',
    });
  }

  if (form.dividends.enabled && form.dividends.entries.length === 0) {
    warnings.push({
      severity: 'warning',
      code: 'DIVIDENDS_ENABLED_NO_ENTRIES',
      message: 'Dividendy sú zapnuté, ale nemáte žiadne položky.',
      fieldPath: 'dividends.entries',
      suggestion: 'Pridajte dividendové položky alebo vypnite sekciu.',
    });
  }

  const hasUsdEntries =
    form.dividends.enabled &&
    form.dividends.entries.some((e) => e.currency === 'USD');
  const ecbEmpty =
    !form.dividends.ecbRate?.trim() || form.dividends.ecbRate === '0';
  if (hasUsdEntries && ecbEmpty) {
    warnings.push({
      severity: 'warning',
      code: 'MISSING_EXCHANGE_RATE',
      message: 'Chýba kurz USD/EUR pre prepočet dividend.',
      fieldPath: 'dividends.ecbRate',
      suggestion: 'Zadajte ročný priemer ECB kurzu.',
    });
  }

  return warnings;
}
