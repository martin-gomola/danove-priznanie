# Daňové priznanie DPFO typ B (2025)

A web app that helps you file the Slovak personal income tax return (DPFO typ B) for 2025. You fill out a step-by-step form, and the app generates an XML file you upload at [financnasprava.sk](https://www.financnasprava.sk/sk/elektronicke-sluzby/koncove-sluzby/podanie-dp-dpfo-szco-typb).

---

## Why This Exists

If you have a regular job in Slovakia and invest on the side (foreign dividends through a broker, maybe some mutual funds), you need to file DPFO typ B instead of the simpler typ A. The official form has 12+ pages, cross-references between sections, and no guidance on what applies to you.

This app covers that specific case: **employed person with investment income.** You enter a few values from your employer's annual confirmation, add your dividend/fund data, and get a valid XML file ready to upload. Nothing more, nothing less.

It does not handle self-employment (SZCO), rental income, crypto, or other complex scenarios. If you are self-employed with flat-rate expenses, check out [priznanie.digital](https://github.com/slovensko-digital/priznanie-digital) by Slovensko.Digital it covers that use case well.

---

## Quick Start

```bash
npm install
make dev
```

Open [http://localhost:3015](http://localhost:3015).

---

## What You Can Do

| Step | What you enter |
|------|----------------|
| Osobné údaje | Personal data (name, birth number, address) |
| Deti | Children, spouse, bonuses |
| Hypoteka | Mortgage interest deduction (§33a) |
| Zamestnanie | Employment income (§5) - or use AI to fill from your employer's PDF |
| Fondy | Mutual fund sales (§7) |
| Dividendy | Foreign dividends (§51e) - USD, EUR, CZK with automatic conversion |
| 2% dane | Tax allocation to NGOs (§50) |
| Súhrn | Review and export XML |

**Import and export:** XML export matches the official XSD schema. You can also import a previously exported XML to resume or edit your return.

---

## Features

- **Exact arithmetic** : `decimal.js` for tax-safe calculations
- **Multi-currency dividends** : USD, EUR, CZK; auto-conversion to EUR using reference rates
- **Legal basis** : Calculations follow [DPFO typ B 2025](https://www.financnasprava.sk/sk/elektronicke-sluzby/koncove-sluzby/podanie-dp-dpfo-szco-typb) and [Zákon č. 595/2003 Z.z.](https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/)
- **Tests** : `npm test` runs vitest for the tax calculator and XML parser

---

## AI-Assisted Form Filling

If you use **Cursor**, **Claude Code**, or **Codex**, you can have the agent read your employer's "Potvrdenie o zdaniteľných príjmoch" (annual income confirmation) and fill the employment section automatically.

**How it works:** The app exposes a local API (`POST /api/form`). The agent reads your PDF locally, extracts the values, and sends them to the app. No API keys. No data leaves your machine.

- **Cursor** : Use the skill at `.cursor/skills/fill-potvrdenie/SKILL.md`. Ask:
  ```
  Fill the employment section from this PDF: ~/Documents/potvrdenie-2025.pdf
  ```
- **Claude Code / Codex** : Give the agent the PDF path and the curl command from the [developer docs](http://localhost:3015/developer).

Full API reference and field mapping: [localhost:3015/developer](http://localhost:3015/developer).

---

## Deploy (Docker)

**From the app repo:**
```bash
git pull && make deploy
```
Runs on port 3015.

**On homelab-services** clone this repo as `dane-priznanie/`, then:
```bash
cd dane-priznanie
cp .env.example .env
docker-compose up -d --build
```
Compose uses `env_file: .env`, port from `SERVICE_PORT`, healthcheck, and logging. See `make help` for targets.

---

## Tech Stack

Next.js 16 (App Router), React, Tailwind CSS, `decimal.js`, `xml-js`. See [package.json](package.json) for versions.

---

## Credits

XML output is validated against the official [dpfo_b2025.xsd](https://ekr.financnasprava.sk/Formulare/XSD/dpfo_b2025.xsd) schema published by financnasprava.sk. The JSON-to-XML template, field mapping, and tax calculations are implemented independently.

Inspired by [slovensko-digital/priznanie-digital](https://github.com/slovensko-digital/priznanie-digital) which covers the self-employed (SZCO) use case.

---

## Disclaimer

This application is provided as-is for informational purposes. Always verify your tax return against the [official form](https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html) and consult a tax advisor if needed. The authors are not responsible for any errors in the generated tax return.

---

## License

MIT - see [LICENSE](LICENSE).
