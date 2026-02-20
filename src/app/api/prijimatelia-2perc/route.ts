import { NextRequest } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CSV_PATH = join(process.cwd(), 'data', '2026.01.31_Prijimatel_2perc.csv');
import type { PrijimatelItem } from '@/types/TaxForm';

const MAX_RESULTS = 80;
const SKIP_HEADER_LINES = 3;

let cachedList: PrijimatelItem[] | null = null;

function loadPrijimatelia(): PrijimatelItem[] {
  if (cachedList) return cachedList;
  if (!existsSync(CSV_PATH)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`prijimatelia CSV not found at ${CSV_PATH}`);
    }
    return [];
  }
  const raw = readFileSync(CSV_PATH);
  const decoder = new TextDecoder('windows-1250');
  const text = decoder.decode(raw);
  const lines = text.split(/\r?\n/).slice(SKIP_HEADER_LINES);
  const list: PrijimatelItem[] = [];
  for (const line of lines) {
    const parts = line.split(';');
    const ico = (parts[0] ?? '').trim();
    const obchMeno = (parts[1] ?? '').trim();
    if (ico && obchMeno) list.push({ ico, obchMeno });
  }
  cachedList = list;
  return list;
}

function filterList(list: PrijimatelItem[], q: string): PrijimatelItem[] {
  if (!q || q.length < 2) return list.slice(0, MAX_RESULTS);
  const lower = q.toLowerCase().trim();
  const filtered = list.filter(
    (item) =>
      item.ico.includes(q.trim()) ||
      item.ico.replace(/\s/g, '').toLowerCase().includes(lower.replace(/\s/g, '')) ||
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
