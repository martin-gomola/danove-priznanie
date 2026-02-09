# Daňové priznanie DPFO typ B (2025)

Web application for filing the Slovak personal income tax return (DPFO typ B) for the 2025 tax year.

Built with Next.js, React, and Tailwind CSS. Generates an XML file that you upload when filing electronically via [financnasprava.sk](https://www.financnasprava.sk/sk/elektronicke-sluzby/koncove-sluzby/podanie-dp-dpfo-szco-typb).

## Features

- Step-by-step wizard for filling out the tax return
- Employment income (§5), foreign dividends (§51e), mutual fund sales (§7), mortgage interest deduction (§33a), 2%/3% tax allocation (§50)
- Exact financial arithmetic using `decimal.js`
- XML export matching the official XSD schema
- All calculations follow the official form: [DPFO typ B 2025](https://www.financnasprava.sk/sk/elektronicke-sluzby/koncove-sluzby/podanie-dp-dpfo-szco-typb)
- Legal references to [Zákon č. 595/2003 Z.z.](https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2003/595/) (Slovak Income Tax Act)

## Acknowledgements

This project uses the **XML output structure and XSD schema mapping** from [slovensko-digital/priznanie-digital](https://github.com/slovensko-digital/priznanie-digital) as a reference for generating valid XML output. Specifically:

- The JSON-to-XML output template (`src/lib/xml/outputBasis.ts`) is based on their output basis structure
- The XML field naming conventions follow their established mapping to the official financnasprava.sk schema

The tax calculation engine, UI, and wizard flow are implemented independently.

## Getting Started

```bash
npm install
make dev
```

Open [http://localhost:3015](http://localhost:3015) in your browser.

## Deploy (Docker)

**From app repo:** `git pull && make deploy` — builds and runs on port 3015.

**On homelab-services server** (same layout as [homelab-services](https://github.com/martin-gomola/pi-commander)): clone this repo as `dane-priznanie/` in your homelab tree, then:
```bash
cd dane-priznanie
cp .env.example .env
docker-compose up -d --build
```
Compose follows homelab-services structure: `env_file: .env`, port from env (`SERVICE_PORT`), healthcheck, logging, security. See `make help` for targets.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [decimal.js](https://github.com/MikeMcl/decimal.js) for financial arithmetic
- [xml-js](https://github.com/niclasvh/xml-js) for XML generation

## Disclaimer

This application is provided as-is for informational purposes. Always verify your tax return against the [official form](https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.html)and consult a tax advisor if needed. The authors are not responsible for any errors in the generated tax return.

## License

MIT — see [LICENSE](LICENSE).
