// CRUD de alto nivel sobre SQLite local, con enqueue automático en sync_outbox.
// Toda la app debería usar estos métodos y nunca SQL directo.

import * as Crypto from 'expo-crypto';
import { getDb } from './sqlite';
import type {
  Campo,
  Potrero,
  Rebano,
  Pastoreo,
  Observacion,
  Suplementacion,
  AnimalMovimiento,
  Manejo,
  ClimaEvento,
  SyncOp,
  GeoJSONPolygon,
} from '@regenera/shared';

const now = () => new Date().toISOString();
export const uuid = () => Crypto.randomUUID();

async function enqueue(table: string, rowId: string, op: SyncOp, payload: unknown) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO sync_outbox (table_name, row_id, op, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
    [table, rowId, op, JSON.stringify(payload), now()],
  );
}

// ---------- campos ----------
export async function listCampos(userId: string): Promise<Campo[]> {
  const db = await getDb();
  return db.getAllAsync<Campo>(
    'SELECT * FROM campos WHERE owner_user_id = ? ORDER BY created_at ASC',
    [userId],
  );
}

export async function createCampo(
  data: Pick<Campo, 'owner_user_id' | 'name'> & {
    agricultural_year_start_month?: number;
  },
): Promise<Campo> {
  const db = await getDb();
  const row: Campo = {
    id: uuid(),
    owner_user_id: data.owner_user_id,
    name: data.name,
    agricultural_year_start_month: data.agricultural_year_start_month ?? 7,
    created_at: now(),
    updated_at: now(),
  };
  await db.runAsync(
    `INSERT INTO campos (id, owner_user_id, name, agricultural_year_start_month, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.owner_user_id,
      row.name,
      row.agricultural_year_start_month,
      row.created_at,
      row.updated_at,
    ],
  );
  await enqueue('campos', row.id, 'insert', row);
  return row;
}

// ---------- potreros ----------
export async function listPotreros(campoId: string): Promise<Potrero[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Omit<Potrero, 'geometry'> & { geometry: string }>(
    'SELECT * FROM potreros WHERE campo_id = ? ORDER BY name ASC',
    [campoId],
  );
  return rows.map((r) => ({ ...r, geometry: JSON.parse(r.geometry) as GeoJSONPolygon }));
}

export async function getPotrero(id: string): Promise<Potrero | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<Omit<Potrero, 'geometry'> & { geometry: string }>(
    'SELECT * FROM potreros WHERE id = ?',
    [id],
  );
  return r ? { ...r, geometry: JSON.parse(r.geometry) as GeoJSONPolygon } : null;
}

export async function createPotrero(
  data: Omit<Potrero, 'id' | 'created_at' | 'updated_at'>,
): Promise<Potrero> {
  const db = await getDb();
  const row: Potrero = { ...data, id: uuid(), created_at: now(), updated_at: now() };
  await db.runAsync(
    `INSERT INTO potreros (id, campo_id, name, geometry, area_ha, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.campo_id,
      row.name,
      JSON.stringify(row.geometry),
      row.area_ha,
      row.created_at,
      row.updated_at,
    ],
  );
  await enqueue('potreros', row.id, 'insert', row);
  return row;
}

