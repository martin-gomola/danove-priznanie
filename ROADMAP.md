# Roadmap - dane-priznanie

Low-priority items identified from the priznanie-digital comparison.
These are nice-to-haves that don't affect calculation correctness or XSD compliance.

## Calculation / Logic

- **§6 income support** - Self-employment income (živnosť), paušálne výdavky, príloha č.1.
  Currently the app only handles §5 (employment). Adding §6 would require Tabuľka 1,
  r.39–r.58, and corresponding NCZD/tax base adjustments.
- **r.134 preddavky (§35 ods.10,11)** - Special advance payments, rarely used by individuals.
- **r.129, r.130, r.132 preddavky** - §43/§44 advances (zabezpečenie dane, preddavky od správcu).
- **r.82–r.89 foreign income** - Exemption / credit for foreign employment income (vyňatie, zápočet).
  Needed if users work abroad.
- **r.91–r.105 §6 tax calculation** - Tax from self-employment, separate from §5 tax.
- **Advance payments calculation** - Quarterly/monthly advance payment estimates for next year
  (based on r.116 tax amount, §34 ods. 8-11).

## XML / Schema

- **druhaOsobaPodalaDPvSR** - r.34 flag: second person filed a tax return in SR. Currently always '0'.
- **datumNarodenia** - hlavička field, currently empty. Could be derived from DIČ/rodné číslo.
- **nerezident fields** - TIN, country codes for non-resident taxpayers.
- **Príloha č.1** - Self-employment income attachment (not applicable without §6 support).

## UI / UX

- **NACE autocomplete** - SK NACE codes could use a searchable dropdown with official code list.
- **Month picker for r.34** - Partner bonus months currently default to "whole year";
  could add individual month toggles matching the children month picker.
- **PDF preview** - Generate a visual PDF matching the official paper form layout.
- **Multi-language** - English UI for expats filing in Slovakia.
- **Mobile optimization** - The wizard works on mobile but could be more touch-friendly.
- **Dark mode** - Respect system preference.

## Data / Import

- **Potvrdenie PDF OCR** - Automatic extraction from scanned/photographed employer certificates
  (currently only works with digital PDFs via the fill-potvrdenie skill).
- **Previous year import** - Carry forward personal info, 2% allocation, and parent allocation
  from last year's XML (partially implemented).
- **CSV multi-broker import** - Support additional broker CSV formats beyond Interactive Brokers.
