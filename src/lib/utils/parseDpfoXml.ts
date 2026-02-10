/**
 * Parse DPFO (daňové priznanie) XML - same format we export for the real form.
 * Single format: export produces XML, import reads it back into form state.
 *
 * Structure must match xmlGenerator / outputBasis and official DPFO typ B
 * (e.g. dokument.hlavicka, dokument.telo, row numbers r33, r35, r151, etc.).
 */

import xmljs from 'xml-js';
import {
  PersonalInfo,
  TaxFormData,
  EmploymentIncome,
  MortgageInterest,
  MutualFundSales,
  ForeignDividends,
  SpouseNCZD,
  ChildBonus,
  DEFAULT_TAX_FORM,
  type TwoPercentAllocation,
  type ParentTaxAllocation,
  type DividendEntry,
  type ChildEntry,
  type StockSales,
} from '@/types/TaxForm';
import { findCountryByCode, getCurrencyForCountry } from '@/lib/countries';
import { ECB_RATE_2025, ECB_CZK_RATE_2025, TAX_YEAR } from '@/lib/tax/constants';

// ── Low-level XML helpers ────────────────────────────────────────────

/** Type guard: returns true if `value` is a non-null object (not an array). */
function isObj(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Extract text content from an xml-js compact element. Returns '' for null/missing. */
function extractText(element: unknown): string {
  if (element == null) return '';
  if (typeof element === 'string') return element.trim();
  const obj = element as { _text?: string; _cdata?: string };
  const value = obj._cdata ?? obj._text;
  return value != null ? String(value).trim() : '';
}

/** Get a child element by key from a compact xml-js node. */
function getChild(element: unknown, key: string): unknown {
  if (!isObj(element)) return undefined;
  return element[key];
}

/** Convert DD.MM.YYYY → YYYY-MM-DD; returns '' for invalid or non-parseable dates. */
function parseDateSk(s: string): string {
  if (!s || !s.trim()) return '';
  const parts = String(s).trim().split('.');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  const iso = `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  if (Number.isNaN(Date.parse(iso))) return '';
  return iso;
}

/** Wrap a value in an array; returns [] for null/undefined. */
function toArray(element: unknown): unknown[] {
  if (element == null) return [];
  if (Array.isArray(element)) return element;
  return [element];
}

// ── Section parsers ──────────────────────────────────────────────────

/** Extract personal info from hlavička object. Returns null if DIC is missing. */
function parseHlavicka(hlavicka: unknown): PersonalInfo | null {
  if (!isObj(hlavicka)) return null;
  const adresa = getChild(hlavicka, 'adresaTrvPobytu');
  const dic = extractText(getChild(hlavicka, 'dic'));
  if (!dic) return null;
  return {
    dic,
    priezvisko: extractText(getChild(hlavicka, 'priezvisko')),
    meno: extractText(getChild(hlavicka, 'meno')),
    titul: extractText(getChild(hlavicka, 'titul')),
    titulZa: extractText(getChild(hlavicka, 'titulZa')),
    ulica: isObj(adresa) ? extractText(getChild(adresa, 'ulica')) : '',
    cislo: isObj(adresa) ? extractText(getChild(adresa, 'cislo')) : '',
    psc: isObj(adresa) ? extractText(getChild(adresa, 'psc')) : '',
    obec: isObj(adresa) ? extractText(getChild(adresa, 'obec')) : '',
    stat: isObj(adresa) ? extractText(getChild(adresa, 'stat')) || 'Slovenská republika' : 'Slovenská republika',
  };
}

/** Parse employment fields (r36, r36a, r37, r131) from telo. */
function parseEmployment(telo: Record<string, unknown>): EmploymentIncome {
  const r36 = extractText(getChild(telo, 'r36'));
  const r36a = extractText(getChild(telo, 'r36a'));
  const r37 = extractText(getChild(telo, 'r37'));
  const r131 = extractText(getChild(telo, 'r131'));
  return {
    enabled: Boolean(r36 || r36a || r37 || r131),
    r36,
    r36a,
    r37,
    r131,
  };
}

/** Parse mortgage (r35) from telo. */
function parseMortgage(telo: Record<string, unknown>): MortgageInterest {
  const r35 = getChild(telo, 'r35');
  if (!isObj(r35)) return DEFAULT_TAX_FORM.mortgage;
  const uplat = extractText(r35.uplatDanBonusZaplatUroky);
  return {
    enabled: uplat === '1',
    zaplateneUroky: extractText(r35.zaplateneUroky),
    pocetMesiacov: extractText(r35.pocetMesiacov),
    datumZacatiaUroceniaUveru: parseDateSk(extractText(r35.datumZacatiaUroceniaUveru)),
    datumUzavretiaZmluvy: parseDateSk(extractText(r35.datumUzavretiaZmluvyOUvere)),
    confirm4Years: false,
  };
}

/** Parse mutual funds (tabulka2.t2r7) from telo. */
function parseMutualFunds(telo: Record<string, unknown>): MutualFundSales {
  const tabulka2 = getChild(telo, 'tabulka2');
  if (!isObj(tabulka2)) return DEFAULT_TAX_FORM.mutualFunds;

  const t2r7 = getChild(tabulka2, 't2r7');
  if (!isObj(t2r7)) return DEFAULT_TAX_FORM.mutualFunds;

  const s1 = extractText(t2r7.s1);
  const s2 = extractText(t2r7.s2);
  if (!s1 && !s2) return DEFAULT_TAX_FORM.mutualFunds;

  return {
    enabled: true,
    entries: [
      { id: 'imported-1', fundName: '', saleAmount: s1, purchaseAmount: s2 },
    ],
  };
}

/** Parse stock sales (§8, tabulka3.t3r1 or r69/r70) from telo. */
function parseStockSales(telo: Record<string, unknown>): StockSales {
  const tabulka3 = getChild(telo, 'tabulka3');
  const t3r1 = isObj(tabulka3) ? getChild(tabulka3, 't3r1') : undefined;
  let s1 = '';
  let s2 = '';
  if (isObj(t3r1)) {
    s1 = extractText(t3r1.s1);
    s2 = extractText(t3r1.s2);
  }
  if (!s1 && !s2) {
    s1 = extractText(getChild(telo, 'r69'));
    s2 = extractText(getChild(telo, 'r70'));
  }
  if (!s1 && !s2) return DEFAULT_TAX_FORM.stockSales;

  return {
    enabled: true,
    entries: [
      { id: 'imported-stock-1', ticker: '', saleAmount: s1, purchaseAmount: s2 },
    ],
  };
}

/** Parse dividends: pril2 (pr1, pr14) + osobitneZaznamy.udajeOprijmoch from telo. */
function parseDividends(telo: Record<string, unknown>): ForeignDividends {
  const pril2 = getChild(telo, 'pril2PodielyNaZisku');
  const pr1 = isObj(pril2) ? extractText(pril2.pr1) : '';
  const pr14 = isObj(pril2) ? extractText(pril2.pr14) : '';
  const totalPrijmy = parseFloat(pr1) || 0;
  const totalWithheld = parseFloat(pr14) || 0;

  const osobitne = getChild(telo, 'osobitneZaznamy');
  const udajeRaw = isObj(osobitne) ? osobitne.udajeOprijmoch : undefined;
  const udajeList = toArray(udajeRaw);
  const entries: DividendEntry[] = [];

  for (const udaj of udajeList) {
    if (!isObj(udaj)) continue;
    const kodStatu = extractText(udaj.kodStatu);
    const prijmy = extractText(udaj.prijmy);
    if (!kodStatu && !prijmy) continue;

    const amountEur = parseFloat(prijmy) || 0;
    const share = totalPrijmy > 0 ? amountEur / totalPrijmy : (udajeList.length === 1 ? 1 : 0);
    const withheldTaxEur = totalWithheld * share;
    const country = findCountryByCode(kodStatu);
    const currency = getCurrencyForCountry(kodStatu || '840');

    // Back-calculate the original-currency amount from the EUR value stored in XML
    // EUR: direct, CZK: multiply by CZK rate, USD: multiply by USD rate
    const backRate = currency === 'EUR' ? 1 : currency === 'CZK' ? ECB_CZK_RATE_2025 : ECB_RATE_2025;
    const amountUsd = currency === 'EUR' ? (prijmy || '0') : (amountEur * backRate).toFixed(2);
    const withheldTaxUsd = currency === 'EUR' ? withheldTaxEur.toFixed(2) : (withheldTaxEur * backRate).toFixed(2);

    entries.push({
      id: `imported-d-${entries.length}`,
      ticker: '',
      country: kodStatu || '840',
      countryName: country?.name ?? kodStatu,
      currency,
      amountEur: prijmy || '0',
      amountUsd,
      withheldTaxEur: withheldTaxEur.toFixed(2),
      withheldTaxUsd,
    });
  }

  if (!entries.length) return DEFAULT_TAX_FORM.dividends;
  return {
    ...DEFAULT_TAX_FORM.dividends,
    enabled: true,
    entries,
    ecbRate: String(ECB_RATE_2025),
  };
}

/** Parse spouse NCZD (§11 ods.3 - r31, r32) from telo. */
function parseSpouse(telo: Record<string, unknown>): SpouseNCZD {
  const r31 = getChild(telo, 'r31');
  const r32 = getChild(telo, 'r32');
  if (!isObj(r31) || !isObj(r32)) return DEFAULT_TAX_FORM.spouse;

  const uplat = extractText(r32.uplatnujemNCZDNaManzela) === '1';
  if (!uplat && !extractText(r31.priezviskoMeno) && !extractText(r31.rodneCislo)) {
    return DEFAULT_TAX_FORM.spouse;
  }

  return {
    enabled: true,
    priezviskoMeno: extractText(r31.priezviskoMeno),
    rodneCislo: extractText(r31.rodneCislo),
    vlastnePrijmy: extractText(r32.vlastnePrijmy),
    pocetMesiacov: extractText(r32.pocetMesiacov),
  };
}

/** Parse child bonus (r33.dieta, r119) from telo. */
function parseChildBonus(telo: Record<string, unknown>): ChildBonus {
  const r33 = getChild(telo, 'r33');
  const dietaList = isObj(r33) ? toArray(r33.dieta) : [];
  const children: ChildEntry[] = [];

  for (const childNode of dietaList) {
    if (!isObj(childNode)) continue;
    const months: boolean[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `m${String(m).padStart(2, '0')}`;
      months.push(extractText(childNode[key]) === '1');
    }
    children.push({
      id: `imported-c-${children.length}`,
      priezviskoMeno: extractText(childNode.priezviskoMeno),
      rodneCislo: extractText(childNode.rodneCislo),
      months,
      wholeYear: months.length === 12 && months.every(Boolean),
    });
  }

  const r119 = extractText(getChild(telo, 'r119'));
  if (!children.length && !r119) return DEFAULT_TAX_FORM.childBonus;

  return {
    enabled: children.length > 0,
    children,
    bonusPaidByEmployer: r119,
  };
}

/** Extract 2% allocation from telo.r151. */
function parseTwoPercent(telo: Record<string, unknown>): TwoPercentAllocation {
  const r151 = getChild(telo, 'r151');
  if (!isObj(r151)) return DEFAULT_TAX_FORM.twoPercent;

  const ico = extractText(r151.ico);
  const obch = r151.obchodneMeno ?? r151.obchMeno;
  let obchMeno = '';
  if (isObj(obch)) {
    const riadok = obch.riadok;
    const first = Array.isArray(riadok) ? riadok[0] : riadok;
    obchMeno = extractText(first);
  }

  return {
    enabled: Boolean(ico || obchMeno),
    ico,
    obchMeno,
    splnam3per: extractText(r151.splnam3per) === '1',
    suhlasSoZaslanim: extractText(r151.suhlasSoZaslanim) === '1',
  };
}

/** Extract parent allocation (§50aa) from telo.r153. */
function parseParentAllocation(telo: Record<string, unknown>): ParentTaxAllocation {
  const r153 = getChild(telo, 'r153');
  if (!isObj(r153)) return DEFAULT_TAX_FORM.parentAllocation;

  const neuplatnujem = extractText(r153.neuplatnujemPar50aa);
  if (neuplatnujem === '1') return DEFAULT_TAX_FORM.parentAllocation;

  const rodicA = getChild(r153, 'rodicA');
  const rodicB = getChild(r153, 'rodicB');

  const p1 = isObj(rodicA) ? {
    meno: extractText(rodicA.meno),
    priezvisko: extractText(rodicA.priezvisko),
    rodneCislo: extractText(rodicA.rodneCislo),
  } : { meno: '', priezvisko: '', rodneCislo: '' };

  const p2 = isObj(rodicB) ? {
    meno: extractText(rodicB.meno),
    priezvisko: extractText(rodicB.priezvisko),
    rodneCislo: extractText(rodicB.rodneCislo),
  } : { meno: '', priezvisko: '', rodneCislo: '' };

  const hasP1 = Boolean(p1.meno || p1.priezvisko || p1.rodneCislo);
  const hasP2 = Boolean(p2.meno || p2.priezvisko || p2.rodneCislo);

  return {
    choice: hasP1 && hasP2 ? 'both' : hasP1 ? 'one' : 'none',
    parent1: p1,
    parent2: p2,
    osvojeny: extractText(r153.bolZverenyDoStarostlivosti) === '1',
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Parse DPFO XML string and return personal info from hlavička (header).
 * Returns null if the XML is not a valid DPFO document or has no hlavička/DIC.
 */
export function parsePersonalInfoFromDpfoXml(xmlString: string): PersonalInfo | null {
  try {
    const parsed = xmljs.xml2js(xmlString, { compact: true }) as Record<string, unknown>;
    const dokument = getChild(parsed, 'dokument');
    const hlavicka = getChild(dokument, 'hlavicka');
    return parseHlavicka(hlavicka);
  } catch {
    return null;
  }
}

/**
 * Parse full DPFO XML (same format we export) into TaxFormData.
 * Merges with DEFAULT_TAX_FORM so missing sections have safe defaults.
 * If the XML is from a previous tax year, only personal info and 2% are imported;
 * other sections (employment, dividends, mortgage, etc.) are left as defaults.
 */
export function parseDpfoXmlToFormData(xmlString: string): TaxFormData {
  const base = { ...DEFAULT_TAX_FORM };

  try {
    const parsed = xmljs.xml2js(xmlString, { compact: true }) as Record<string, unknown>;
    const dokument = getChild(parsed, 'dokument');
    if (!isObj(dokument)) return base;

    const hlavicka = getChild(dokument, 'hlavicka');
    const telo = getChild(dokument, 'telo');

    // Always import personal info
    const personal = parseHlavicka(hlavicka);
    if (personal) base.personalInfo = personal;

    // Detect previous-year XML: only personal info + 2% (other values may have changed)
    const zdanObdobie = isObj(hlavicka) ? getChild(hlavicka, 'zdanovacieObdobie') : undefined;
    const rokStr = isObj(zdanObdobie) ? extractText(zdanObdobie.rok) : '';
    const xmlYear = parseInt(rokStr, 10);
    const isPreviousYear = !rokStr || Number.isNaN(xmlYear) || xmlYear < TAX_YEAR;

    if (!isObj(telo)) return base;

    if (isPreviousYear) {
      return {
        ...base,
        twoPercent: parseTwoPercent(telo),
        parentAllocation: parseParentAllocation(telo),
      };
    }

    // Current year: import all sections
    return {
      ...base,
      employment: parseEmployment(telo),
      mortgage: parseMortgage(telo),
      mutualFunds: parseMutualFunds(telo),
      stockSales: parseStockSales(telo),
      dividends: parseDividends(telo),
      spouse: parseSpouse(telo),
      childBonus: parseChildBonus(telo),
      twoPercent: parseTwoPercent(telo),
      parentAllocation: parseParentAllocation(telo),
    };
  } catch {
    return base;
  }
}
