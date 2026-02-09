/**
 * XML Parser Tests - DPFO typ B 2025
 *
 * Tests for parsing and importing DPFO XML files.
 * Run: npx vitest run tests/xml-parser.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  parsePersonalInfoFromDpfoXml,
  parseDpfoXmlToFormData,
} from '@/lib/utils/parseDpfoXml';
import { DEFAULT_TAX_FORM } from '@/types/TaxForm';
import { TAX_YEAR } from '@/lib/tax/constants';

const MINIMAL_HEADER_2025 = `
<?xml version="1.0"?>
<dokument>
  <hlavicka>
    <dic>1234567890</dic>
    <priezvisko>Test</priezvisko>
    <meno>Ján</meno>
    <zdanovacieObdobie><rok>${TAX_YEAR}</rok></zdanovacieObdobie>
    <adresaTrvPobytu>
      <ulica>Hlavná</ulica>
      <cislo>1</cislo>
      <psc>81101</psc>
      <obec>Bratislava</obec>
      <stat>Slovenská republika</stat>
    </adresaTrvPobytu>
  </hlavicka>
</dokument>
`;

const MINIMAL_HEADER_2024 = `
<?xml version="1.0"?>
<dokument>
  <hlavicka>
    <dic>9999999999</dic>
    <priezvisko>Prev</priezvisko>
    <meno>Year</meno>
    <zdanovacieObdobie><rok>2024</rok></zdanovacieObdobie>
  </hlavicka>
</dokument>
`;

const CURRENT_YEAR_FULL = `
<?xml version="1.0"?>
<dokument>
  <hlavicka>
    <dic>1234567890</dic>
    <priezvisko>Full</priezvisko>
    <meno>Form</meno>
    <zdanovacieObdobie><rok>${TAX_YEAR}</rok></zdanovacieObdobie>
    <adresaTrvPobytu><ulica>X</ulica><cislo>2</cislo><psc>81101</psc><obec>BA</obec><stat>SR</stat></adresaTrvPobytu>
  </hlavicka>
  <telo>
    <r36>10000.00</r36>
    <r37>500.00</r37>
    <r131>1200.00</r131>
    <r151>
      <ico>31333565</ico>
      <obchMeno><riadok>DETSKÁ KOMUNITA</riadok></obchMeno>
      <splnam3per>1</splnam3per>
      <suhlasSoZaslanim>1</suhlasSoZaslanim>
    </r151>
  </telo>
</dokument>
`;

describe('parsePersonalInfoFromDpfoXml', () => {
  it('returns personal info when hlavička and DIC are present', () => {
    const result = parsePersonalInfoFromDpfoXml(MINIMAL_HEADER_2025);
    expect(result).not.toBeNull();
    expect(result!.dic).toBe('1234567890');
    expect(result!.priezvisko).toBe('Test');
    expect(result!.meno).toBe('Ján');
    expect(result!.ulica).toBe('Hlavná');
    expect(result!.obec).toBe('Bratislava');
  });

  it('returns null for invalid XML', () => {
    expect(parsePersonalInfoFromDpfoXml('not xml <<<')).toBeNull();
  });

  it('returns null when dokument or hlavička is missing', () => {
    expect(parsePersonalInfoFromDpfoXml('<root/>')).toBeNull();
    expect(parsePersonalInfoFromDpfoXml('<dokument></dokument>')).toBeNull();
  });

  it('returns null when DIC is missing', () => {
    const noDic = '<dokument><hlavicka><priezvisko>X</priezvisko></hlavicka></dokument>';
    expect(parsePersonalInfoFromDpfoXml(noDic)).toBeNull();
  });
});

describe('parseDpfoXmlToFormData', () => {
  it('returns default form for invalid XML', () => {
    const result = parseDpfoXmlToFormData('not xml');
    expect(result.personalInfo.dic).toBe(DEFAULT_TAX_FORM.personalInfo.dic);
    expect(result.employment.r36).toBe('');
  });

  it('returns default form for empty string', () => {
    const result = parseDpfoXmlToFormData('');
    expect(result).toEqual(DEFAULT_TAX_FORM);
  });

  it('fills personal info and uses defaults when only hlavička present (current year)', () => {
    const result = parseDpfoXmlToFormData(MINIMAL_HEADER_2025);
    expect(result.personalInfo.dic).toBe('1234567890');
    expect(result.personalInfo.priezvisko).toBe('Test');
    expect(result.employment.r36).toBe('');
    expect(result.twoPercent.ico).toBe('');
  });

  it('previous-year XML: only personal info and 2% applied, rest defaults', () => {
    const result = parseDpfoXmlToFormData(MINIMAL_HEADER_2024);
    expect(result.personalInfo.dic).toBe('9999999999');
    expect(result.personalInfo.priezvisko).toBe('Prev');
    expect(result.employment.r36).toBe('');
    expect(result.mortgage.zaplateneUroky).toBe('');
  });

  it('current-year XML with telo: fills employment and two percent', () => {
    const result = parseDpfoXmlToFormData(CURRENT_YEAR_FULL);
    expect(result.personalInfo.dic).toBe('1234567890');
    expect(result.employment.enabled).toBe(true);
    expect(result.employment.r36).toBe('10000.00');
    expect(result.employment.r37).toBe('500.00');
    expect(result.employment.r131).toBe('1200.00');
    expect(result.twoPercent.enabled).toBe(true);
    expect(result.twoPercent.ico).toBe('31333565');
    expect(result.twoPercent.obchMeno).toBe('DETSKÁ KOMUNITA');
    expect(result.twoPercent.splnam3per).toBe(true);
    expect(result.twoPercent.suhlasSoZaslanim).toBe(true);
  });
});
