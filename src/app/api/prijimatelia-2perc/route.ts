import { NextRequest } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PrijimatelItem } from '@/types/TaxForm';

// Source: https://pfseform.financnasprava.sk/Formulare/eFormVzor/DP/form.621.prijimatelia_2026.html
// Refresh with: npm run update:prijimatelia
const CSV_PATH = join(process.cwd(), 'data', 'prijimatelia-2perc-2026.csv');
const LEGACY_CSV_PATH = join(process.cwd(), 'data', '2026.01.31_Prijimatel_2perc.csv');
const MAX_RESULTS = 80;

let cachedList: PrijimatelItem[] | null = null;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ';' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseOfficialCsv(text: string): PrijimatelItem[] {
  const lines = text.split(/\r?\n/).filter((line) => line && !line.startsWith('#'));
  const header = lines.shift()?.split(';') ?? [];
  const icoIndex = header.indexOf('ico');
  const nameIndex = header.indexOf('obchMeno');
  if (icoIndex === -1 || nameIndex === -1) return [];

  return lines.flatMap((line) => {
    const parts = parseCsvLine(line);
    const ico = (parts[icoIndex] ?? '').trim();
    const obchMeno = (parts[nameIndex] ?? '').trim();
    return ico && obchMeno ? [{ ico, obchMeno }] : [];
  });
}

function parseLegacyCsv(raw: Buffer): PrijimatelItem[] {
  const decoder = new TextDecoder('windows-1250');
  const text = decoder.decode(raw);
  const lines = text.split(/\r?\n/).slice(3);
  const list: PrijimatelItem[] = [];
  for (const line of lines) {
    const parts = line.split(';');
    const ico = (parts[0] ?? '').trim();
    const obchMeno = (parts[1] ?? '').trim();
    if (ico && obchMeno) list.push({ ico, obchMeno });
  }
  return list;
}

function loadPrijimatelia(): PrijimatelItem[] {
  if (cachedList) return cachedList;
  if (existsSync(CSV_PATH)) {
    cachedList = parseOfficialCsv(readFileSync(CSV_PATH, 'utf8'));
    return cachedList;
  }
  if (existsSync(LEGACY_CSV_PATH)) {
    cachedList = parseLegacyCsv(readFileSync(LEGACY_CSV_PATH));
    return cachedList;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`prijimatelia CSV not found at ${CSV_PATH}`);
  }
  cachedList = [];
  return cachedList;
}

function filterList(list: PrijimatelItem[], q: string): PrijimatelItem[] {
  if (!q || q.length < 2) return list.slice(0, MAX_RESULTS);
  const lower = q.toLowerCase().trim();
  const normalizedIco = lower.replace(/\s/g, '');
  const filtered = list.filter(
    (item) =>
      item.ico.includes(q.trim()) ||
      item.ico.replace(/\s/g, '').toLowerCase().includes(normalizedIco) ||
      item.obchMeno.toLowerCase().includes(lower)
  );
  return filtered.slice(0, MAX_RESULTS);
}

export async function GET(request: NextRequest) {
  try {
    const list = loadPrijimatelia();
    const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 200);
    const results = filterList(list, q);
    return Response.json(results);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('prijimatelia-2perc API error:', e);
    }
    return Response.json([], { status: 500 });
  }
}
