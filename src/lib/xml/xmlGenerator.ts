/**
 * XML Generator for DPFO typ B 2025
 *
 * Maps TaxFormData + TaxCalculationResult to the XML output structure
 * and exports valid XML compatible with financnasprava.sk e-form.
 *
 * Row numbers match the official form at:
 * https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html
 */

import xmljs from 'xml-js';
import cloneDeep from 'lodash.clonedeep';
import outputBasis, { OutputJson } from './outputBasis';
import { TaxFormData } from '@/types/TaxForm';
import { TaxCalculationResult } from '@/types/TaxForm';

function decStr(value: string | undefined): string {
  if (!value || value === '') return '';
  // Ensure 2 decimal places
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

function boolStr(value: boolean): string {
  return value ? '1' : '0';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Input: YYYY-MM-DD, output: DD.MM.YYYY
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/**
 * Convert TaxFormData + calculated results to the JSON structure
 * that maps 1:1 to the official XML schema.
 */
export function convertToJson(
  form: TaxFormData,
  calc: TaxCalculationResult
): OutputJson {
  const output: OutputJson = cloneDeep(outputBasis);

  if (!form.personalInfo.dic) return output;

  // ── Hlavička (Header) ────────────────────────────────
  const h = output.dokument.hlavicka;
  h.dic = form.personalInfo.dic;
  h.priezvisko = form.personalInfo.priezvisko;
  h.meno = form.personalInfo.meno;
  h.titul = form.personalInfo.titul;
  h.titulZa = form.personalInfo.titulZa;
  h.adresaTrvPobytu.ulica = form.personalInfo.ulica;
  h.adresaTrvPobytu.cislo = form.personalInfo.cislo;
  h.adresaTrvPobytu.psc = form.personalInfo.psc;
  h.adresaTrvPobytu.obec = form.personalInfo.obec;
  h.adresaTrvPobytu.stat = form.personalInfo.stat;

  const t = output.dokument.telo;

  // ════════════════════════════════════════════════════════
  // Oddiel V: Employment income (§5)
  // ════════════════════════════════════════════════════════
  if (form.employment.enabled) {
    t.r36 = decStr(form.employment.r36);
    t.r37 = decStr(form.employment.r37);
    t.r38 = decStr(calc.r38);

    if (form.employment.r36a) {
      t.r36a = decStr(form.employment.r36a);
    }

    // Príloha č.4: socZdravPoistenie - pr8 must equal r.37
    if (form.employment.r37) {
      t.socZdravPoistenie.pr8 = decStr(form.employment.r37);
    }
  }

  // ════════════════════════════════════════════════════════
  // Oddiel III: §11 ods.3 (r.31, r.32) + §33 (r.33 dieta)
  // ════════════════════════════════════════════════════════
  const spouse = form.spouse;
  if (spouse?.enabled) {
    t.r31 = {
      priezviskoMeno: spouse.priezviskoMeno || '',
      rodneCislo: spouse.rodneCislo || '',
    };
    t.r32 = {
      uplatnujemNCZDNaManzela: '1',
      vlastnePrijmy: decStr(spouse.vlastnePrijmy),
      pocetMesiacov: spouse.pocetMesiacov || '',
    };
  }

  const childBonus = form.childBonus;
  if (childBonus?.enabled && childBonus.children?.length) {
    const emptyDieta = () => ({
      priezviskoMeno: '', rodneCislo: '',
      m00: '0', m01: '0', m02: '0', m03: '0', m04: '0', m05: '0',
      m06: '0', m07: '0', m08: '0', m09: '0', m10: '0', m11: '0', m12: '0',
    });
    const entries = childBonus.children.map((child) => {
      const m: Record<string, string> = {
        priezviskoMeno: child.priezviskoMeno,
        rodneCislo: child.rodneCislo,
        m00: '0',
      };
      for (let i = 0; i < 12; i++) {
        m[`m${(i + 1).toString().padStart(2, '0')}`] = child.months[i] ? '1' : '0';
      }
      return m;
    });
    // XSD requires minOccurs="4" for dieta
    while (entries.length < 4) entries.push(emptyDieta());
    t.r33.dieta = entries;
  }

  // ════════════════════════════════════════════════════════
  // Oddiel IV: Mortgage interest (§33a)
  // ════════════════════════════════════════════════════════
  if (form.mortgage.enabled) {
    t.r35 = {
      uplatDanBonusZaplatUroky: '1',
      zaplateneUroky: decStr(form.mortgage.zaplateneUroky),
      pocetMesiacov: form.mortgage.pocetMesiacov,
      datumZacatiaUroceniaUveru: formatDate(form.mortgage.datumZacatiaUroceniaUveru),
      datumUzavretiaZmluvyOUvere: formatDate(form.mortgage.datumUzavretiaZmluvy),
    };
  }

  // ════════════════════════════════════════════════════════
  // Oddiel VII: Capital income - Mutual funds (§7)
  // Tabuľka č.2, row 7 (podielové listy) + row 11 (total)
  // ════════════════════════════════════════════════════════
  if (form.mutualFunds.enabled && form.mutualFunds.entries.length > 0) {
    // Tab 2, r.7: podielové listy
    t.tabulka2.t2r7.s1 = decStr(calc.totalFundIncome);
    t.tabulka2.t2r7.s2 = decStr(calc.totalFundExpense);
    // Tab 2, r.11: total (= r.7 since we only have funds)
    t.tabulka2.t2r11.s1 = decStr(calc.totalFundIncome);
    t.tabulka2.t2r11.s2 = decStr(calc.totalFundExpense);
    // r.66-r.68: osobitný základ dane z §7
    t.r66 = decStr(calc.r66);
    t.r67 = decStr(calc.r67);
    t.r68 = decStr(calc.r68);
  }

  // ════════════════════════════════════════════════════════
  // Oddiel IX: Tax calculation
  // ════════════════════════════════════════════════════════

  // ── NCZD reduction (rows 72-78) ────────────────────────
  t.r72 = decStr(calc.r72);  // ZD pred znížením (§5 only, NOT §7)
  t.r73 = decStr(calc.r73);  // NCZD na daňovníka
  // r.74, r.75: not implemented (spouse, pension contributions)
  t.r77 = decStr(calc.r77);  // nezdaniteľná časť celkom
  t.r78 = decStr(calc.r78);  // ZD z §5 po znížení

  // ── Tax base §4 ods.1 písm.a ──────────────────────────
  t.r80 = decStr(calc.r80);  // ZD podľa §4 ods.1 písm.a

  // ── r.81: Daň (TAX amount) from r.80 ─────────────────
  t.r81 = decStr(calc.r81);  // progressive 19%/25%

  // r.82-r.89: foreign income exemption/credit (not implemented)

  // ── r.90: Daň po vyňatí a zápočte ────────────────────
  t.r90 = decStr(calc.r90);  // = r.81 (simplified)

  // r.91-r.105: §6 ods.1&2 handling (not applicable)

  // ── r.106: Daň (19%) z osobitného ZD z §7 ────────────
  t.r106 = decStr(calc.r106);

  // r.107-r.114: foreign §7 adjustment (not implemented)

  // ── r.115: Daň z §7 po vyňatí a zápočte ──────────────
  t.r115 = decStr(calc.r115); // = r.106 (simplified)

  // ── r.116: Grand total tax ────────────────────────────
  t.r116 = decStr(calc.r116); // r.90 + r.115 + pril2.r28

  // ── Bonuses (rows 117-127) ────────────────────────────
  t.r117 = decStr(calc.r117);  // daňový bonus na deti (§33)
  t.r118 = decStr(calc.r118);  // r.116 − r.117
  t.r119 = decStr(calc.r119);  // bonus na deti paid by employer
  t.r120 = decStr(calc.r120);  // r.117 − r.119
  t.r121 = decStr(calc.r121);  // bonus na deti to claim from tax office
  t.r122 = decStr(calc.r122);  // incorrectly paid bonus

  t.r123 = decStr(calc.r123);  // mortgage bonus (§33a)
  t.r124 = decStr(calc.r124);  // daň po bonusoch

  t.r125 = '0.00';  // mortgage bonus paid by employer
  t.r126 = decStr(calc.r126);  // remaining mortgage bonus
  t.r127 = decStr(calc.r127);  // mortgage bonus to claim from tax office
  t.r128 = '0.00';  // zamestnanecká prémia

  // ── Advances (rows 129-134) ───────────────────────────
  t.r129 = '0.00';  // §43 preddavok
  t.r130 = '0.00';  // §43 ods.10 preddavok
  t.r131 = decStr(calc.r131);  // §35 preddavky (employment)
  t.r132 = '0.00';  // §44 zabezpečenie dane
  t.r133 = '0.00';  // §34 preddavky
  t.r134 = '0.00';  // §35 ods.10,11 preddavky

  // ── Final result ──────────────────────────────────────
  t.r135 = decStr(calc.r135);  // daň na úhradu
  t.r136 = decStr(calc.r136);  // daňový preplatok

  // ════════════════════════════════════════════════════════
  // Oddiel XII: 2% / 3% allocation (§50)
  // ════════════════════════════════════════════════════════
  if (form.twoPercent.enabled) {
    t.r151.neuplatnujemPar50 = '0';
    t.r151.splnam3per = boolStr(form.twoPercent.splnam3per);
    t.r151.ico = form.twoPercent.ico;
    t.r151.obchodneMeno.riadok = [form.twoPercent.obchMeno, ''];
    t.r151.suhlasSoZaslanim = boolStr(form.twoPercent.suhlasSoZaslanim);
    t.r152 = decStr(calc.r152);
  }

  // ════════════════════════════════════════════════════════
  // Oddiel XII: 2% allocation to parents (§50aa)
  // ════════════════════════════════════════════════════════
  if (form.parentAllocation.choice !== 'none') {
    t.r153.neuplatnujemPar50aa = '0';
    t.r153.rodicA = {
      rodneCislo: form.parentAllocation.parent1.rodneCislo,
      priezvisko: form.parentAllocation.parent1.priezvisko,
      meno: form.parentAllocation.parent1.meno,
    };
    if (form.parentAllocation.choice === 'both') {
      t.r153.rodicB = {
        rodneCislo: form.parentAllocation.parent2.rodneCislo,
        priezvisko: form.parentAllocation.parent2.priezvisko,
        meno: form.parentAllocation.parent2.meno,
      };
    }
    t.r153.bolZverenyDoStarostlivosti = boolStr(form.parentAllocation.osvojeny);
  }

  // ════════════════════════════════════════════════════════
  // Príloha č.2: Foreign dividends (§51e)
  // ════════════════════════════════════════════════════════
  if (form.dividends.enabled && form.dividends.entries.length > 0) {
    const pril2 = t.pril2PodielyNaZisku;

    // Cooperative states section (pr.01-pr.18)
    pril2.pr1 = decStr(calc.pril2_pr1);    // podiel na zisku
    pril2.pr6 = {                           // spolu
      s1: decStr(calc.pril2_pr6),
      s2: '',
    };
    pril2.pr7 = decStr(calc.pril2_pr7);    // osobitný ZD
    pril2.pr8 = calc.pril2_pr8;            // sadzba (7)
    pril2.pr9 = decStr(calc.pril2_pr9);    // daň (before credit)

    // Foreign tax credit (zápočet)
    pril2.pr13 = decStr(calc.pril2_pr13);  // dividends subject to credit
    pril2.pr14 = decStr(calc.pril2_pr14);  // tax paid abroad
    pril2.pr15 = decStr(calc.pril2_pr15);  // percentage for credit
    pril2.pr16 = decStr(calc.pril2_pr16);  // max creditable
    pril2.pr17 = decStr(calc.pril2_pr17);  // tax recognized for credit
    pril2.pr18 = decStr(calc.pril2_pr18);  // daň po zápočte

    // Total dividend tax
    pril2.pr28 = decStr(calc.pril2_pr28);  // = pr.18 + pr.27

    // ── Osobitné záznamy (Oddiel XIII) ─────────────────
    // Group dividends by country code for the mandatory foreign income breakdown
    const byCountry: Record<string, number> = {};
    for (const entry of form.dividends.entries) {
      const code = entry.country || '840';
      byCountry[code] = (byCountry[code] || 0) + parseFloat(entry.amountEur || '0');
    }

    const countryEntries = Object.entries(byCountry).map(([code, amount]) => ({
      kodStatu: code,
      druhPrimuPar: '51e', // §51e - dividends
      druhPrimuOds: '1',
      druhPrimuPis: '',
      prijmy: amount.toFixed(2),
      vydavky: '',
      zTohoVydavky: '',
    }));

    if (countryEntries.length > 0) {
      t.osobitneZaznamy.uvadza = '1';
      // XSD requires minOccurs="6" for udajeOprijmoch
      const emptyEntry = () => ({
        kodStatu: '', druhPrimuPar: '', druhPrimuOds: '',
        druhPrimuPis: '', prijmy: '', vydavky: '', zTohoVydavky: '',
      });
      while (countryEntries.length < 6) countryEntries.push(emptyEntry());
      t.osobitneZaznamy.udajeOprijmoch = countryEntries;
    }
  }

  // ════════════════════════════════════════════════════════
  // Metadata
  // ════════════════════════════════════════════════════════

  // r.154: attachment count
  t.r154 = form.employment.enabled ? '7' : '6';

  // Date
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
  t.datumVyhlasenia = todayStr;

  // Refund request (XIV. oddiel)
  t.danovyPreplatokBonus.datum = todayStr;
  if (calc.isRefund) {
    t.danovyPreplatokBonus.vratitDanPreplatok = '1';
  }

  return output;
}

/**
 * Convert to XML string compatible with financnasprava.sk e-form
 */
export function convertToXML(
  form: TaxFormData,
  calc: TaxCalculationResult
): string {
  const jsonForm = convertToJson(form, calc);

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
  xml += xmljs.js2xml(jsonForm, {
    compact: true,
    spaces: 3,
  });

  return xml;
}

/**
 * Trigger browser download of XML file
 */
export function downloadXML(xml: string, filename?: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dpfo_b_2025.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
