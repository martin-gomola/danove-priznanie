import { TaxFormData } from '@/types/TaxForm';
import { validateRodneCislo } from '@/lib/utils/validateRodneCislo';
import { safeDecimal } from '@/lib/utils/decimal';

export interface ValidationWarning {
  step: number;
  section: string;
  field: string;
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function hasPositiveNumber(value: string | undefined): boolean {
  if (!hasValue(value)) return false;
  return safeDecimal(value).gt(0);
}

function isValidDicOrRc(value: string): boolean {
  if (!hasValue(value)) return false;
  if (/^\d{10}$/.test(value)) return true;
  return validateRodneCislo(value).valid;
}

export function getValidationWarnings(form: TaxFormData): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Step 0: personal info
  if (!hasValue(form.personalInfo.dic)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'DIČ' });
  if (hasValue(form.personalInfo.dic) && !isValidDicOrRc(form.personalInfo.dic)) {
    warnings.push({ step: 0, section: 'Osobné údaje', field: 'DIČ / Rodné číslo (neplatný formát)' });
  }
  if (!hasValue(form.personalInfo.meno)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'Meno' });
  if (!hasValue(form.personalInfo.priezvisko)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'Priezvisko' });
  if (!hasValue(form.personalInfo.ulica)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'Ulica' });
  if (!hasValue(form.personalInfo.cislo)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'Číslo' });
  if (!hasValue(form.personalInfo.psc)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'PSČ' });
  if (!hasValue(form.personalInfo.obec)) warnings.push({ step: 0, section: 'Osobné údaje', field: 'Obec' });

  // Step 1: spouse + child bonus
  if (form.spouse.enabled) {
    if (!hasValue(form.spouse.priezviskoMeno)) warnings.push({ step: 1, section: 'Manžel/manželka', field: 'Priezvisko a meno' });
    if (!hasValue(form.spouse.rodneCislo)) warnings.push({ step: 1, section: 'Manžel/manželka', field: 'Rodné číslo' });
    if (hasValue(form.spouse.rodneCislo) && !validateRodneCislo(form.spouse.rodneCislo).valid) {
      warnings.push({ step: 1, section: 'Manžel/manželka', field: 'Rodné číslo (neplatný formát)' });
    }
  }
  if (form.childBonus.enabled) {
    if (form.childBonus.childrenChoice === 'yes') {
      const hasCompleteChild = form.childBonus.children.some(
        (c) => hasValue(c.priezviskoMeno) && hasValue(c.rodneCislo)
      );
      if (!hasCompleteChild) {
        warnings.push({ step: 1, section: 'Deti', field: 'Aspoň 1 dieťa (meno + rodné číslo)' });
      }
    }
    if (form.childBonus.childrenChoice === 'yes' && form.childBonus.partnerSharing.enabled) {
      const ps = form.childBonus.partnerSharing;
      if (!hasValue(ps.priezviskoMeno)) {
        warnings.push({ step: 1, section: 'Bonus §33 ods.8', field: 'Priezvisko a meno druhého rodiča (r.34)' });
      }
      if (!hasValue(ps.rodneCislo)) {
        warnings.push({ step: 1, section: 'Bonus §33 ods.8', field: 'Rodné číslo druhého rodiča (r.34)' });
      }
      if (hasValue(ps.rodneCislo) && !validateRodneCislo(ps.rodneCislo).valid) {
        warnings.push({ step: 1, section: 'Bonus §33 ods.8', field: 'Rodné číslo druhého rodiča (neplatný formát)' });
      }
      if (!hasValue(ps.partnerTaxBase)) {
        warnings.push({ step: 1, section: 'Bonus §33 ods.8', field: 'Základ dane druhého rodiča' });
      }
    }
    for (const child of form.childBonus.children) {
      if (hasValue(child.rodneCislo) && !validateRodneCislo(child.rodneCislo).valid) {
        warnings.push({ step: 1, section: 'Deti', field: `Rodné číslo dieťaťa (${child.priezviskoMeno || 'neplatný formát'})` });
      }
    }
  }

  // Step 1: partner NCZD income limit
  if (form.spouse.enabled && hasValue(form.spouse.vlastnePrijmy)) {
    const spouseIncome = safeDecimal(form.spouse.vlastnePrijmy);
    if (spouseIncome.gte(5260.38)) {
      warnings.push({ step: 1, section: 'Manžel/manželka', field: 'Vlastné príjmy presahujú limit NCZD (5 260,38 EUR)' });
    }
  }

  // Step 2: mortgage
  if (form.mortgage.enabled) {
    if (!hasValue(form.mortgage.zaplateneUroky)) warnings.push({ step: 2, section: 'Hypotéka', field: 'Zaplatené úroky' });
    if (!hasValue(form.mortgage.pocetMesiacov)) warnings.push({ step: 2, section: 'Hypotéka', field: 'Počet mesiacov' });
    if (!hasValue(form.mortgage.datumZacatiaUroceniaUveru)) warnings.push({ step: 2, section: 'Hypotéka', field: 'Dátum začatia úročenia' });
    if (!hasValue(form.mortgage.datumUzavretiaZmluvy)) warnings.push({ step: 2, section: 'Hypotéka', field: 'Dátum uzavretia zmluvy' });

    // Eligibility: bonus is only for 5 consecutive years from the interest start date
    if (hasValue(form.mortgage.datumZacatiaUroceniaUveru)) {
      const start = new Date(form.mortgage.datumZacatiaUroceniaUveru);
      if (!Number.isNaN(start.getTime())) {
        const yearsElapsed = 2025 - start.getFullYear();
        if (yearsElapsed > 5) {
          warnings.push({ step: 2, section: 'Hypotéka', field: 'Úročenie začalo pred viac ako 5 rokmi, nárok na bonus mohol uplynúť' });
        }
      }
    }
    // Eligibility: contract must be from 2018+ for §33a
    if (hasValue(form.mortgage.datumUzavretiaZmluvy)) {
      const contract = new Date(form.mortgage.datumUzavretiaZmluvy);
      if (!Number.isNaN(contract.getTime()) && contract.getFullYear() < 2018) {
        warnings.push({ step: 2, section: 'Hypotéka', field: 'Zmluva uzavretá pred 1.1.2018, §33a sa neuplatňuje' });
      }
    }
  }

  // Step 3: employment
  if (form.employment.enabled) {
    if (!hasValue(form.employment.r36)) warnings.push({ step: 3, section: 'Zamestnanie', field: 'Úhrn príjmov (r.01)' });
    if (!hasValue(form.employment.r37)) warnings.push({ step: 3, section: 'Zamestnanie', field: 'Povinné poistné (r.02)' });
    if (!hasValue(form.employment.r131)) warnings.push({ step: 3, section: 'Zamestnanie', field: 'Preddavky na daň (r.04)' });
  }

  // Step 4: funds + stocks
  if (form.mutualFunds.enabled) {
    const hasFundSale = form.mutualFunds.entries.some((e) => hasPositiveNumber(e.saleAmount));
    if (!hasFundSale) warnings.push({ step: 4, section: 'Fondy', field: 'Aspoň 1 predaj (príjem)' });
  }
  if (form.stockSales.enabled) {
    const hasStockTrade = form.stockSales.entries.some(
      (e) => hasPositiveNumber(e.saleAmount) || hasPositiveNumber(e.purchaseAmount)
    );
    if (!hasStockTrade) warnings.push({ step: 4, section: 'Akcie (§8)', field: 'Aspoň 1 obchod (kúpna/predajná cena)' });
  }

  // Step 5: dividends
  if (form.dividends.enabled) {
    const hasDividend = form.dividends.entries.some(
      (e) => hasValue(e.country) && (hasPositiveNumber(e.amountOriginal) || hasPositiveNumber(e.amountEur))
    );
    if (!hasDividend) warnings.push({ step: 5, section: 'Dividendy', field: 'Aspoň 1 dividendový príjem' });
  }

  // Step 6: two percent
  if (form.twoPercent.enabled && !hasValue(form.twoPercent.ico)) {
    warnings.push({ step: 6, section: '2% dane', field: 'IČO organizácie' });
  }
  if (form.parentAllocation.choice !== 'none') {
    const p1 = form.parentAllocation.parent1;
    if (!hasValue(p1.priezvisko) || !hasValue(p1.meno) || !hasValue(p1.rodneCislo)) {
      warnings.push({ step: 6, section: '2% rodičom', field: 'Rodič 1 (meno, priezvisko, rodné číslo)' });
    }
    if (hasValue(p1.rodneCislo) && !validateRodneCislo(p1.rodneCislo).valid) {
      warnings.push({ step: 6, section: '2% rodičom', field: 'Rodič 1 (neplatné rodné číslo)' });
    }
    if (form.parentAllocation.choice === 'both') {
      const p2 = form.parentAllocation.parent2;
      if (!hasValue(p2.priezvisko) || !hasValue(p2.meno) || !hasValue(p2.rodneCislo)) {
        warnings.push({ step: 6, section: '2% rodičom', field: 'Rodič 2 (meno, priezvisko, rodné číslo)' });
      }
      if (hasValue(p2.rodneCislo) && !validateRodneCislo(p2.rodneCislo).valid) {
        warnings.push({ step: 6, section: '2% rodičom', field: 'Rodič 2 (neplatné rodné číslo)' });
      }
    }
  }

  return warnings;
}

export function getStepBlockingIssues(form: TaxFormData, step: number): ValidationWarning[] {
  return getValidationWarnings(form).filter((warning) => warning.step === step);
}
