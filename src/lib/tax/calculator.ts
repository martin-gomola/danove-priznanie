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
import {
  NCZD_ZAKLAD,
  NCZD_THRESHOLD,
  NCZD_MULTIPLIER_HIGH,
  NCZD_SPOUSE_ZAKLAD,
  NCZD_SPOUSE_MULTIPLIER_HIGH,
  TAX_RATE_LOWER,
  TAX_RATE_UPPER,
  TAX_BRACKET_THRESHOLD,
  DIVIDEND_TAX_RATE,
  CAPITAL_TAX_RATE,
  MORTGAGE_BONUS_RATE,
  MORTGAGE_MAX_OLD,
  MORTGAGE_MAX_NEW,
  CHILD_BONUS_PHASE_OUT_THRESHOLD,
  CHILD_BONUS_PHASE_OUT_DIVISOR,
  TWO_PERCENT_RATE,
  THREE_PERCENT_RATE,
  MIN_ALLOCATION,
  PARENT_ALLOCATION_RATE,
  MIN_PARENT_ALLOCATION,
  STOCK_SHORT_TERM_EXEMPTION,
} from './constants';
import { parseRodneCislo, getMonthlyRates2025 } from '@/lib/rodneCislo';

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
 * Format a Decimal for display and XML output: 2 decimal places, fixed string.
 * @param value - Decimal to format
 * @returns String like "1234.56"
 */
