/**
 * TaxForm - Main data model for the Slovak DPFO typ B tax return (2025)
 *
 * This represents all user inputs across the wizard steps.
 * Calculated values are derived from this in the tax engine.
 *
 * Row numbers match the official form at:
 * https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html
 */

// ── Shared types ─────────────────────────────────────────────────────
export interface PrijimatelItem {
  ico: string;
  obchMeno: string;
}

// ── Personal Info (Oddiel I) ──────────────────────────────────────────
export interface PersonalInfo {
  dic: string; // DIC (tax identification number)
  priezvisko: string;
  meno: string;
  titul: string;
  titulZa: string;
  ulica: string;
  cislo: string;
  psc: string;
  obec: string;
  stat: string; // default "Slovenská republika"
}

// ── Employment Income (Oddiel V) ─────────────────────────────────────
export interface EmploymentIncome {
  enabled: boolean;
  r36: string; // Úhrn príjmov (gross income)
  r36a: string; // Príjmy z dohôd (income from work agreements, optional)
  r37: string; // Úhrn povinného poistného (insurance premiums)
  r131: string; // Úhrn preddavkov na daň (tax advances withheld)
}

// ── Foreign Dividends (Príloha č.2 + Oddiel XIII) ────────────────────
export interface DividendEntry {
  id: string;
  ticker: string;
  country: string; // ISO country code, default "840" (USA)
  countryName: string; // display name, default "USA"
  currency: 'USD' | 'EUR' | 'CZK'; // dividend currency - EUR for Eurozone, CZK for Czechia, USD for rest
  amountOriginal: string; // gross dividends in original currency (USD, EUR, or CZK)
  amountEur: string; // EUR equivalent (auto-converted, or direct for EUR)
  withheldTaxOriginal: string; // tax withheld in original currency
  withheldTaxEur: string; // EUR equivalent of withheld tax
}

export interface ForeignDividends {
  enabled: boolean;
  entries: DividendEntry[];
  ecbRate: string; // ECB annual average rate USD/EUR for 2025
  ecbRateOverride: boolean; // whether user overrode the default rate
  czkRate: string; // ECB annual average rate CZK/EUR for 2025
  czkRateOverride: boolean; // whether user overrode the default CZK rate
}

// ── Mutual Fund Sales (Oddiel VII, Tabulka 2) ────────────────────────
export interface MutualFundEntry {
  id: string;
  fundName: string;
  purchaseAmount: string; // EUR
  saleAmount: string; // EUR
}

export interface MutualFundSales {
  enabled: boolean;
  entries: MutualFundEntry[];
}

// ── Stock Sales (§8 ods.1 písm.e, Tabulka 3 - held under 1 year) ─────
export interface StockEntry {
  id: string;
  ticker: string;
  purchaseAmount: string; // EUR
  saleAmount: string; // EUR
}

export interface StockSales {
  enabled: boolean;
  entries: StockEntry[];
}

// ── Mortgage Interest (Oddiel IV, §33a) ──────────────────────────────
export interface MortgageInterest {
  enabled: boolean;
  zaplateneUroky: string; // interest paid in EUR
  pocetMesiacov: string; // number of months
  datumZacatiaUroceniaUveru: string; // loan interest start date
  datumUzavretiaZmluvy: string; // contract date
  /** User confirms bonus is claimed within the 4-year limit (§33a) */
  confirm4Years: boolean;
}

// ── Spouse NCZD (Oddiel III, §11 ods.3 - nezdaniteľná časť na manžela/manželku)
export interface SpouseNCZD {
  enabled: boolean;
  priezviskoMeno: string; // r.31
  rodneCislo: string; // r.31
  vlastnePrijmy: string; // r.32 - spouse's own income (EUR)
  pocetMesiacov: string; // r.32 - months qualifying (1-12)
}

// ── III. pillar DDS (Oddiel III, §11 ods.8 - príspevky na doplnkové dôchodkové sporenie)
export interface DDSContributions {
  enabled: boolean;
  prispevky: string; // annual contributions EUR, max 180
}

