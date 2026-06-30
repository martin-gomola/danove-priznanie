import { describe, expect, it } from 'vitest';
import { DEFAULT_TAX_FORM, TaxFormData } from '@/types/TaxForm';
import { applyExternalFormUpdate, hydrateTaxFormData, mergeTaxFormData } from '@/lib/form/formState';

function form(overrides: Partial<TaxFormData> = {}): TaxFormData {
  return mergeTaxFormData(DEFAULT_TAX_FORM, overrides);
}

describe('mergeTaxFormData', () => {
  it('preserves existing nested child bonus partner fields when an external patch updates one field', () => {
    const base = form({
      childBonus: {
        ...DEFAULT_TAX_FORM.childBonus,
        enabled: true,
        bonusPaidByEmployer: '120',
        partnerSharing: {
          ...DEFAULT_TAX_FORM.childBonus.partnerSharing,
          enabled: true,
          priezviskoMeno: 'Partner Existing',
          rodneCislo: '900101/1234',
          partnerTaxBase: '10000',
        },
      },
    });

    const merged = mergeTaxFormData(base, {
      childBonus: {
        partnerSharing: {
          partnerTaxBase: '15000',
        },
      },
    });

    expect(merged.childBonus.enabled).toBe(true);
    expect(merged.childBonus.bonusPaidByEmployer).toBe('120');
    expect(merged.childBonus.partnerSharing.enabled).toBe(true);
    expect(merged.childBonus.partnerSharing.priezviskoMeno).toBe('Partner Existing');
    expect(merged.childBonus.partnerSharing.rodneCislo).toBe('900101/1234');
    expect(merged.childBonus.partnerSharing.partnerTaxBase).toBe('15000');
  });

  it('deep-merges nested parent allocation parents instead of replacing parent objects', () => {
    const base = form({
      parentAllocation: {
        choice: 'both',
        osvojeny: true,
        parent1: {
          meno: 'Old',
          priezvisko: 'Parent One',
          rodneCislo: '650101/1234',
        },
        parent2: {
          meno: 'Second',
          priezvisko: 'Parent Two',
          rodneCislo: '660101/1234',
        },
      },
    });

    const merged = mergeTaxFormData(base, {
      parentAllocation: {
        parent1: { meno: 'New' },
        parent2: { rodneCislo: '661212/9999' },
      },
    });

    expect(merged.parentAllocation.choice).toBe('both');
    expect(merged.parentAllocation.osvojeny).toBe(true);
    expect(merged.parentAllocation.parent1).toEqual({
      meno: 'New',
      priezvisko: 'Parent One',
      rodneCislo: '650101/1234',
    });
    expect(merged.parentAllocation.parent2).toEqual({
      meno: 'Second',
      priezvisko: 'Parent Two',
      rodneCislo: '661212/9999',
    });
  });

  it('replaces arrays while deep-merging sibling section fields', () => {
    const base = form({
      childBonus: {
        ...DEFAULT_TAX_FORM.childBonus,
        enabled: true,
        children: [{
          id: 'old',
          priezviskoMeno: 'Old Child',
          rodneCislo: '150101/1234',
          months: Array(12).fill(true),
          wholeYear: true,
        }],
        partnerSharing: {
          ...DEFAULT_TAX_FORM.childBonus.partnerSharing,
          enabled: true,
          priezviskoMeno: 'Partner Existing',
        },
      },
    });

    const merged = mergeTaxFormData(base, {
      childBonus: {
        children: [{
          id: 'new',
          priezviskoMeno: 'New Child',
          rodneCislo: '160101/1234',
          months: Array(12).fill(false),
          wholeYear: false,
        }],
      },
    });

    expect(merged.childBonus.children).toHaveLength(1);
    expect(merged.childBonus.children[0]?.id).toBe('new');
    expect(merged.childBonus.partnerSharing.enabled).toBe(true);
    expect(merged.childBonus.partnerSharing.priezviskoMeno).toBe('Partner Existing');
  });

  it('hydrates older saved partial nested sections with current defaults', () => {
    const hydrated = hydrateTaxFormData({
      parentAllocation: {
        parent1: { meno: 'Only Name' },
      },
      dividends: {
        enabled: true,
      },
    });

    expect(hydrated.parentAllocation.parent1).toEqual({
      meno: 'Only Name',
      priezvisko: '',
      rodneCislo: '',
    });
    expect(hydrated.parentAllocation.parent2).toEqual(DEFAULT_TAX_FORM.parentAllocation.parent2);
    expect(hydrated.dividends.ecbRate).toBe(DEFAULT_TAX_FORM.dividends.ecbRate);
    expect(hydrated.dividends.czkRate).toBe(DEFAULT_TAX_FORM.dividends.czkRate);
    expect(hydrated.dividends.plnRate).toBe(DEFAULT_TAX_FORM.dividends.plnRate);
  });

  it('applies external partial updates and rejects non-object patches', () => {
    const base = form({
      employment: { ...DEFAULT_TAX_FORM.employment, r36: '1000', r37: '100' },
      refundRequest: { ...DEFAULT_TAX_FORM.refundRequest, iban: 'SK00 0000' },
    });

    expect(applyExternalFormUpdate(base, null)).toBe(base);
    expect(applyExternalFormUpdate(base, ['invalid'])).toBe(base);

    const merged = applyExternalFormUpdate(base, {
      employment: { r37: '200' },
      refundRequest: { vratitPreplatok: false },
    });

    expect(merged.employment.r36).toBe('1000');
    expect(merged.employment.r37).toBe('200');
    expect(merged.refundRequest.iban).toBe('SK00 0000');
    expect(merged.refundRequest.vratitPreplatok).toBe(false);
  });
});
