/**
 * Countries for dividend reporting on the Slovak DPFO typ B tax return.
 * Uses ISO 3166-1 numeric codes as required by financnasprava.sk.
 *
 * Sorted: most common dividend sources first, then alphabetical.
 */

import type { DividendCurrency } from '@/types/TaxForm';

export interface Country {
  code: string; // ISO 3166-1 numeric (3-digit string)
  name: string; // Slovak display name
}

export const DIVIDEND_COUNTRIES: Country[] = [
  // ── Most common dividend sources ──────────────────────────
  { code: '840', name: 'USA' },
  { code: '372', name: 'Írsko' },
  { code: '826', name: 'Veľká Británia' },
  { code: '276', name: 'Nemecko' },
  { code: '528', name: 'Holandsko' },
  { code: '756', name: 'Švajčiarsko' },
  { code: '250', name: 'Francúzsko' },
  { code: '442', name: 'Luxembursko' },
  { code: '124', name: 'Kanada' },
  // ── Europe ────────────────────────────────────────────────
  { code: '040', name: 'Rakúsko' },
  { code: '056', name: 'Belgicko' },
  { code: '203', name: 'Česká republika' },
  { code: '208', name: 'Dánsko' },
  { code: '233', name: 'Estónsko' },
  { code: '246', name: 'Fínsko' },
  { code: '300', name: 'Grécko' },
  { code: '348', name: 'Maďarsko' },
  { code: '380', name: 'Taliansko' },
  { code: '428', name: 'Lotyšsko' },
  { code: '440', name: 'Litva' },
  { code: '578', name: 'Nórsko' },
  { code: '616', name: 'Poľsko' },
  { code: '620', name: 'Portugalsko' },
  { code: '642', name: 'Rumunsko' },
  { code: '724', name: 'Španielsko' },
  { code: '752', name: 'Švédsko' },
  // ── Asia & Pacific ────────────────────────────────────────
  { code: '036', name: 'Austrália' },
  { code: '156', name: 'Čína' },
  { code: '344', name: 'Hongkong' },
  { code: '392', name: 'Japonsko' },
  { code: '410', name: 'Kórejská republika' },
  { code: '158', name: 'Taiwan' },
  // ── Other ─────────────────────────────────────────────────
  { code: '076', name: 'Brazília' },
  { code: '376', name: 'Izrael' },
  { code: '710', name: 'Južná Afrika' },
];

/** Look up a country by its numeric code */
export function findCountryByCode(code: string): Country | undefined {
  return DIVIDEND_COUNTRIES.find((c) => c.code === code);
}

/** Eurozone country codes (ISO 3166-1 numeric) - dividends paid in EUR */
const EUROZONE_CODES = new Set([
  '040', // Rakúsko
  '056', // Belgicko
  '196', // Cyprus
  '233', // Estónsko
  '246', // Fínsko
  '250', // Francúzsko
  '276', // Nemecko
  '300', // Grécko
  '372', // Írsko
  '380', // Taliansko
  '428', // Lotyšsko
  '440', // Litva
  '442', // Luxembursko
  '470', // Malta
  '528', // Holandsko
  '620', // Portugalsko
  '703', // Slovensko
  '705', // Slovinsko
  '724', // Španielsko
]);

/** Returns true if the country uses EUR as its currency */
export function isEurozoneCountry(code: string): boolean {
  return EUROZONE_CODES.has(code);
}

const NON_EUR_CURRENCY_BY_COUNTRY: Record<string, DividendCurrency> = {
  '840': 'USD', // USA
  '826': 'GBP', // Veľká Británia
  '756': 'CHF', // Švajčiarsko
  '124': 'CAD', // Kanada
  '203': 'CZK', // Česká republika
  '208': 'DKK', // Dánsko
  '348': 'HUF', // Maďarsko
  '578': 'NOK', // Nórsko
  '616': 'PLN', // Poľsko
  '642': 'RON', // Rumunsko
  '752': 'SEK', // Švédsko
  '036': 'AUD', // Austrália
  '156': 'CNY', // Čína
  '344': 'HKD', // Hongkong
  '392': 'JPY', // Japonsko
  '410': 'KRW', // Kórejská republika
  '158': 'TWD', // Taiwan - ECB annual EUR series not available
  '076': 'BRL', // Brazília
  '376': 'ILS', // Izrael
  '710': 'ZAR', // Južná Afrika
};

/** Returns true if the country uses CZK as its currency (Czech Republic) */
export function isCzkCountry(code: string): boolean {
  return NON_EUR_CURRENCY_BY_COUNTRY[code] === 'CZK';
}

/** Derive the dividend currency for a given country code */
export function getCurrencyForCountry(code: string): DividendCurrency {
  if (isEurozoneCountry(code)) return 'EUR';
  return NON_EUR_CURRENCY_BY_COUNTRY[code] ?? 'USD';
}
