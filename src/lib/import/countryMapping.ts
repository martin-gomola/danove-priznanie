/**
 * Map ISO 3166-1 alpha-2 country codes (e.g. US, FR) to numeric codes (840, 250)
 * used by the Slovak DPFO form and DIVIDEND_COUNTRIES.
 * IBKR CSV and 1042-S use alpha-2; our form uses numeric.
 */
export const ALPHA2_TO_NUMERIC: Record<string, string> = {
  US: '840',
  FR: '250',
  IE: '372',
  GB: '826',
  DE: '276',
  NL: '528',
  CH: '756',
  LU: '442',
  CA: '124',
  AT: '040',
  BE: '056',
  CZ: '203',
  DK: '208',
  EE: '233',
  FI: '246',
  GR: '300',
  HU: '348',
  IT: '380',
  LV: '428',
  LT: '440',
  NO: '578',
  PL: '616',
  PT: '620',
  RO: '642',
  ES: '724',
  SE: '752',
  AU: '036',
  CN: '156',
  HK: '344',
  JP: '392',
  KR: '410',
  TW: '158',
  BR: '076',
  IL: '376',
  ZA: '710',
  CY: '196',
  MT: '470',
  SI: '705',
  SK: '703',
  // 1042-S may use EI (Ireland) as country code
  EI: '372',
};

/** Convert alpha-2 country code to numeric; returns numeric or original if unknown */
export function alpha2ToNumeric(alpha2: string): string {
  const upper = alpha2?.trim().toUpperCase() || '';
  return ALPHA2_TO_NUMERIC[upper] ?? upper;
}
