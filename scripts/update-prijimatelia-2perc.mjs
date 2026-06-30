import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.prijimatelia_2026.html';
const OUTPUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'prijimatelia-2perc-2026.csv');

const HEADER = [
  'ico',
  'obchMeno',
  'pravnaForma',
  'mesto',
  'ulica',
  'supisneCislo',
  'orientacneCislo',
  'psc',
  'stat',
  'iban',
  'kodBanky',
  'nazovBanky',
];

function extractDataArray(html) {
  const marker = 'var data = ';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('Could not find "var data = " in official page');

  const arrayStart = start + marker.length;
  const arrayEnd = html.indexOf('];', arrayStart);
  if (arrayEnd === -1) throw new Error('Could not find end of embedded recipient data array');

  const source = html.slice(arrayStart, arrayEnd + 1);
  const rows = Function(`"use strict"; return ${source};`)();
  if (!Array.isArray(rows)) throw new Error('Embedded recipient data is not an array');
  return rows;
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[;"\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(rows, sourceLastModified) {
  const lines = [
    `# source=${SOURCE_URL}`,
    `# source_last_modified=${sourceLastModified ?? ''}`,
    `# generated_at=${new Date().toISOString()}`,
    HEADER.join(';'),
  ];

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 12) continue;
    const [
      obchMeno,
      ico,
      pravnaForma,
      mesto,
      ulica,
      supisneCislo,
      orientacneCislo,
      psc,
      stat,
      iban,
      kodBanky,
      nazovBanky,
    ] = row;
    lines.push([
      ico,
      obchMeno,
      pravnaForma,
      mesto,
      ulica,
      supisneCislo,
      orientacneCislo,
      psc,
      stat,
      iban,
      kodBanky,
      nazovBanky,
    ].map(csvCell).join(';'));
  }

  return `${lines.join('\n')}\n`;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Failed to fetch ${SOURCE_URL}: HTTP ${response.status}`);

const html = await response.text();
const rows = extractDataArray(html);
if (rows.length < 1) throw new Error('Official page returned zero recipient rows');

const csv = toCsv(rows, response.headers.get('last-modified'));
await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, csv, 'utf8');

console.log(`Wrote ${rows.length} recipients to ${OUTPUT_PATH}`);
