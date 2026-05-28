// Parseo puro de planilla Excel formato Savory → registros de pastoreo.
// Sin IO: el caller pasa los bytes del archivo.

import * as XLSX from '@e965/xlsx';
import type { Intensity } from '../types/models';

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  potrero: 'potrero',
  paddock: 'potrero',
  parcela: 'potrero',
  'fecha entrada': 'entry_date',
  'fecha de entrada': 'entry_date',
  entrada: 'entry_date',
  'fecha salida': 'exit_date',
  'fecha de salida': 'exit_date',
  salida: 'exit_date',
  dias: 'days',
  días: 'days',
  cabezas: 'animal_count',
  animales: 'animal_count',
  'numero de animales': 'animal_count',
  'número de animales': 'animal_count',
  peso: 'weight_kg_avg',
  'peso medio': 'weight_kg_avg',
  'peso promedio': 'weight_kg_avg',
  intensidad: 'intensity',
  rebano: 'rebano',
  rebaño: 'rebano',
  observaciones: 'notes',
  notas: 'notes',
};

interface RawRow {
  potrero?: string;
  rebano?: string;
  entry_date?: string;
  exit_date?: string;
  days?: number;
  animal_count?: number;
  weight_kg_avg?: number;
  intensity?: Intensity;
  notes?: string;
}

function normalizeHeader(h: string): keyof RawRow | null {
  const k = h.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  return HEADER_ALIASES[k] ?? null;
}

function parseIntensity(v: unknown): Intensity | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s.startsWith('l')) return 'L';
  if (s.startsWith('m')) return 'M';
  if (s.startsWith('i')) return 'I';
  return undefined;
}

function parseDate(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel epoch (1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

export interface ParsedGrazing {
  potreroName: string;
  rebanoName?: string;
  entry_date: string;
  exit_date?: string;
  days_in_paddock?: number;
  animal_count: number;
  weight_kg_avg?: number;
  intensity?: Intensity;
  notes?: string;
}

export interface ExcelParseResult {
  rows: ParsedGrazing[];
  skipped: number;
  unmappedHeaders: string[];
}

/**
 * Parsea un libro de Excel a registros de pastoreo. `input` puede ser:
 *  - base64 string (typical en mobile vía expo-file-system)
 *  - ArrayBuffer (típico en web)
 *  - Uint8Array
 */
export function parseExcelBuffer(
  input: string | ArrayBuffer | Uint8Array,
  opts: { type?: 'base64' | 'array' | 'buffer' } = {},
): ExcelParseResult {
  const type =
    opts.type ??
    (typeof input === 'string' ? 'base64' : input instanceof ArrayBuffer ? 'array' : 'buffer');
  const wb = XLSX.read(input as never, { type, cellDates: true });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: null,
  });
  if (matrix.length < 2) {
    return { rows: [], skipped: 0, unmappedHeaders: [] };
  }

  const headers = matrix[0].map((h) => (h == null ? '' : String(h)));
  const mapped: (keyof RawRow | null)[] = headers.map(normalizeHeader);
  const unmappedHeaders = headers.filter((_, i) => mapped[i] === null && headers[i] !== '');

  const rows: ParsedGrazing[] = [];
  let skipped = 0;

  for (let i = 1; i < matrix.length; i++) {
    const raw: RawRow = {};
    const r = matrix[i];
    for (let j = 0; j < mapped.length; j++) {
      const key = mapped[j];
      if (!key) continue;
      const val = r[j];
      if (val == null || val === '') continue;
      if (key === 'entry_date' || key === 'exit_date') {
        const d = parseDate(val);
        if (d) raw[key] = d;
      } else if (key === 'days' || key === 'animal_count') {
        const n = Number(val);
        if (!Number.isNaN(n)) raw[key] = n;
      } else if (key === 'weight_kg_avg') {
        const n = Number(val);
        if (!Number.isNaN(n)) raw.weight_kg_avg = n;
      } else if (key === 'intensity') {
        const it = parseIntensity(val);
        if (it) raw.intensity = it;
      } else {
        raw[key] = String(val);
      }
    }

    if (!raw.potrero || !raw.entry_date || raw.animal_count == null) {
      skipped++;
      continue;
    }
    rows.push({
      potreroName: raw.potrero,
      rebanoName: raw.rebano,
      entry_date: raw.entry_date,
      exit_date: raw.exit_date,
      days_in_paddock: raw.days,
      animal_count: raw.animal_count,
      weight_kg_avg: raw.weight_kg_avg,
      intensity: raw.intensity,
      notes: raw.notes,
    });
  }

  return { rows, skipped, unmappedHeaders };
}