// ── Child Tax Bonus (Oddiel III, §33) ─────────────────────────────────
export interface ChildEntry {
  id: string;
  priezviskoMeno: string; // child's full name (surname first)
  rodneCislo: string; // birth number (YYMMDD/XXXX) - determines age
  months: boolean[]; // 12 booleans for m01-m12 (eligibility per month)
  wholeYear: boolean; // convenience: all 12 months
}

export interface ChildBonus {
  enabled: boolean;
  children: ChildEntry[];
  bonusPaidByEmployer: string; // r.119 - already paid during year
}

// ── 2% Tax Allocation (Oddiel XII, §50) ──────────────────────────────
export interface TwoPercentAllocation {
  enabled: boolean;
  ico: string; // ICO of the NGO
  obchMeno: string; // organization name
  splnam3per: boolean; // volunteer checkbox (for 3%)
  suhlasSoZaslanim: boolean; // consent to share data with org
}

// ── AI Copilot ────────────────────────────────────────────────────────
export type AIMode = 'managed' | 'byok';

export interface AIProviderConfig {
  mode: AIMode;
  provider: 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
  lastConnectionCheck: string; // ISO date string, empty when never checked
  connectionOk: boolean;
}

export interface DocumentInboxItem {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string; // ISO date string
  documentType: 'employment' | 'dividends' | '1042s' | 'broker_report' | 'mortgage' | 'childBonus' | 'other' | 'unknown';
  parseStatus: 'queued' | 'parsed' | 'failed';
}

export interface EvidenceItem {
  fieldPath: string; // e.g. 'employment.r36'
  docId: string;
  snippet: string;
  confidence: number; // 0–1 extraction confidence
  extractedAt: string; // ISO date string
}

export interface RiskWarning {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  fieldPath: string;
  suggestion: string;
}

export interface AICopilotState {
  provider: AIProviderConfig;
  documentInbox: DocumentInboxItem[];
  evidence: EvidenceItem[];
  warnings: RiskWarning[];
  readinessScore: number;
}

// ── 2% Tax Allocation to Parents (Oddiel XII, §50aa) ─────────────────
export type ParentAllocationChoice = 'both' | 'one' | 'none';

export interface ParentInfo {
  meno: string;
  priezvisko: string;
  rodneCislo: string;
}

export interface ParentTaxAllocation {
  choice: ParentAllocationChoice;
  parent1: ParentInfo;
  parent2: ParentInfo;
  osvojeny: boolean; // bol/a som zverený/á do starostlivosti
}

// ── Complete Tax Form ────────────────────────────────────────────────
export interface TaxFormData {
  // Step 1
  personalInfo: PersonalInfo;
  // Step 2
  employment: EmploymentIncome;
  // Step 3
  dividends: ForeignDividends;
  // Step 4
  mutualFunds: MutualFundSales;
  stockSales: StockSales;
  // Step 5
  mortgage: MortgageInterest;
  // Step 6 - Oddiel III: spouse (§11 ods.3), DDS (§11 ods.8), child bonus (§33)
  spouse: SpouseNCZD;
  dds: DDSContributions;
  childBonus: ChildBonus;
  // Step 7
  twoPercent: TwoPercentAllocation;
  // Step 8 (before review)
  parentAllocation: ParentTaxAllocation;
  // AI Copilot
  aiCopilot: AICopilotState;
  // Meta
  currentStep: number;
  lastSaved: string; // ISO date string
}

// ── Calculated Tax Result ────────────────────────────────────────────
// Row numbers match the official DPFO typ B 2025 form exactly.
// See: https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html
export interface TaxCalculationResult {
  // ── Oddiel V: Employment ───────────────────────────────
  r38: string; // r.36 - r.37 (základ dane zo závislej činnosti)

  // ── Oddiel VII: Capital income (§7) ────────────────────
  // Tabuľka 2, r.7 (podielové listy)
  totalFundIncome: string; // t2r7.s1 (príjmy)
  totalFundExpense: string; // t2r7.s2 (výdavky)
  r66: string; // úhrn príjmov z tabuľky 2 (= totalFundIncome)
  r67: string; // úhrn výdavkov z tabuľky 2 (= totalFundExpense)
  r68: string; // osobitný základ dane z §7 = max(r66 - r67, 0)

