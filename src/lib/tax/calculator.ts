/**
 * Slovak Tax Calculation Engine
 *
 * Computes all derived values for DPFO typ B 2025 from user inputs.
 * Row numbers match the official form at:
 * https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html
 *
 * Uses decimal.js for exact financial arithmetic.
 */

import Decimal from 'decimal.js';
import { TaxFormData, TaxCalculationResult } from '@/types/TaxForm';
import { dividendToEur } from '@/lib/utils/dividendEur';
import {
  NCZD_ZAKLAD,
  NCZD_THRESHOLD,
  NCZD_MULTIPLIER_HIGH,
  NCZD_SPOUSE_ZAKLAD,
  NCZD_SPOUSE_MULTIPLIER_HIGH,
  DDS_MAX,
  TAX_RATE_LOWER,
  TAX_RATE_UPPER,
  TAX_BRACKET_THRESHOLD,
  TAX_YEAR,
  DIVIDEND_TAX_RATE,
  CAPITAL_TAX_RATE,
  MORTGAGE_BONUS_RATE,
  MORTGAGE_MAX_OLD,
  MORTGAGE_MAX_NEW,
  MORTGAGE_ELIGIBLE_YEARS,
  CHILD_BONUS_PHASE_OUT_THRESHOLD,
  CHILD_BONUS_PHASE_OUT_DIVISOR,
  CHILD_BONUS_PERCENT_CAP,
  CHILD_BONUS_PERCENT_CAP_6_PLUS,
  LOW_INCOME_THRESHOLD,
  SLOVAK_INCOME_RATIO,
  TWO_PERCENT_RATE,
  THREE_PERCENT_RATE,
  MIN_ALLOCATION,
  PARENT_ALLOCATION_RATE,
  MIN_PARENT_ALLOCATION,
  STOCK_SHORT_TERM_EXEMPTION,
} from './constants';
import { parseRodneCislo, getMonthlyRates2025, ageAt } from '@/lib/rodneCislo';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Coerce a form value to Decimal. Returns 0 for empty, null, undefined, or invalid input.
 * @param value - String or number from form (e.g. r36, r37)
 * @returns Decimal instance, or zero
 */
