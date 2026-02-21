import type { TaxFormData, TaxCalculationResult, RiskWarning } from '@/types/TaxForm';

export interface HandoffSummary {
  generatedAt: string;
  readinessScore: number;
  sections: {
    name: string;
    enabled: boolean;
    keyValues: Record<string, string>;
  }[];
  warnings: RiskWarning[];
  evidenceCount: number;
}

export function buildHandoffSummary(
  form: TaxFormData,
  calc: TaxCalculationResult,
  warnings: RiskWarning[]
): HandoffSummary {
  const readinessScore = Math.max(
    0,
    100 -
      warnings.filter((w) => w.severity === 'error').length * 20 -
      warnings.filter((w) => w.severity === 'warning').length * 10 -
      warnings.filter((w) => w.severity === 'info').length * 5
  );

  const sections: HandoffSummary['sections'] = [
    {
      name: 'Employment',
      enabled: form.employment.enabled,
      keyValues: {
        r36: form.employment.r36 ?? '',
        r37: form.employment.r37 ?? '',
        r131: form.employment.r131 ?? '',
      },
    },
    {
      name: 'Dividends',
      enabled: form.dividends.enabled,
      keyValues: {
        totalDividendsEur: calc.totalDividendsEur ?? '',
        totalWithheldTaxEur: calc.totalWithheldTaxEur ?? '',
        entryCount: String(form.dividends.entries?.length ?? 0),
      },
    },
    {
      name: 'MutualFunds',
      enabled: form.mutualFunds.enabled,
      keyValues: {
        r66: calc.r66 ?? '',
        r67: calc.r67 ?? '',
        r68: calc.r68 ?? '',
      },
    },
    {
      name: 'StockSales',
      enabled: form.stockSales.enabled,
      keyValues: {
        r69: calc.r69 ?? '',
        r70: calc.r70 ?? '',
        r71: calc.r71 ?? '',
      },
    },
    {
      name: 'Mortgage',
      enabled: form.mortgage.enabled,
      keyValues: {
        r123: calc.r123 ?? '',
      },
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    readinessScore,
    sections,
    warnings,
    evidenceCount: form.aiCopilot?.evidence?.length ?? 0,
  };
}