  // ── Oddiel VIII: Other income (§8, Tabulka 3 - stocks held under 1 year)
  r69: string; // úhrn príjmov z tabuľky 3
  r70: string; // úhrn výdavkov z tabuľky 3
  r71: string; // osobitný základ dane z §8 = max(r69 - r70, 0)

  // ── Príloha č.2: Dividends ─────────────────────────────
  totalDividendsEur: string;
  totalWithheldTaxEur: string; // daň zaplatená v zahraničí
  pril2_pr1: string;  // podiel na zisku (dividenda)
  pril2_pr6: string;  // spolu
  pril2_pr7: string;  // osobitný základ dane
  pril2_pr8: string;  // sadzba dane (7)
  pril2_pr9: string;  // daň = pr7 × 7% (before credit)
  pril2_pr13: string; // príjmy zo zahraničia na zápočet
  pril2_pr14: string; // daň zaplatená v zahraničí
  pril2_pr15: string; // percento dane na zápočet
  pril2_pr16: string; // z dane možno započítať
  pril2_pr17: string; // daň uznaná na zápočet (min of pr16 and pr14)
  pril2_pr18: string; // daň po zápočte = pr9 - pr17
  pril2_pr28: string; // celková daň z dividend (pr18 + pr27)

  // ── Oddiel IX: Tax calculation ─────────────────────────

  // NCZD reduction
  r72: string; // ZD z §5 pred znížením o NCZD (= r38, no §6)
  r73: string; // NCZD na daňovníka (§11 ods.2)
  r74: string; // NCZD na manžela/manželku (§11 ods.3)
  r75: string; // NCZD na príspevky na DDS (§11 ods.8), max 180 EUR
  r77: string; // nezdaniteľná časť celkom = r73 + r74 + r75, max r.72
  r78: string; // ZD z §5 po znížení = max(r38 - r77, 0)

  // Tax base totals
  r80: string; // ZD podľa §4 ods.1 písm.a = r78 + r71 (employment + §8)

  // Tax from §4 ods.1 písm.a (employment + §6.3,4 + §8)
  r81: string; // Daň z r.80 (progressive 19%/25%)
  r90: string; // Daň po vyňatí a zápočte (simplified = r81)

  // Tax from §7 (capital income - mutual funds)
  r106: string; // Daň 19% z osobitného ZD z §7 (= r68 × 19%)
  r115: string; // Daň z §7 po vyňatí a zápočte (simplified = r106)

  // Grand total tax
  r116: string; // r90 + r105 + r115 + pril2.r28 + pril3.r14

  // Bonuses
  r117: string; // daňový bonus na deti (§33)
  r118: string; // r116 - r117 (daň po daňovom bonuse, min 0)
  r119: string; // bonus na deti už vyplatený zamestnávateľom
  r120: string; // r.117 − r.119 (zostávajúci bonus na deti)
  r121: string; // bonus na deti na poukázanie správcom dane
  r122: string; // nesprávne vyplatený bonus
  r123: string; // daňový bonus na zaplatené úroky (§33a)
  r124: string; // r118 - r123 (daň po všetkých bonusoch, min 0)

  // Mortgage bonus remainder
  r126: string; // r.123 − r.125 (zostávajúci bonus na úroky)
  r127: string; // max(r.126 − r.118, 0) (bonus na úroky na poukázanie správcom dane)

  // Advances and final
  r131: string; // preddavky na daň zrazené z §5 (from employment)

  // Final result
  // r135 = r116 - r117 - r123 - r131 (simplified, if positive)
  r135: string; // daň na úhradu (tax to pay)
  r136: string; // daňový preplatok (tax refund)

  // 2% allocation (§50)
  r152: string; // 2% or 3% of r124

  // 2% allocation to parents (§50aa)
  parentAllocPerParent: string; // 2% of r124 per parent (min 3 EUR or 0)

  // Summary helpers
  finalTaxToPay: string;
  finalTaxRefund: string;
  isRefund: boolean;
}

