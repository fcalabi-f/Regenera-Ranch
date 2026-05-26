import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('regenera-ranch.db');
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS campos (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      agricultural_year_start_month INTEGER NOT NULL DEFAULT 7,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS potreros (
      id TEXT PRIMARY KEY,
      campo_id TEXT NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      geometry TEXT NOT NULL, -- GeoJSON JSON
      area_ha REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_potreros_campo ON potreros(campo_id);

    CREATE TABLE IF NOT EXISTS rebanos (
      id TEXT PRIMARY KEY,
      campo_id TEXT NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rebanos_campo ON rebanos(campo_id);

    CREATE TABLE IF NOT EXISTS pastoreos (
      id TEXT PRIMARY KEY,
      potrero_id TEXT NOT NULL REFERENCES potreros(id) ON DELETE CASCADE,
      rebano_id TEXT REFERENCES rebanos(id) ON DELETE SET NULL,
      entry_date TEXT NOT NULL,
      exit_date TEXT,
      days_in_paddock INTEGER,
      animal_count INTEGER NOT NULL,
      weight_kg_avg REAL,
      intensity TEXT,
      recommendation TEXT,
      notes TEXT,
      came_from_potrero_id TEXT,
      went_to_potrero_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pastoreos_potrero ON pastoreos(potrero_id);
    CREATE INDEX IF NOT EXISTS idx_pastoreos_entry_date ON pastoreos(entry_date DESC);

    CREATE TABLE IF NOT EXISTS observaciones (
      id TEXT PRIMARY KEY,
      pastoreo_id TEXT NOT NULL REFERENCES pastoreos(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_uri TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suplementaciones (
      id TEXT PRIMARY KEY,
      pastoreo_id TEXT NOT NULL REFERENCES pastoreos(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      feed_type TEXT NOT NULL,
      amount REAL NOT NULL,
      unit TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS animal_movimientos (
      id TEXT PRIMARY KEY,
      rebano_id TEXT NOT NULL REFERENCES rebanos(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      count INTEGER NOT NULL,
      date TEXT NOT NULL,
      weight_kg_avg REAL,
      customer_name TEXT,
      price_total REAL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manejos (
      id TEXT PRIMARY KEY,
      potrero_id TEXT NOT NULL REFERENCES potreros(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clima_eventos (
      id TEXT PRIMARY KEY,
      campo_id TEXT NOT NULL REFERENCES campos(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      growth_speed TEXT,
      rainfall_mm REAL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collar_pings (
      id TEXT PRIMARY KEY,
      rebano_id TEXT NOT NULL REFERENCES rebanos(id) ON DELETE CASCADE,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      op TEXT NOT NULL CHECK (op IN ('insert','update','delete')),
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function resetDb() {
  if (!_db) return;
  await _db.closeAsync();
  await SQLite.deleteDatabaseAsync('regenera-ranch.db');
  _db = null;
}