export async function bulkCreatePotreros(
  rows: Array<Omit<Potrero, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Potrero[]> {
  // Una transacción por todos los polígonos importados desde un KMZ.
  const db = await getDb();
  const inserted: Potrero[] = [];
  await db.withTransactionAsync(async () => {
    for (const data of rows) {
      const row: Potrero = { ...data, id: uuid(), created_at: now(), updated_at: now() };
      await db.runAsync(
        `INSERT INTO potreros (id, campo_id, name, geometry, area_ha, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id,
          row.campo_id,
          row.name,
          JSON.stringify(row.geometry),
          row.area_ha,
          row.created_at,
          row.updated_at,
        ],
      );
      await db.runAsync(
        'INSERT INTO sync_outbox (table_name, row_id, op, payload_json, created_at) VALUES (?, ?, ?, ?, ?)',
        ['potreros', row.id, 'insert', JSON.stringify(row), now()],
      );
      inserted.push(row);
    }
  });
  return inserted;
}

// ---------- rebaños ----------
export async function listRebanos(campoId: string): Promise<Rebano[]> {
  const db = await getDb();
  return db.getAllAsync<Rebano>(
    'SELECT * FROM rebanos WHERE campo_id = ? ORDER BY name ASC',
    [campoId],
  );
}

export async function createRebano(
  data: Omit<Rebano, 'id' | 'created_at' | 'updated_at'>,
): Promise<Rebano> {
  const db = await getDb();
  const row: Rebano = { ...data, id: uuid(), created_at: now(), updated_at: now() };
  await db.runAsync(
    `INSERT INTO rebanos (id, campo_id, name, category, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [row.id, row.campo_id, row.name, row.category, row.created_at, row.updated_at],
  );
  await enqueue('rebanos', row.id, 'insert', row);
  return row;
}

// ---------- pastoreos ----------
export async function listPastoreosByPotrero(
  potreroId: string,
  opts: { from?: string; to?: string } = {},
): Promise<Pastoreo[]> {
  const db = await getDb();
  const params: (string | number)[] = [potreroId];
  let sql = 'SELECT * FROM pastoreos WHERE potrero_id = ?';
  if (opts.from) {
    sql += ' AND entry_date >= ?';
    params.push(opts.from);
  }
  if (opts.to) {
    sql += ' AND entry_date <= ?';
    params.push(opts.to);
  }
  sql += ' ORDER BY entry_date DESC';
  return db.getAllAsync<Pastoreo>(sql, params);
}

export async function getLastPastoreo(potreroId: string): Promise<Pastoreo | null> {
  const db = await getDb();
  return db.getFirstAsync<Pastoreo>(
    'SELECT * FROM pastoreos WHERE potrero_id = ? ORDER BY entry_date DESC LIMIT 1',
    [potreroId],
  );
}

export async function createPastoreo(
  data: Omit<Pastoreo, 'id' | 'created_at' | 'updated_at'>,
): Promise<Pastoreo> {
  const db = await getDb();
  const row: Pastoreo = { ...data, id: uuid(), created_at: now(), updated_at: now() };
  await db.runAsync(
    `INSERT INTO pastoreos (
        id, potrero_id, rebano_id, entry_date, exit_date, days_in_paddock,
        animal_count, weight_kg_avg, intensity, recommendation, notes,
        came_from_potrero_id, went_to_potrero_id, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id,
      row.potrero_id,
      row.rebano_id,
      row.entry_date,
      row.exit_date,
      row.days_in_paddock,
      row.animal_count,
      row.weight_kg_avg,
      row.intensity,
      row.recommendation,
      row.notes,
      row.came_from_potrero_id,
      row.went_to_potrero_id,
      row.created_at,
      row.updated_at,
    ],
  );
  await enqueue('pastoreos', row.id, 'insert', row);
  return row;
}

// ---------- observaciones / suplementaciones ----------
export async function createObservacion(
  data: Omit<Observacion, 'id' | 'created_at'>,
): Promise<Observacion> {
  const db = await getDb();
  const row: Observacion = { ...data, id: uuid(), created_at: now() };
  await db.runAsync(
    `INSERT INTO observaciones (id, pastoreo_id, kind, description, photo_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [row.id, row.pastoreo_id, row.kind, row.description, row.photo_uri, row.created_at],
  );
  await enqueue('observaciones', row.id, 'insert', row);
  return row;
}

export async function createSuplementacion(
  data: Omit<Suplementacion, 'id' | 'created_at'>,
): Promise<Suplementacion> {
  const db = await getDb();
  const row: Suplementacion = { ...data, id: uuid(), created_at: now() };
  await db.runAsync(
    `INSERT INTO suplementaciones (id, pastoreo_id, date, feed_type, amount, unit, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.pastoreo_id, row.date, row.feed_type, row.amount, row.unit, row.created_at],
  );
  await enqueue('suplementaciones', row.id, 'insert', row);
  return row;
}

// ---------- animal_movimientos ----------
export async function createMovimiento(
  data: Omit<AnimalMovimiento, 'id' | 'created_at'>,
): Promise<AnimalMovimiento> {
  const db = await getDb();
  const row: AnimalMovimiento = { ...data, id: uuid(), created_at: now() };
  await db.runAsync(
    `INSERT INTO animal_movimientos (
       id, rebano_id, kind, count, date, weight_kg_avg, customer_name, price_total, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.rebano_id,
      row.kind,
      row.count,
      row.date,
      row.weight_kg_avg,
      row.customer_name,
      row.price_total,
      row.notes,
      row.created_at,
    ],
  );
  await enqueue('animal_movimientos', row.id, 'insert', row);
  return row;
}

export async function listMovimientos(rebanoId: string): Promise<AnimalMovimiento[]> {
  const db = await getDb();
  return db.getAllAsync<AnimalMovimiento>(
    'SELECT * FROM animal_movimientos WHERE rebano_id = ? ORDER BY date DESC',
    [rebanoId],
  );
}

export async function countCabezasRebano(rebanoId: string): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(CASE
        WHEN kind IN ('nacimiento','compra','traslado_entrada') THEN count
        WHEN kind IN ('muerte','venta','traslado_salida') THEN -count
        ELSE 0 END), 0) AS total
     FROM animal_movimientos WHERE rebano_id = ?`,
    [rebanoId],
  );
  return r?.total ?? 0;
}

// ---------- manejos ----------
export async function createManejo(
  data: Omit<Manejo, 'id' | 'created_at'>,
): Promise<Manejo> {
  const db = await getDb();
  const row: Manejo = { ...data, id: uuid(), created_at: now() };
  await db.runAsync(
    `INSERT INTO manejos (id, potrero_id, kind, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [row.id, row.potrero_id, row.kind, row.date, row.notes, row.created_at],
  );
  await enqueue('manejos', row.id, 'insert', row);
  return row;
}

// ---------- clima ----------
export async function createClimaEvento(
  data: Omit<ClimaEvento, 'id' | 'created_at'>,
): Promise<ClimaEvento> {
  const db = await getDb();
  const row: ClimaEvento = { ...data, id: uuid(), created_at: now() };
  await db.runAsync(
    `INSERT INTO clima_eventos (id, campo_id, date, kind, growth_speed, rainfall_mm, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.campo_id,
      row.date,
      row.kind,
      row.growth_speed,
      row.rainfall_mm,
      row.notes,
      row.created_at,
    ],
  );
  await enqueue('clima_eventos', row.id, 'insert', row);
  return row;
}

export async function listClimaByCampo(campoId: string): Promise<ClimaEvento[]> {
  const db = await getDb();
  return db.getAllAsync<ClimaEvento>(
    'SELECT * FROM clima_eventos WHERE campo_id = ? ORDER BY date DESC',
    [campoId],
  );
}
