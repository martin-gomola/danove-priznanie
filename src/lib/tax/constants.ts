/**
 * Slovak Tax Constants for 2025
 *
 * Official values for DPFO typ B 2025 tax return.
 * Sources: financnasprava.sk, Slovak Tax Code (Zákon č. 595/2003 Z.z.)
 */

export const TAX_YEAR = 2025;

// ── Životné minimum (subsistence minimum) ────────────────────────────
// Valid from 1.7.2024 to 30.6.2025 (used for 2025 tax year)
// Source: Opatrenie MPSVR SR č. 201/2024 Z.z.
export const ZIVOTNE_MINIMUM = 273.99; // EUR/month

// ── NCZD (Non-taxable amount for taxpayer, §11 ods. 2) ──────────────
// 21 × životné minimum (annual)
export const NCZD_ZAKLAD = 21 * ZIVOTNE_MINIMUM; // 5,753.79 EUR

// Threshold: 92.8 × životné minimum
export const NCZD_THRESHOLD = 92.8 * ZIVOTNE_MINIMUM; // 25,426.27 EUR

// If tax base <= threshold: NCZD = 21 × ZM
// If tax base > threshold: NCZD = 44.2 × ZM - (tax_base / 4)
export const NCZD_MULTIPLIER_HIGH = 44.2 * ZIVOTNE_MINIMUM; // 12,110.36 EUR

// ── NCZD for spouse (§11 ods. 3) ─────────────────────────────────────
// 19.2 × životné minimum (annual)
export const NCZD_SPOUSE_ZAKLAD = 19.2 * ZIVOTNE_MINIMUM; // 5,260.61 EUR

// If taxpayer's tax base > 176.8 × ŽM: NCZD = 63.4 × ŽM - (tax_base / 4) - spouse_income
export const NCZD_SPOUSE_MULTIPLIER_HIGH = 63.4 * ZIVOTNE_MINIMUM; // 17,370.97 EUR

// ── Tax rates ────────────────────────────────────────────────────────
export const TAX_RATE_LOWER = 0.19; // 19% for base up to threshold
export const TAX_RATE_UPPER = 0.25; // 25% for base above threshold

// Tax bracket threshold: 176.8 × životné minimum
export const TAX_BRACKET_THRESHOLD = 176.8 * ZIVOTNE_MINIMUM; // 48,441.43 EUR

// ── Dividend tax rate (§51e) ─────────────────────────────────────────
export const DIVIDEND_TAX_RATE = 0.07; // 7% for foreign dividends

// ── Capital income tax rate (§7) ─────────────────────────────────────
// Príjmy z kapitálového majetku (§7, vrátane predaja podielových fondov) tvoria
// osobitný základ dane a zdaňujú sa jednotnou sadzbou 19 % - nie progresívnou
// 19%/25%. Zdroj: podpora.financnasprava.sk, Zákon 595/2003 Z.z. §7.
export const CAPITAL_TAX_RATE = 0.19; // 19% flat rate for §7 income

// ── Mortgage interest deduction (§33a) ───────────────────────────────
export const MORTGAGE_BONUS_RATE = 0.5; // 50% of interest paid
export const MORTGAGE_MAX_OLD = 400; // max EUR for contracts before 31.12.2023
export const MORTGAGE_MAX_NEW = 1200; // max EUR for contracts from 1.1.2024

// ── Child tax bonus (§33) - from 1.1.2025 ───────────────────────────
// Source: Zákon 278/2024 (konsolidačný balíček), 44/DZPaU/2025/MU
export const CHILD_BONUS_UNDER_15 = 100; // EUR/month
export const CHILD_BONUS_15_TO_18 = 50; // EUR/month
export const CHILD_BONUS_PHASE_OUT_THRESHOLD = 2145; // monthly tax base EUR
export const CHILD_BONUS_PHASE_OUT_DIVISOR = 10;

// ── 2% / 3% tax allocation (§50) ────────────────────────────────────
export const TWO_PERCENT_RATE = 0.02;
export const THREE_PERCENT_RATE = 0.03; // if volunteered 40+ hours
export const MIN_ALLOCATION = 3; // minimum allocation amount EUR

// ── 2% tax allocation to parents (§50aa) ────────────────────────────
// 2% of paid tax per parent (same rate as §50 NGO allocation)
export const PARENT_ALLOCATION_RATE = 0.02;
export const MIN_PARENT_ALLOCATION = 3; // minimum per parent EUR

// ── ECB Annual Average Exchange Rate USD/EUR 2025 ────────────────────
// Official 2025 annual average rate published by ECB
// Source: https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.USD.EUR.SP00.A
export const ECB_RATE_2025 = 1.13; // USD per 1 EUR

// ── ECB Annual Average Exchange Rate CZK/EUR 2025 ────────────────────
// Source: https://data.ecb.europa.eu/data/datasets/EXR/EXR.A.CZK.EUR.SP00.A
export const ECB_CZK_RATE_2025 = 25.21; // CZK per 1 EUR

// ── Form metadata ────────────────────────────────────────────────────
export const FORM_TYPE = 'B'; // DPFO typ B
export const FORM_YEAR = '2025';
