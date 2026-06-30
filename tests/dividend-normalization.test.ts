import { describe, expect, it } from 'vitest';
import { DEFAULT_TAX_FORM } from '@/types/TaxForm';
import { normalizeDividendEntry } from '@/lib/dividends/normalization';
import { getCurrencyForCountry } from '@/lib/countries';

describe('getCurrencyForCountry', () => {
  it('matches dividend currency to the selected country', () => {
    expect(getCurrencyForCountry('372')).toBe('EUR');
    expect(getCurrencyForCountry('826')).toBe('GBP');
    expect(getCurrencyForCountry('124')).toBe('CAD');
    expect(getCurrencyForCountry('756')).toBe('CHF');
    expect(getCurrencyForCountry('616')).toBe('PLN');
    expect(getCurrencyForCountry('158')).toBe('TWD');
  });
});

describe('normalizeDividendEntry', () => {
  it('derives PLN currency from Poland even when saved entry still says USD', () => {
    const normalized = normalizeDividendEntry(
      {
        id: '1',
        ticker: 'AAPL',
        country: '616',
        countryName: 'Poľsko',
        currency: 'USD',
        amountOriginal: '32',
        amountEur: '',
        withheldTaxOriginal: '',
        withheldTaxEur: '',
      },
      DEFAULT_TAX_FORM.dividends,
      { preferExistingEur: false },
    );

    expect(normalized.currency).toBe('PLN');
    expect(normalized.amountEur).toBe('7.55');
  });

  it('derives GBP currency and converts UK dividends with the GBP/EUR annual rate', () => {
    const normalized = normalizeDividendEntry(
      {
        id: '1',
        ticker: 'SHEL.L',
        country: '826',
        countryName: 'Veľká Británia',
        currency: 'USD',
        amountOriginal: '85.67923137255',
        amountEur: '',
        withheldTaxOriginal: '',
        withheldTaxEur: '',
      },
      DEFAULT_TAX_FORM.dividends,
      { preferExistingEur: false },
    );

    expect(normalized.currency).toBe('GBP');
    expect(normalized.amountEur).toBe('100.00');
  });
});
