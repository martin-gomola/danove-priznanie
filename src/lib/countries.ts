/**
 * Countries for dividend reporting on the Slovak DPFO typ B tax return.
 * Uses ISO 3166-1 numeric codes as required by financnasprava.sk.
 *
 * Sorted: most common dividend sources first, then alphabetical.
 */

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

/** Czech Republic ISO 3166-1 numeric code */
const CZK_CODE = '203';

/** Returns true if the country uses CZK as its currency (Czech Republic) */
export function isCzkCountry(code: string): boolean {
  return code === CZK_CODE;
}

/** Derive the dividend currency for a given country code */
export function getCurrencyForCountry(code: string): 'USD' | 'EUR' | 'CZK' {
  if (isEurozoneCountry(code)) return 'EUR';
  if (isCzkCountry(code)) return 'CZK';
  return 'USD';
}
