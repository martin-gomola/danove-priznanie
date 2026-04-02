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
import { safeDecimal } from '@/lib/utils/decimal';
import { dividendToEur } from '@/lib/utils/dividendEur';

function decStr(value: string | undefined): string {
  if (!value || value === '') return '';
  const d = safeDecimal(value);
  if (d.isNaN()) return '';
  return d.toDecimalPlaces(2).toFixed(2);
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
  const hlavicka = output.dokument.hlavicka;
  hlavicka.dic = form.personalInfo.dic;
  hlavicka.priezvisko = form.personalInfo.priezvisko;
  hlavicka.meno = form.personalInfo.meno;
  hlavicka.titul = form.personalInfo.titul;
  hlavicka.titulZa = form.personalInfo.titulZa;
  hlavicka.adresaTrvPobytu.ulica = form.personalInfo.ulica;
  hlavicka.adresaTrvPobytu.cislo = form.personalInfo.cislo;
  hlavicka.adresaTrvPobytu.psc = form.personalInfo.psc;
  hlavicka.adresaTrvPobytu.obec = form.personalInfo.obec;
  hlavicka.adresaTrvPobytu.stat = form.personalInfo.stat;

  // SK NACE — business classification code (e.g., "62010 - Počítačové programovanie")
  if (form.personalInfo.nace) {
    const [naceCode, naceLabel] = form.personalInfo.nace.split(' - ');
    if (naceCode) {
      hlavicka.skNace.k1 = naceCode.slice(0, 2);
      hlavicka.skNace.k2 = naceCode.slice(2, 4);
      hlavicka.skNace.k3 = naceCode.slice(4, 5);
      hlavicka.skNace.cinnost = (naceLabel || '').trim();
    }
  }

  const telo = output.dokument.telo;

  // ════════════════════════════════════════════════════════
  // Oddiel V: Employment income (§5)
  // ════════════════════════════════════════════════════════
  if (form.employment.enabled) {
    telo.r36 = decStr(form.employment.r36);
    telo.r37 = decStr(form.employment.r37);
    telo.r38 = decStr(calc.r38);

    if (form.employment.r36a) {
      telo.r36a = decStr(form.employment.r36a);
    }

    // Príloha č.4: socZdravPoistenie - pr8 must equal r.37
    if (form.employment.r37) {
      telo.socZdravPoistenie.pr8 = decStr(form.employment.r37);
    }
  }

  // ════════════════════════════════════════════════════════
  // Oddiel III: §11 ods.3 (r.31, r.32) + §33 (r.33 dieta)
  // ════════════════════════════════════════════════════════
  const spouse = form.spouse;
  if (spouse.enabled) {
    telo.r31 = {
      priezviskoMeno: spouse.priezviskoMeno || '',
      rodneCislo: spouse.rodneCislo || '',
    };
    telo.r32 = {
      uplatnujemNCZDNaManzela: '1',
      vlastnePrijmy: decStr(spouse.vlastnePrijmy),
      pocetMesiacov: spouse.pocetMesiacov || '',
    };
  }

  const childBonus = form.childBonus;
  if (childBonus.enabled && childBonus.children.length) {
    const emptyDieta = () => ({
      priezviskoMeno: '', rodneCislo: '',
      m00: '0', m01: '0', m02: '0', m03: '0', m04: '0', m05: '0',
      m06: '0', m07: '0', m08: '0', m09: '0', m10: '0', m11: '0', m12: '0',
    });
    const entries = childBonus.children.map((child) => {
      const allMonths = child.months.every(Boolean);
      const m: Record<string, string> = {
        priezviskoMeno: child.priezviskoMeno,
        rodneCislo: child.rodneCislo,
        m00: allMonths ? '1' : '0',
      };
      for (let i = 0; i < 12; i++) {
        m[`m${(i + 1).toString().padStart(2, '0')}`] = allMonths ? '0' : (child.months[i] ? '1' : '0');
      }
      return m;
    });
    // XSD requires minOccurs="4" for dieta
    while (entries.length < 4) entries.push(emptyDieta());
    telo.r33.dieta = entries;

    // r.33a: flag when more than 4 children (XSD only has 4 dieta slots inline)
    if (childBonus.children.length > 4) {
      telo.r33a = '1';
    }

    // §33 ods. 8: partner bonus sharing — r.34, r.34a
    if (childBonus.partnerSharing.enabled) {
      telo.uplatnujemPar33Ods8 = '1';
      telo.r34a = decStr(calc.r116a);
      const ps = childBonus.partnerSharing;
      if (ps.priezviskoMeno || ps.rodneCislo) {
        telo.r34.priezviskoMeno = ps.priezviskoMeno;
        telo.r34.rodneCislo = ps.rodneCislo;
        const allM = ps.wholeYear || ps.months.every(Boolean);
        telo.r34.m00 = allM ? '1' : '0';
        for (let i = 0; i < 12; i++) {
          telo.r34[`m${(i + 1).toString().padStart(2, '0')}`] = allM ? '0' : (ps.months[i] ? '1' : '0');
        }
        telo.r34.dokladRocZuct = boolStr(ps.dokladRocZuct);
        telo.r34.dokladVyskaDane = boolStr(ps.dokladVyskaDane);
      }
    }
  }

  // ════════════════════════════════════════════════════════
  // Oddiel IV: Mortgage interest (§33a)
  // ════════════════════════════════════════════════════════
  if (form.mortgage.enabled) {
    telo.r35 = {
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
    telo.tabulka2.t2r7.s1 = decStr(calc.totalFundIncome);
    telo.tabulka2.t2r7.s2 = decStr(calc.totalFundExpense);
    // Tab 2, r.11: total (= r.7 since we only have funds)
    telo.tabulka2.t2r11.s1 = decStr(calc.totalFundIncome);
    telo.tabulka2.t2r11.s2 = decStr(calc.totalFundExpense);
    // r.66-r.68: osobitný základ dane z §7
    telo.r66 = decStr(calc.r66);
    telo.r67 = decStr(calc.r67);
    telo.r68 = decStr(calc.r68);
  }

  // ════════════════════════════════════════════════════════
  // Oddiel VIII: Other income - Stock sales (§8 ods.1 písm.e), Tabulka 3
  // ════════════════════════════════════════════════════════
  if (form.stockSales.enabled && form.stockSales.entries.length > 0) {
    telo.tabulka3.t3r1.s1 = decStr(calc.r69);
    telo.tabulka3.t3r1.s2 = decStr(calc.r70);
    telo.r69 = decStr(calc.r69);
    telo.r70 = decStr(calc.r70);
    telo.r71 = decStr(calc.r71);
  }

  // ════════════════════════════════════════════════════════
  // Oddiel IX: Tax calculation
  // ════════════════════════════════════════════════════════

  // ── NCZD reduction (rows 72-78) ────────────────────────
  telo.r72 = decStr(calc.r72);  // ZD pred znížením (§5 only, NOT §7)
  telo.r73 = decStr(calc.r73);  // NCZD na daňovníka
  telo.r74 = decStr(calc.r74);  // NCZD na manžela/manželku
  telo.r75 = decStr(calc.r75);  // NCZD na DDS (§11 ods.8)
  telo.r77 = decStr(calc.r77);  // nezdaniteľná časť celkom
  telo.r78 = decStr(calc.r78);  // ZD z §5 po znížení

  // ── Tax base §4 ods.1 písm.a ──────────────────────────
  telo.r80 = decStr(calc.r80);  // ZD podľa §4 ods.1 písm.a

  // ── r.81: Daň (TAX amount) from r.80 ─────────────────
  telo.r81 = decStr(calc.r81);  // progressive 19%/25%

  // r.82-r.89: foreign income exemption/credit (not implemented)

  // ── r.90: Daň po vyňatí a zápočte ────────────────────
  telo.r90 = decStr(calc.r90);  // = r.81 (simplified)

  // r.91-r.105: §6 ods.1&2 handling (not applicable)

  // ── r.106: Daň (19%) z osobitného ZD z §7 ────────────
  telo.r106 = decStr(calc.r106);

  // r.107-r.114: foreign §7 adjustment (not implemented)

  // ── r.115: Daň z §7 po vyňatí a zápočte ──────────────
  telo.r115 = decStr(calc.r115); // = r.106 (simplified)

  // ── r.116: Grand total tax ────────────────────────────
  telo.r116 = decStr(calc.r116); // r.90 + r.115 + pril2.r28

  // ── r.116a: Partner's tax base for child bonus (§33 ods. 8) ──
  if (parseFloat(calc.r116a) > 0) {
    telo.r116a = decStr(calc.r116a);
  }

  // ── Bonuses (rows 117-127) ────────────────────────────
  // r.117: only write when > 0 (matches official form behavior)
  if (parseFloat(calc.r117) > 0) {
    telo.r117 = decStr(calc.r117);
  }
  telo.r118 = decStr(calc.r118);  // r.116 − r.117
  telo.r119 = decStr(calc.r119);  // bonus na deti paid by employer
  telo.r120 = decStr(calc.r120);  // r.117 − r.119
  telo.r121 = decStr(calc.r121);  // bonus na deti to claim from tax office
  telo.r122 = decStr(calc.r122);  // incorrectly paid bonus

  telo.r123 = decStr(calc.r123);  // mortgage bonus (§33a)
  telo.r124 = decStr(calc.r124);  // daň po bonusoch

  telo.r125 = '0.00';  // mortgage bonus paid by employer
  telo.r126 = decStr(calc.r126);  // remaining mortgage bonus
  telo.r127 = decStr(calc.r127);  // mortgage bonus to claim from tax office
  telo.r128 = '0.00';  // zamestnanecká prémia

  // ── Advances (rows 129-134) ───────────────────────────
  telo.r129 = '0.00';  // §43 preddavok
  telo.r130 = '0.00';  // §43 ods.10 preddavok
  telo.r131 = decStr(calc.r131);  // §35 preddavky (employment)
  telo.r132 = '0.00';  // §44 zabezpečenie dane
  telo.r133 = decStr(calc.r133);  // §34 zaplatené preddavky
  telo.r134 = '0.00';  // §35 ods.10,11 preddavky

  // ── Final result ──────────────────────────────────────
  telo.r135 = decStr(calc.r135);  // daň na úhradu
  telo.r136 = decStr(calc.r136);  // daňový preplatok

  // ── r.146/146a: Total income from §5 for child bonus (§33) ──
  // r.146 = total employment income (all sources); r.146a = from SK sources only.
  // Populated when: (a) child bonus > 0, OR (b) user provides income for partner's claim.
  const wantsChildBonus = form.childBonus.enabled && (
    parseFloat(calc.r117) > 0 ||
    form.childBonus.childrenChoice === 'income-used-by-someone-else'
  );
  if (wantsChildBonus && form.employment.enabled) {
    const r146val = decStr(form.employment.r36);
    if (r146val && parseFloat(r146val) > 0) {
      telo.r146 = r146val;
      telo.r146a = r146val;
    }
  }

  // ════════════════════════════════════════════════════════
  // Oddiel XII: 2% / 3% allocation (§50)
  // ════════════════════════════════════════════════════════
  if (form.twoPercent.enabled) {
    telo.r151.neuplatnujemPar50 = '0';
    telo.r151.splnam3per = boolStr(form.twoPercent.splnam3per);
    telo.r151.ico = form.twoPercent.ico;
    telo.r151.obchodneMeno.riadok = [form.twoPercent.obchMeno, ''];
    telo.r151.suhlasSoZaslanim = boolStr(form.twoPercent.suhlasSoZaslanim);
    telo.r152 = decStr(calc.r152);
  }

  // ════════════════════════════════════════════════════════
  // Oddiel XII: 2% allocation to parents (§50aa)
  // ════════════════════════════════════════════════════════
  if (form.parentAllocation.choice !== 'none') {
    telo.r153.neuplatnujemPar50aa = '0';
    telo.r153.rodicA = {
      rodneCislo: form.parentAllocation.parent1.rodneCislo,
      priezvisko: form.parentAllocation.parent1.priezvisko,
      meno: form.parentAllocation.parent1.meno,
    };
    if (form.parentAllocation.choice === 'both') {
      telo.r153.rodicB = {
        rodneCislo: form.parentAllocation.parent2.rodneCislo,
        priezvisko: form.parentAllocation.parent2.priezvisko,
        meno: form.parentAllocation.parent2.meno,
      };
    }
    telo.r153.bolZverenyDoStarostlivosti = boolStr(form.parentAllocation.osvojeny);
  }

  // ════════════════════════════════════════════════════════
  // Príloha č.2: Foreign dividends (§51e)
  // ════════════════════════════════════════════════════════
  if (form.dividends.enabled && form.dividends.entries.length > 0) {
    const pril2 = telo.pril2PodielyNaZisku;

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
    // Group dividends by country code for the mandatory foreign income breakdown.
    // Use amountEur when set; otherwise derive from amountOriginal so Section XIII is filled.
    const { ecbRate, czkRate } = form.dividends;
    const byCountry: Record<string, string> = {};
    for (const entry of form.dividends.entries) {
      const code = entry.country || '840';
      const amountEur =
        entry.amountEur && safeDecimal(entry.amountEur).gt(0)
          ? entry.amountEur
          : dividendToEur(entry.amountOriginal, entry.currency ?? 'USD', ecbRate, czkRate);
      byCountry[code] = safeDecimal(byCountry[code]).plus(safeDecimal(amountEur)).toFixed(2);
    }

    const countryEntries = Object.entries(byCountry).map(([code, amount]) => ({
      kodStatu: code,
      druhPrimuPar: '51e',
      druhPrimuOds: '1',
      druhPrimuPis: '',
      prijmy: amount,
      vydavky: '',
      zTohoVydavky: '',
    }));

    if (countryEntries.length > 0) {
      telo.osobitneZaznamy.uvadza = '1';
      // XSD requires minOccurs="6" for udajeOprijmoch
      const emptyEntry = () => ({
        kodStatu: '', druhPrimuPar: '', druhPrimuOds: '',
        druhPrimuPis: '', prijmy: '', vydavky: '', zTohoVydavky: '',
      });
      while (countryEntries.length < 6) countryEntries.push(emptyEntry());
      telo.osobitneZaznamy.udajeOprijmoch = countryEntries;
    }
  }

  // ════════════════════════════════════════════════════════
  // Metadata
  // ════════════════════════════════════════════════════════

  // r.154: attachment count — count documents the taxpayer should keep on file
  let attachmentCount = 0;
  if (form.employment.enabled) attachmentCount++;
  if (form.dividends.enabled) attachmentCount++;
  if (form.mutualFunds.enabled) attachmentCount++;
  if (form.stockSales.enabled) attachmentCount++;
  if (form.mortgage.enabled) attachmentCount++;
  if (form.twoPercent.enabled && form.twoPercent.splnam3per) attachmentCount++;
  if (form.parentAllocation.choice !== 'none' && form.parentAllocation.osvojeny) attachmentCount++;
  telo.r154 = String(attachmentCount);

  // Date
  const today = new Date();
  const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
  telo.datumVyhlasenia = todayStr;

  // XIV. oddiel: Refund / bonus payout request — gated by user consent flags
  const hasRefund = parseFloat(calc.r136) > 0;
  const hasChildBonusPayout = parseFloat(calc.r121) > 0;
  const hasMortgageBonusPayout = parseFloat(calc.r127) > 0;
  const rq = form.refundRequest;
  const wantRefund = hasRefund && rq.vratitPreplatok;
  const wantChildBonus = hasChildBonusPayout && rq.vyplatitDanovyBonus;
  const wantMortgageBonus = hasMortgageBonusPayout && rq.vyplatitDanovyBonusUroky;
  const needsPayment = wantRefund || wantChildBonus || wantMortgageBonus;

  if (needsPayment) {
    telo.danovyPreplatokBonus.datum = todayStr;
    if (wantRefund) telo.danovyPreplatokBonus.vratitDanPreplatok = '1';
    if (wantChildBonus) telo.danovyPreplatokBonus.vyplatitDanovyBonus = '1';
    if (wantMortgageBonus) telo.danovyPreplatokBonus.vyplatitDanovyBonusUroky = '1';

    const iban = rq.iban.replace(/\s/g, '').toUpperCase();
    if (rq.paymentMethod === 'ucet' && iban) {
      telo.danovyPreplatokBonus.sposobPlatby.ucet = '1';
      telo.danovyPreplatokBonus.bankovyUcet.IBAN = iban;
    } else if (rq.paymentMethod === 'poukazka') {
      telo.danovyPreplatokBonus.sposobPlatby.poukazka = '1';
    }
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

const DEFAULT_XML_BASE = 'dpfo_b_2025';

/** Sanitize a string for use in a filename (remove path/control chars, limit length). */
function sanitizeForFilename(s: string, maxLen = 80): string {
  const safe = s.replace(/[/\\:*?"<>|\x00-\x1f]/g, '').trim();
  return safe.length > maxLen ? safe.slice(0, maxLen) : safe;
}

/**
 * Default XML download filename. Use when calling downloadXML(xml, defaultXmlFilename(surname)).
 */
export function defaultXmlFilename(surname?: string | null): string {
  const s = surname?.trim();
  const base = s ? `${DEFAULT_XML_BASE}_${sanitizeForFilename(s)}` : DEFAULT_XML_BASE;
  return base.toLowerCase().endsWith('.xml') ? base : `${base.replace(/\.xml$/i, '')}.xml`;
}

function suggestedXmlName(filename?: string): string {
  const base = filename?.trim() || DEFAULT_XML_BASE;
  return base.toLowerCase().endsWith('.xml') ? base : `${base.replace(/\.xml$/i, '')}.xml`;
}

/**
 * Trigger browser download of XML file.
 * If the browser supports it, shows a "Save as" dialog so the user can choose filename and destination.
 * Otherwise falls back to a programmatic download with a .xml filename.
 */
export async function downloadXML(xml: string, filename?: string): Promise<void> {
  const name = suggestedXmlName(filename);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as Window & {
        showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'XML súbor', accept: { 'application/xml': ['.xml'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('showSaveFilePicker failed, falling back to download link', err);
      }
    }
  }

  // Use File so browsers that ignore the download attribute may still use the file name
  const file = new File([blob], name, { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.download = name;
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
