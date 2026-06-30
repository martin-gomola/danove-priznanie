import type { TaxCalculationResult } from '@/types/TaxForm';

export type TaxRowId = keyof TaxCalculationResult;

export interface TaxRowDefinition {
  id: TaxRowId;
  label: string;
  section: string;
}

const ROW_DEFINITIONS: Partial<Record<TaxRowId, TaxRowDefinition>> = {
  r38: { id: 'r38', section: 'Oddiel V', label: 'Základ dane zo závislej činnosti' },
  r66: { id: 'r66', section: 'Oddiel VII', label: 'Úhrn príjmov z tabuľky 2' },
  r67: { id: 'r67', section: 'Oddiel VII', label: 'Úhrn výdavkov z tabuľky 2' },
  r68: { id: 'r68', section: 'Oddiel VII', label: 'Osobitný základ dane z §7' },
  r69: { id: 'r69', section: 'Oddiel VIII', label: 'Úhrn príjmov z tabuľky 3' },
  r70: { id: 'r70', section: 'Oddiel VIII', label: 'Úhrn výdavkov z tabuľky 3' },
  r71: { id: 'r71', section: 'Oddiel VIII', label: 'Osobitný základ dane z §8' },
  r72: { id: 'r72', section: 'Oddiel IX', label: 'ZD z §5 pred znížením o NCZD' },
  r73: { id: 'r73', section: 'Oddiel IX', label: 'NCZD na daňovníka (§11 ods.2)' },
  r74: { id: 'r74', section: 'Oddiel IX', label: 'NCZD na manžela/manželku (§11 ods.3)' },
  r75: { id: 'r75', section: 'Oddiel IX', label: 'NCZD na príspevky na DDS (§11 ods.8)' },
  r77: { id: 'r77', section: 'Oddiel IX', label: 'Nezdaniteľná časť celkom' },
  r78: { id: 'r78', section: 'Oddiel IX', label: 'ZD z §5 po znížení o NCZD' },
  r80: { id: 'r80', section: 'Oddiel IX', label: 'ZD podľa §4 ods.1 písm.a' },
  r81: { id: 'r81', section: 'Oddiel IX', label: 'Daň z r.80 (19%/25%)' },
  r90: { id: 'r90', section: 'Oddiel IX', label: 'Daň z §4 ods.1 písm.a' },
  r106: { id: 'r106', section: 'Oddiel IX', label: 'Daň z §7 (19% z r.68)' },
  r115: { id: 'r115', section: 'Oddiel IX', label: 'Daň z §7 po úprave' },
  r116: { id: 'r116', section: 'Oddiel IX', label: 'Daň celkovo' },
  r116a: { id: 'r116a', section: 'Oddiel IX', label: 'ZD druhého rodiča (§33 ods.8)' },
  r117: { id: 'r117', section: 'Oddiel IX', label: 'Daňový bonus na deti' },
  r118: { id: 'r118', section: 'Oddiel IX', label: 'Daň po bonuse na deti' },
  r119: { id: 'r119', section: 'Oddiel IX', label: 'Bonus na deti vyplatený zamestnávateľom' },
  r120: { id: 'r120', section: 'Oddiel IX', label: 'Zostávajúci bonus na deti' },
  r121: { id: 'r121', section: 'Oddiel IX', label: 'Bonus na deti na poukázanie správcom dane' },
  r122: { id: 'r122', section: 'Oddiel IX', label: 'Nesprávne vyplatený bonus' },
  r123: { id: 'r123', section: 'Oddiel IX', label: 'Bonus na zaplatené úroky (§33a)' },
  r124: { id: 'r124', section: 'Oddiel IX', label: 'Daň po všetkých bonusoch' },
  r131: { id: 'r131', section: 'Oddiel IX', label: 'Preddavky na daň zrazené' },
  r133: { id: 'r133', section: 'Oddiel IX', label: 'Zaplatené preddavky (§34)' },
  r135: { id: 'r135', section: 'Oddiel IX', label: 'Daň na úhradu' },
  r136: { id: 'r136', section: 'Oddiel IX', label: 'Daňový preplatok' },
  r152: { id: 'r152', section: 'Oddiel XII', label: 'Suma podielu zaplatenej dane' },
  pril2_pr1: { id: 'pril2_pr1', section: 'Príloha č.2', label: 'Podiel na zisku' },
  pril2_pr7: { id: 'pril2_pr7', section: 'Príloha č.2', label: 'Osobitný základ dane' },
  pril2_pr8: { id: 'pril2_pr8', section: 'Príloha č.2', label: 'Sadzba dane' },
  pril2_pr9: { id: 'pril2_pr9', section: 'Príloha č.2', label: 'Daň pred zápočtom' },
  pril2_pr14: { id: 'pril2_pr14', section: 'Príloha č.2', label: 'Daň zaplatená v zahraničí' },
  pril2_pr17: { id: 'pril2_pr17', section: 'Príloha č.2', label: 'Daň uznaná na zápočet' },
  pril2_pr18: { id: 'pril2_pr18', section: 'Príloha č.2', label: 'Daň po zápočte' },
  pril2_pr28: { id: 'pril2_pr28', section: 'Príloha č.2', label: 'Celková daň z dividend' },
};

export interface TaxRowLabels {
  value(row: TaxRowId): string;
  label(row: TaxRowId): string;
  definition(row: TaxRowId): TaxRowDefinition | undefined;
}

export function taxRowLabelsFromCalculation(calc: TaxCalculationResult): TaxRowLabels {
  return {
    value: (row) => String(calc[row] ?? ''),
    label: (row) => ROW_DEFINITIONS[row]?.label ?? String(row),
    definition: (row) => ROW_DEFINITIONS[row],
  };
}