// ── Default values ────────────────────────────────────────────────────
export const DEFAULT_PERSONAL_INFO: PersonalInfo = {
  dic: '',
  priezvisko: '',
  meno: '',
  titul: '',
  titulZa: '',
  ulica: '',
  cislo: '',
  psc: '',
  obec: '',
  stat: 'Slovenská republika',
};

export const DEFAULT_EMPLOYMENT: EmploymentIncome = {
  enabled: true,
  r36: '',
  r36a: '',
  r37: '',
  r131: '',
};

export const DEFAULT_DIVIDENDS: ForeignDividends = {
  enabled: false,
  entries: [],
  ecbRate: '1.13', // ECB 2025 annual average USD/EUR
  ecbRateOverride: false,
  czkRate: '25.21', // ECB 2025 annual average CZK/EUR
  czkRateOverride: false,
};

export const DEFAULT_MUTUAL_FUNDS: MutualFundSales = {
  enabled: false,
  entries: [],
};

export const DEFAULT_STOCK_SALES: StockSales = {
  enabled: false,
  entries: [],
};

export const DEFAULT_MORTGAGE: MortgageInterest = {
  enabled: false,
  zaplateneUroky: '',
  pocetMesiacov: '',
  datumZacatiaUroceniaUveru: '',
  datumUzavretiaZmluvy: '',
  confirm4Years: false,
};

const EMPTY_12_MONTHS = (): boolean[] => Array(12).fill(true);

export const DEFAULT_CHILD_ENTRY = (id: string): ChildEntry => ({
  id,
  priezviskoMeno: '',
  rodneCislo: '',
  months: EMPTY_12_MONTHS(),
  wholeYear: true,
});

export const DEFAULT_SPOUSE: SpouseNCZD = {
  enabled: false,
  priezviskoMeno: '',
  rodneCislo: '',
  vlastnePrijmy: '',
  pocetMesiacov: '',
};

export const DEFAULT_DDS: DDSContributions = {
  enabled: false,
  prispevky: '',
};

export const DEFAULT_CHILD_BONUS: ChildBonus = {
  enabled: false,
  children: [],
  bonusPaidByEmployer: '',
};

export const DEFAULT_TWO_PERCENT: TwoPercentAllocation = {
  enabled: false,
  ico: '',
  obchMeno: '',
  splnam3per: false,
  suhlasSoZaslanim: false,
};

export const DEFAULT_PARENT_INFO: ParentInfo = {
  meno: '',
  priezvisko: '',
  rodneCislo: '',
};

export const DEFAULT_PARENT_ALLOCATION: ParentTaxAllocation = {
  choice: 'none',
  parent1: { ...DEFAULT_PARENT_INFO },
  parent2: { ...DEFAULT_PARENT_INFO },
  osvojeny: false,
};

export const DEFAULT_AI_PROVIDER: AIProviderConfig = {
  mode: 'byok',
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o',
  lastConnectionCheck: '',
  connectionOk: false,
};

export const DEFAULT_AI_COPILOT: AICopilotState = {
  provider: DEFAULT_AI_PROVIDER,
  documentInbox: [],
  evidence: [],
  warnings: [],
  readinessScore: 0,
};

export const DEFAULT_TAX_FORM: TaxFormData = {
  personalInfo: DEFAULT_PERSONAL_INFO,
  employment: DEFAULT_EMPLOYMENT,
  dividends: DEFAULT_DIVIDENDS,
  mutualFunds: DEFAULT_MUTUAL_FUNDS,
  stockSales: DEFAULT_STOCK_SALES,
  mortgage: DEFAULT_MORTGAGE,
  spouse: DEFAULT_SPOUSE,
  dds: DEFAULT_DDS,
  childBonus: DEFAULT_CHILD_BONUS,
  twoPercent: DEFAULT_TWO_PERCENT,
  parentAllocation: DEFAULT_PARENT_ALLOCATION,
  aiCopilot: DEFAULT_AI_COPILOT,
  currentStep: 0,
  lastSaved: '',
};