function fmt(value: Decimal): string {
  return value.toDecimalPlaces(2).toFixed(2);
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
  return nczd;
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
  return prorated.toDecimalPlaces(2);
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
 * Calculate child tax bonus (§33) for 2025
 * 100 EUR/month under 15, 50 EUR/month 15–17, income phase-out above 2,145 EUR/month base.
 */
function calculateChildBonus(form: TaxFormData, employmentTaxBaseR38: Decimal): Decimal {
  const childBonus = form.childBonus;
  if (!childBonus?.enabled || !childBonus.children?.length) return new Decimal(0);
  const monthlyBase = employmentTaxBaseR38.div(12);
  const threshold = new Decimal(CHILD_BONUS_PHASE_OUT_THRESHOLD);
  const divisor = CHILD_BONUS_PHASE_OUT_DIVISOR;
  let total = new Decimal(0);
  for (const child of childBonus.children) {
    const birth = parseRodneCislo(child.rodneCislo);
    if (!birth) continue;
    const rates = getMonthlyRates2025(birth);
    for (let i = 0; i < 12; i++) {
      if (!child.months[i]) continue;
      let monthlyBonus = new Decimal(rates[i]);
      if (monthlyBase.gt(threshold)) {
        const reduction = monthlyBase.minus(threshold).div(divisor);
        monthlyBonus = Decimal.max(monthlyBonus.minus(reduction), new Decimal(0));
      }
      total = total.plus(monthlyBonus);
    }
  }
  return total.toDecimalPlaces(2);
}

/**
 * Calculate mortgage interest deduction (§33a)
 * - 50% of interest paid
 * - Max 400 EUR for contracts ≤ 31.12.2023
 * - Max 1200 EUR for contracts > 31.12.2023
 */
function calculateMortgageBonus(form: TaxFormData): Decimal {
  if (!form.mortgage.enabled) return new Decimal(0);

  const interest = d(form.mortgage.zaplateneUroky);
  if (interest.lte(0)) return new Decimal(0);

  const contractDate = form.mortgage.datumUzavretiaZmluvy;
  let maxBonus: number;

  if (contractDate && contractDate <= '2023-12-31') {
    maxBonus = MORTGAGE_MAX_OLD;
  } else {
    maxBonus = MORTGAGE_MAX_NEW;
  }

  const bonus = interest.mul(MORTGAGE_BONUS_RATE);
  return Decimal.min(bonus, new Decimal(maxBonus));
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
  r77: Decimal;
  r78: Decimal;
  r80: Decimal;
  r81: Decimal;
  r90: Decimal;
  r106: Decimal;
  r115: Decimal;
  r116: Decimal;
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

/** Oddiel VIII: Stock sales (§8 ods.1 písm.e), Tabulka 3 – held under 1 year.
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
    for (const entry of form.dividends.entries) {
      totalDividendsEur = totalDividendsEur.plus(d(entry.amountEur));
      totalWithheldTaxEur = totalWithheldTaxEur.plus(d(entry.withheldTaxEur));
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

/** Oddiel IX: NCZD reduction, tax base §4 (r78 + r71), tax from §7, grand total (r.72–r.116). */
function taxCalculationSection(
  form: TaxFormData,
  r38: Decimal,
  r68: Decimal,
  r71: Decimal,
  pril2_pr28: Decimal
): TaxCalculationSectionResult {
  const r72 = r38;
  const r73 = calculateNCZD(r72);
  // r.74: NCZD na manžela/manželku (§11 ods.3)
  // Depends on: taxpayer's tax base (r72), spouse's own income, months
  let r74 = new Decimal(0);
  if (form.spouse?.enabled && form.spouse.pocetMesiacov) {
    const months = Math.min(12, Math.max(0, parseInt(form.spouse.pocetMesiacov, 10) || 0));
    const spouseIncome = d(form.spouse.vlastnePrijmy);
    r74 = calculateSpouseNCZD(r72, spouseIncome, months);
  }
  const r77 = Decimal.min(r73.plus(r74), r72);
  const r78 = Decimal.max(r38.minus(r77), new Decimal(0));
  const r80 = r78.plus(r71);
  const r81 = calculateProgressiveTax(r80);
  const r90 = r81;
  const r106 = r68.mul(CAPITAL_TAX_RATE);
  const r115 = r106;
  const r116 = r90.plus(r115).plus(pril2_pr28);
  return { r72, r73, r74, r77, r78, r80, r81, r90, r106, r115, r116 };
}

/** Bonuses: child (§33), mortgage (§33a), rows 117–127. */
function bonusesSection(form: TaxFormData, r116: Decimal, r38: Decimal): BonusesSectionResult {
  const r117 = calculateChildBonus(form, r38);
  const r118 = Decimal.max(r116.minus(r117), new Decimal(0));
  const r119 = d(form.childBonus?.bonusPaidByEmployer ?? '');
  const r120 = Decimal.max(r117.minus(r119), new Decimal(0));
  const r121 = Decimal.min(r120, r118);
  const r122 = new Decimal(0);
  const r123 = calculateMortgageBonus(form);
  const r124 = Decimal.max(r118.minus(r123), new Decimal(0));
  const r126 = r123;
  const r127 = Decimal.max(r126.minus(r118), new Decimal(0));
  return { r117, r118, r119, r120, r121, r122, r123, r124, r126, r127 };
}

/** Final: advances (r.131), daň na úhradu (r.135), preplatok (r.136). */
function finalSection(
  r118: Decimal,
  r123: Decimal,
  r127: Decimal,
  r131: Decimal
): FinalSectionResult {
  const finalResult = r118.minus(r123).plus(r127).minus(r131);
  let r135 = Decimal.max(finalResult, new Decimal(0));
  if (r135.gt(0) && r135.lte(5)) r135 = new Decimal(0);
  const r136 = finalResult.lt(0) ? finalResult.abs() : new Decimal(0);
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
    r77: fmt(tax.r77),
    r78: fmt(tax.r78),
    r80: fmt(tax.r80),
    r81: fmt(tax.r81),
    r90: fmt(tax.r90),
    r106: fmt(tax.r106),
    r115: fmt(tax.r115),
    r116: fmt(tax.r116),
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
    r131: fmt(emp.r131),
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
 *       Dividends (Príloha č.2) → Tax calculation (Oddiel IX) →
 *       Bonuses → Advances → Final result
 */
export function calculateTax(form: TaxFormData): TaxCalculationResult {
  const emp = employmentSection(form);
  const mf = mutualFundsSection(form);
  const stocks = stockSalesSection(form);
  const div = dividendsSection(form);
  const tax = taxCalculationSection(form, emp.r38, mf.r68, stocks.r71, div.pril2_pr28);
  const bon = bonusesSection(form, tax.r116, emp.r38);
  const fin = finalSection(bon.r118, bon.r123, bon.r127, emp.r131);
  const r152 = allocationSection(form, bon.r124);
  const parentAllocPerParent = parentAllocationSection(form, bon.r124);
  return buildResult(emp, mf, stocks, div, tax, bon, fin, r152, parentAllocPerParent);
}