function d(value: string | number): Decimal {
  if (value === '' || value === undefined || value === null) return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Round a Decimal to 2 decimal places using half-up rounding.
 * Single source of truth for all intermediate and final rounding.
 */
function round(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Format a Decimal for display and XML output: 2 decimal places, fixed string.
 */
function fmt(value: Decimal): string {
  return round(value).toFixed(2);
}

/**
 * Calculate NCZD (non-taxable amount) for the taxpayer
 * §11 ods. 2 Zákona o dani z príjmov
 *
 * If tax base ≤ 92.8 × ŽM: NCZD = 21 × ŽM
 * If tax base > 92.8 × ŽM: NCZD = 44.2 × ŽM − (základ dane / 4), min 0
 */
function calculateNCZD(taxBase: Decimal): Decimal {
  if (taxBase.lte(0)) return new Decimal(0);

  const threshold = new Decimal(NCZD_THRESHOLD);
  const nczd21 = new Decimal(NCZD_ZAKLAD);

  if (taxBase.lte(threshold)) {
    return nczd21;
  }

  // NCZD = 44.2 × ŽM - (základ dane / 4)
  const nczd = new Decimal(NCZD_MULTIPLIER_HIGH).minus(taxBase.div(4));
  if (nczd.lt(0)) return new Decimal(0);
  return round(nczd);
}

/**
 * Calculate NCZD (non-taxable amount) for spouse
 * §11 ods. 3 Zákona o dani z príjmov
 *
 * If taxpayer's tax base ≤ 176.8 × ŽM: NCZD = 19.2 × ŽM - spouse_income
 * If taxpayer's tax base > 176.8 × ŽM: NCZD = 63.4 × ŽM − (základ dane / 4) - spouse_income
 * Result is prorated by months and capped at 0 minimum
 */
function calculateSpouseNCZD(taxBase: Decimal, spouseIncome: Decimal, months: number): Decimal {
  if (months <= 0) return new Decimal(0);

  const bracket = new Decimal(TAX_BRACKET_THRESHOLD); // 176.8 × ŽM = 48,441.43
  let baseNCZD: Decimal;

  if (taxBase.lte(bracket)) {
    // NCZD = 19.2 × ŽM - spouse_income
    baseNCZD = new Decimal(NCZD_SPOUSE_ZAKLAD).minus(spouseIncome);
  } else {
    // NCZD = 63.4 × ŽM - (tax_base / 4) - spouse_income
    baseNCZD = new Decimal(NCZD_SPOUSE_MULTIPLIER_HIGH)
      .minus(taxBase.div(4))
      .minus(spouseIncome);
  }

  // Minimum 0
  if (baseNCZD.lt(0)) return new Decimal(0);

  // Prorate by months (1/12 per month)
  const prorated = baseNCZD.mul(months).div(12);
  return round(prorated);
}

/**
 * Calculate tax using progressive rates (19% / 25%)
 * §15 zákona - tax bracket at 176.8 × ŽM
 */
function calculateProgressiveTax(taxBase: Decimal): Decimal {
  if (taxBase.lte(0)) return new Decimal(0);

  const bracket = new Decimal(TAX_BRACKET_THRESHOLD);

  if (taxBase.lte(bracket)) {
    return taxBase.mul(TAX_RATE_LOWER);
  }

  // 19% on first bracket + 25% on the rest
  const taxLower = bracket.mul(TAX_RATE_LOWER);
  const taxUpper = taxBase.minus(bracket).mul(TAX_RATE_UPPER);
  return taxLower.plus(taxUpper);
}

/**
 * Get the percentage cap rate for a given number of eligible children (§33 ods. 2).
 */
function getChildBonusPercentCap(childCount: number): number {
  if (childCount <= 0) return 0;
  if (childCount >= 6) return CHILD_BONUS_PERCENT_CAP_6_PLUS;
  return CHILD_BONUS_PERCENT_CAP[childCount] ?? 0;
}

/**
 * Count eligible children (under 18, with month flag set) for a given month index (0-based).
 */
function countEligibleChildrenInMonth(
  children: TaxFormData['childBonus']['children'],
  monthIdx: number
): number {
  let count = 0;
  for (const child of children) {
    if (!child.months[monthIdx]) continue;
    const birth = parseRodneCislo(child.rodneCislo);
    if (!birth) continue;
    const age = ageAt(birth, 2025, monthIdx + 1);
    if (age < 18) count++;
  }
  return count;
}

interface ChildBonusResult {
  danovyBonus: Decimal;
  nevyuzityDanovyBonus: Decimal;
}

/**
 * Calculate child tax bonus (§33) for 2025.
 *
 * Two regimes based on the bonus tax base:
 * - ≤ 25,740 EUR: raw bonus capped at X% of tax base (percentage depends on child count per month)
 * - > 25,740 EUR: linear phase-out of (base − 25,740) / 10 / 12 per child per month
 *
 * The bonus tax base is r.38 (employment) or r.116a (partner sharing).
 */
function calculateChildBonus(form: TaxFormData, bonusTaxBase: Decimal): ChildBonusResult {
  const childBonus = form.childBonus;
  const zero: ChildBonusResult = { danovyBonus: new Decimal(0), nevyuzityDanovyBonus: new Decimal(0) };
  if (!childBonus.enabled || childBonus.childrenChoice !== 'yes' || !childBonus.children.length) return zero;

  const threshold = new Decimal(CHILD_BONUS_PHASE_OUT_THRESHOLD);

  if (bonusTaxBase.gt(threshold)) {
    // ── High-income path: linear reduction per child per month ──
    const basePom = bonusTaxBase.minus(threshold).div(CHILD_BONUS_PHASE_OUT_DIVISOR).div(12);
    let total = new Decimal(0);

    for (const child of childBonus.children) {
      const birth = parseRodneCislo(child.rodneCislo);
      if (!birth) continue;
      const rates = getMonthlyRates2025(birth);
      for (let i = 0; i < 12; i++) {
        if (!child.months[i]) continue;
        const monthlyBonus = new Decimal(rates[i]);
        const reduced = Decimal.max(monthlyBonus.minus(basePom), new Decimal(0));
        total = total.plus(reduced);
      }
    }
    return { danovyBonus: round(total), nevyuzityDanovyBonus: new Decimal(0) };
  }

  // ── Standard path: percentage cap by child count per month group ──
  const monthChildCounts: number[] = [];
  for (let i = 0; i < 12; i++) {
    monthChildCounts.push(countEligibleChildrenInMonth(childBonus.children, i));
  }

  const uniqueCounts = [...new Set(monthChildCounts)].sort((a, b) => a - b);
  let total = new Decimal(0);
  let nevyuzityDanovyBonus = new Decimal(0);

  for (const count of uniqueCounts) {
    if (count === 0) continue;
    const monthsInGroup: number[] = [];
    for (let i = 0; i < 12; i++) {
      if (monthChildCounts[i] === count) monthsInGroup.push(i);
    }

    let rawBonus = new Decimal(0);
    for (const mi of monthsInGroup) {
      for (const child of childBonus.children) {
        if (!child.months[mi]) continue;
        const birth = parseRodneCislo(child.rodneCislo);
        if (!birth) continue;
        const rates = getMonthlyRates2025(birth);
        rawBonus = rawBonus.plus(rates[mi]);
      }
    }

    const percentCap = getChildBonusPercentCap(count);
    let limit = round(bonusTaxBase.mul(percentCap));
    if (monthsInGroup.length !== 12) {
      const pom = round(limit.div(12));
      limit = round(pom.mul(monthsInGroup.length));
    }

    if (rawBonus.gt(limit)) {
      total = total.plus(limit);
      nevyuzityDanovyBonus = nevyuzityDanovyBonus.plus(rawBonus.minus(limit));
    } else {
      total = total.plus(rawBonus);
    }
  }

  return { danovyBonus: round(total), nevyuzityDanovyBonus };
}

/**
 * Calculate mortgage interest deduction (§33a)
 * - 50% of interest paid
 * - Max 400 EUR for contracts ≤ 31.12.2023
 * - Max 1200 EUR for contracts > 31.12.2023
 * - Prorated in the first and last year of the 5-year window
 */
function calculateMortgageBonus(form: TaxFormData): Decimal {
  if (!form.mortgage.enabled) return new Decimal(0);

  const interest = d(form.mortgage.zaplateneUroky);
  if (interest.lte(0)) return new Decimal(0);

  const contractDate = form.mortgage.datumUzavretiaZmluvy;
  const maxBonus = (contractDate && contractDate <= '2023-12-31')
    ? MORTGAGE_MAX_OLD
    : MORTGAGE_MAX_NEW;

  const months = Math.min(12, Math.max(0, parseInt(form.mortgage.pocetMesiacov, 10) || 12));
  const startDateStr = form.mortgage.datumZacatiaUroceniaUveru;

  if (months === 12) {
    return round(Decimal.min(interest.mul(MORTGAGE_BONUS_RATE), new Decimal(maxBonus)));
  }

  // First year of the 5-year window — loan started this tax year
  if (startDateStr) {
    const startYear = parseInt(startDateStr.split('-')[0], 10);
    if (startYear === TAX_YEAR) {
      const limit = round(new Decimal(maxBonus).div(12)).mul(months);
      return round(Decimal.min(interest.mul(MORTGAGE_BONUS_RATE), limit));
    }
    // Last year of the 5-year window
    if (startYear === TAX_YEAR - MORTGAGE_ELIGIBLE_YEARS) {
      const halfInterest = interest.mul(MORTGAGE_BONUS_RATE);
      const prorated = round(round(halfInterest).div(12)).mul(months);
      const limit = round(new Decimal(maxBonus).div(12)).mul(months);
      return round(Decimal.min(prorated, limit));
    }
  }

  return round(Decimal.min(interest.mul(MORTGAGE_BONUS_RATE), new Decimal(maxBonus)));
}

// ── Section result types (internal) ─────────────────────────────────

interface EmploymentSectionResult {
  r38: Decimal;
  r131: Decimal;
}

interface MutualFundsSectionResult {
  totalFundIncome: Decimal;
  totalFundExpense: Decimal;
  r66: Decimal;
  r67: Decimal;
  r68: Decimal;
}

interface StockSalesSectionResult {
  r69: Decimal;
  r70: Decimal;
  r71: Decimal;
}

interface DividendsSectionResult {
  totalDividendsEur: Decimal;
  totalWithheldTaxEur: Decimal;
  pril2_pr1: Decimal;
  pril2_pr6_s1: Decimal;
  pril2_pr7: Decimal;
  pril2_pr8: string;
  pril2_pr9: Decimal;
  pril2_pr13: Decimal;
  pril2_pr14: Decimal;
  pril2_pr15: Decimal;
  pril2_pr16: Decimal;
  pril2_pr17: Decimal;
  pril2_pr18: Decimal;
  pril2_pr28: Decimal;
}

interface TaxCalculationSectionResult {
  r72: Decimal;
  r73: Decimal;
  r74: Decimal;
  r75: Decimal;
  r77: Decimal;
  r78: Decimal;
  r80: Decimal;
  r81: Decimal;
  r90: Decimal;
  r106: Decimal;
  r115: Decimal;
  r116: Decimal;
  r116a: Decimal;
}

interface BonusesSectionResult {
  r117: Decimal;
  r118: Decimal;
  r119: Decimal;
  r120: Decimal;
  r121: Decimal;
  r122: Decimal;
  r123: Decimal;
  r124: Decimal;
  r126: Decimal;
  r127: Decimal;
}

interface FinalSectionResult {
  finalResult: Decimal;
  r135: Decimal;
  r136: Decimal;
}

/** Oddiel V: Employment income (§5). */
function employmentSection(form: TaxFormData): EmploymentSectionResult {
  const r36 = d(form.employment.r36);
  const r37 = d(form.employment.r37);
  const r38 = form.employment.enabled ? Decimal.max(r36.minus(r37), new Decimal(0)) : new Decimal(0);
  const r131 = d(form.employment.r131);
  return { r38, r131 };
}

/** Oddiel VII: Capital income - Mutual funds (§7), Tabuľka č.2 r.7. */
function mutualFundsSection(form: TaxFormData): MutualFundsSectionResult {
  let totalFundIncome = new Decimal(0);
  let totalFundExpense = new Decimal(0);
  if (form.mutualFunds.enabled) {
    for (const entry of form.mutualFunds.entries) {
      totalFundIncome = totalFundIncome.plus(d(entry.saleAmount));
      totalFundExpense = totalFundExpense.plus(d(entry.purchaseAmount));
    }
  }
  const r66 = totalFundIncome;
  const r67 = totalFundExpense;
  const r68 = Decimal.max(r66.minus(r67), new Decimal(0));
  return { totalFundIncome, totalFundExpense, r66, r67, r68 };
}

/** Oddiel VIII: Stock sales (§8 ods.1 písm.e), Tabulka 3 - held under 1 year.
 * Tax base r71 is reduced by STOCK_SHORT_TERM_EXEMPTION (500 EUR) once per return. */
function stockSalesSection(form: TaxFormData): StockSalesSectionResult {
  let r69 = new Decimal(0);
  let r70 = new Decimal(0);
  if (form.stockSales.enabled) {
    for (const entry of form.stockSales.entries) {
      r69 = r69.plus(d(entry.saleAmount));
      r70 = r70.plus(d(entry.purchaseAmount));
    }
  }
  const grossBase = Decimal.max(r69.minus(r70), new Decimal(0));
  const r71 = Decimal.max(grossBase.minus(STOCK_SHORT_TERM_EXEMPTION), new Decimal(0));
  return { r69, r70, r71 };
}

/** Príloha č.2: Foreign dividends (§51e) with foreign tax credit. */
function dividendsSection(form: TaxFormData): DividendsSectionResult {
  let totalDividendsEur = new Decimal(0);
  let totalWithheldTaxEur = new Decimal(0);
  if (form.dividends.enabled) {
    const { ecbRate, czkRate } = form.dividends;
    for (const entry of form.dividends.entries) {
      const currency = entry.currency ?? 'USD';
      const amountEur = currency === 'EUR'
        ? entry.amountOriginal
        : dividendToEur(entry.amountOriginal, currency, ecbRate, czkRate);
      const withheldEur = currency === 'EUR'
        ? entry.withheldTaxOriginal
        : dividendToEur(entry.withheldTaxOriginal, currency, ecbRate, czkRate);
      totalDividendsEur = totalDividendsEur.plus(d(amountEur));
      totalWithheldTaxEur = totalWithheldTaxEur.plus(d(withheldEur));
    }
  }
  const pril2_pr1 = totalDividendsEur;
  const pril2_pr6_s1 = totalDividendsEur;
  const pril2_pr7 = pril2_pr6_s1;
  const pril2_pr8 = '7';
  const pril2_pr9 = pril2_pr7.mul(DIVIDEND_TAX_RATE);
  const pril2_pr13 = pril2_pr7;
  const pril2_pr14 = totalWithheldTaxEur;
  const pril2_pr15 = pril2_pr7.gt(0) ? pril2_pr13.div(pril2_pr7).mul(100) : new Decimal(0);
  const pril2_pr16 = pril2_pr9.mul(pril2_pr15).div(100);
  const pril2_pr17 = Decimal.min(pril2_pr16, pril2_pr14);
  const pril2_pr18 = Decimal.max(pril2_pr9.minus(pril2_pr17), new Decimal(0));
  const pril2_pr28 = pril2_pr18;
  return {
    totalDividendsEur,
    totalWithheldTaxEur,
    pril2_pr1,
    pril2_pr6_s1,
    pril2_pr7,
    pril2_pr8,
    pril2_pr9,
    pril2_pr13,
    pril2_pr14,
    pril2_pr15,
    pril2_pr16,
    pril2_pr17,
    pril2_pr18,
    pril2_pr28,
  };
}

/** Oddiel IX: NCZD reduction, tax base §4 (r78 + r71), tax from §7, grand total (r.72-r.116). */
function taxCalculationSection(
  form: TaxFormData,
  r36: Decimal,
  r38: Decimal,
  r68: Decimal,
  r71: Decimal,
  pril2_pr28: Decimal,
  r117Pre: Decimal,
  r123Pre: Decimal
): TaxCalculationSectionResult {
  const r72 = r38;
  const r73 = calculateNCZD(r72);
  let r74 = new Decimal(0);
  if (form.spouse.enabled && form.spouse.pocetMesiacov) {
    const months = Math.min(12, Math.max(0, parseInt(form.spouse.pocetMesiacov, 10) || 0));
    const spouseIncome = d(form.spouse.vlastnePrijmy);
    r74 = calculateSpouseNCZD(r72, spouseIncome, months);
  }
  let r75 = new Decimal(0);
  if (form.dds.enabled) {
    const prispevky = d(form.dds.prispevky);
    r75 = Decimal.min(prispevky, new Decimal(DDS_MAX));
  }
  const r77 = round(Decimal.min(r73.plus(r74).plus(r75), r72));
  const r78 = round(Decimal.max(r38.minus(r77), new Decimal(0)));
  const r80 = round(r78.plus(r71));
  const r81 = round(calculateProgressiveTax(r80));
  const r90 = r81;
  const r106 = round(r68.mul(CAPITAL_TAX_RATE));
  const r115 = r106;

  const rawR116 = round(r90.plus(r115).plus(pril2_pr28));

  // Low-income zeroing (§46a ods. 2): if no bonuses claimed and total income ≤ threshold, tax = 0
  const noBonuses = r117Pre.eq(0) && r123Pre.eq(0);
  const condition1 = noBonuses && rawR116.lte(17);
  const condition2 = noBonuses && r36.lte(LOW_INCOME_THRESHOLD);
  const r116 = (condition1 || condition2) ? new Decimal(0) : Decimal.max(rawR116, new Decimal(0));

  // r.116a: partner bonus sharing (§33 ods. 8)
  let r116a = new Decimal(0);
  const ps = form.childBonus.partnerSharing;
  if (ps.enabled) {
    const partnerBase = d(ps.partnerTaxBase);
    const partnerMonths = Math.min(12, Math.max(0, parseInt(ps.pocetMesiacov, 10) || 0));
    if (r38.gt(0) && partnerMonths > 0) {
      if (partnerMonths === 12) {
        r116a = round(partnerBase.plus(r38));
      } else {
        const prorated = round(round(partnerBase.div(12)).mul(partnerMonths));
        r116a = round(r38.plus(prorated));
      }
    }
  }

  return { r72, r73, r74, r75, r77, r78, r80, r81, r90, r106, r115, r116, r116a };
}

/** Bonuses: child (§33), mortgage (§33a), rows 117-127. */
function bonusesSection(
  form: TaxFormData,
  r116: Decimal,
  r38: Decimal,
  r116a: Decimal,
  r36: Decimal
): BonusesSectionResult {
  // Determine bonus tax base: r116a (partner sharing) or r38 (own)
  const bonusTaxBase = form.childBonus.partnerSharing.enabled && r116a.gt(0)
    ? r116a
    : r38;

  const childBonusResult = calculateChildBonus(form, bonusTaxBase);

  // r.146 / r.146a and 90% Slovak income gate
  // r.146 = total income from §5 (all sources), r.146a = same from SK sources
  // Since our app only handles Slovak income, r146a/r146 ratio is always 1.0
  // but we still validate the gate formally.
  const r146 = r36;
  const r146a = r36;
  let r117 = childBonusResult.danovyBonus;
  if (r146.gt(0) && r146a.gt(0)) {
    const ratio = round(r146a.div(r146));
    if (ratio.lt(SLOVAK_INCOME_RATIO)) {
      r117 = new Decimal(0);
    }
  } else if (form.childBonus.enabled && form.childBonus.childrenChoice === 'yes') {
    r117 = new Decimal(0);
  }

  const r118 = round(Decimal.max(r116.minus(r117), new Decimal(0)));
  // r.119: bonus already paid by employer (employment + dohody)
  const r119 = round(d(form.childBonus.bonusPaidByEmployer).plus(d(form.childBonus.bonusPaidByEmployerDohody)));
  const r120 = round(Decimal.max(r117.minus(r119), new Decimal(0)));
  // r.121: bonus to claim from tax office = max(r120 - r116, 0)
  const r121 = round(Decimal.max(r120.minus(r116), new Decimal(0)));
  // r.122: incorrectly paid bonus = max(r119 - r117, 0)
  const r122 = round(Decimal.max(r119.minus(r117), new Decimal(0)));

  const r123 = calculateMortgageBonus(form);
  const r124 = round(Decimal.max(r118.minus(r123), new Decimal(0)));
  const r126 = r123;
  const r127 = round(Decimal.max(r126.minus(r118), new Decimal(0)));
  return { r117, r118, r119, r120, r121, r122, r123, r124, r126, r127 };
}

/** Final: advances (r.131), daň na úhradu (r.135), preplatok (r.136).
 *
 * Official formula from financnasprava.sk:
 *   if (r.116 > 17) OR (r.116 <= 17 AND (r.117 > 0 OR r.123 > 0)):
 *     base = r.116
 *   else:
 *     base = 0
 *   result = base - r.117 + r.119 + r.121 - r.123 + r.125 + r.127 + r.128
 *            - r.129 - r.130 - r.131 - r.132 - r.133 - r.134
 *   r.135 = max(0, result); if ≤ 5 EUR → 0
 *   r.136 = max(0, -result)
 */
function finalSection(
  r116: Decimal,
  r117: Decimal,
  r119: Decimal,
  r121: Decimal,
  r123: Decimal,
  r127: Decimal,
  r131: Decimal
): FinalSectionResult {
  const useTax = r116.gt(17) || (r116.lte(17) && (r117.gt(0) || r123.gt(0)));
  const base = useTax ? r116 : new Decimal(0);

  const finalResult = base
    .minus(r117)
    .plus(r119)
    .plus(r121)
    .minus(r123)
    .plus(r127)  // r.125 (mortgage paid by employer) = 0, so r.126=r.123, r.127=max(r.126-r.118,0)
    .minus(r131);

  let r135 = round(Decimal.max(finalResult, new Decimal(0)));
  if (r135.gt(0) && r135.lte(5)) r135 = new Decimal(0);
  const r136 = round(Decimal.min(finalResult, new Decimal(0)).neg());
  return { finalResult, r135, r136 };
}

/** Oddiel XII: 2% / 3% allocation (§50). */
function allocationSection(form: TaxFormData, r124: Decimal): Decimal {
  if (!form.twoPercent.enabled) return new Decimal(0);
  const rate = form.twoPercent.splnam3per ? THREE_PERCENT_RATE : TWO_PERCENT_RATE;
  const allocation = r124.mul(rate);
  return allocation.gte(MIN_ALLOCATION) ? allocation : new Decimal(0);
}

/** Oddiel XII: 2% allocation to parents (§50aa). Returns per-parent amount. */
function parentAllocationSection(form: TaxFormData, r124: Decimal): Decimal {
  if (form.parentAllocation.choice === 'none') return new Decimal(0);
  const allocation = r124.mul(PARENT_ALLOCATION_RATE);
  return allocation.gte(MIN_PARENT_ALLOCATION) ? allocation : new Decimal(0);
}

/** Build the public TaxCalculationResult from section results. */
function buildResult(
  emp: EmploymentSectionResult,
  mf: MutualFundsSectionResult,
  stocks: StockSalesSectionResult,
  div: DividendsSectionResult,
  tax: TaxCalculationSectionResult,
  bon: BonusesSectionResult,
  fin: FinalSectionResult,
  r131Total: Decimal,
  r152: Decimal,
  parentAllocPerParent: Decimal
): TaxCalculationResult {
  return {
    r38: fmt(emp.r38),
    totalFundIncome: fmt(mf.totalFundIncome),
    totalFundExpense: fmt(mf.totalFundExpense),
    r66: fmt(mf.r66),
    r67: fmt(mf.r67),
    r68: fmt(mf.r68),
    r69: fmt(stocks.r69),
    r70: fmt(stocks.r70),
    r71: fmt(stocks.r71),
    totalDividendsEur: fmt(div.totalDividendsEur),
    totalWithheldTaxEur: fmt(div.totalWithheldTaxEur),
    pril2_pr1: fmt(div.pril2_pr1),
    pril2_pr6: fmt(div.pril2_pr6_s1),
    pril2_pr7: fmt(div.pril2_pr7),
    pril2_pr8: div.pril2_pr8,
    pril2_pr9: fmt(div.pril2_pr9),
    pril2_pr13: fmt(div.pril2_pr13),
    pril2_pr14: fmt(div.pril2_pr14),
    pril2_pr15: fmt(div.pril2_pr15),
    pril2_pr16: fmt(div.pril2_pr16),
    pril2_pr17: fmt(div.pril2_pr17),
    pril2_pr18: fmt(div.pril2_pr18),
    pril2_pr28: fmt(div.pril2_pr28),
    r72: fmt(tax.r72),
    r73: fmt(tax.r73),
    r74: fmt(tax.r74),
    r75: fmt(tax.r75),
    r77: fmt(tax.r77),
    r78: fmt(tax.r78),
    r80: fmt(tax.r80),
    r81: fmt(tax.r81),
    r90: fmt(tax.r90),
    r106: fmt(tax.r106),
    r115: fmt(tax.r115),
    r116: fmt(tax.r116),
    r116a: fmt(tax.r116a),
    r117: fmt(bon.r117),
    r118: fmt(bon.r118),
    r119: fmt(bon.r119),
    r120: fmt(bon.r120),
    r121: fmt(bon.r121),
    r122: fmt(bon.r122),
    r123: fmt(bon.r123),
    r124: fmt(bon.r124),
    r126: fmt(bon.r126),
    r127: fmt(bon.r127),
    r131: fmt(r131Total),
    r135: fmt(fin.r135),
    r136: fmt(fin.r136),
    r152: fmt(r152),
    parentAllocPerParent: fmt(parentAllocPerParent),
    finalTaxToPay: fmt(fin.r135),
    finalTaxRefund: fmt(fin.r136),
    isRefund: fin.finalResult.lt(0),
  };
}

/**
 * Main tax calculation - matches the official DPFO typ B 2025 form.
 *
 * Flow: Employment (Oddiel V) → Capital income (Oddiel VII) →
 *       Dividends (Príloha č.2) → Pre-compute bonuses (needed for r.116 zeroing) →
 *       Tax calculation (Oddiel IX, with r.116 zeroing) →
 *       Bonuses (final) → Final result
 */
export function calculateTax(form: TaxFormData): TaxCalculationResult {
  const emp = employmentSection(form);
  const mf = mutualFundsSection(form);
  const stocks = stockSalesSection(form);
  const div = dividendsSection(form);

  // Pre-compute bonuses to determine r.117/r.123 for r.116 zeroing logic
  const r36 = d(form.employment.r36);
  const r117Pre = calculateChildBonus(form, emp.r38).danovyBonus;
  const r123Pre = calculateMortgageBonus(form);

  const tax = taxCalculationSection(form, r36, emp.r38, mf.r68, stocks.r71, div.pril2_pr28, r117Pre, r123Pre);
  const bon = bonusesSection(form, tax.r116, emp.r38, tax.r116a, r36);
  // r.131: sum of employment + dohody advances
  const r131Total = round(emp.r131.plus(d(form.employment.r131Dohody)));
  const fin = finalSection(tax.r116, bon.r117, bon.r119, bon.r121, bon.r123, bon.r127, r131Total);
  const r152 = allocationSection(form, bon.r124);
  const parentAllocPerParent = parentAllocationSection(form, bon.r124);
  return buildResult(emp, mf, stocks, div, tax, bon, fin, r131Total, r152, parentAllocPerParent);
}
