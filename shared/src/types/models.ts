// Modelo de dominio compartido entre SQLite local y Supabase remoto.
// IDs son UUIDs (string). Las fechas se guardan como ISO 8601 string.

export type ID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // ISO 8601

export type Intensity = 'L' | 'M' | 'I'; // Leve | Moderado | Intenso

export type Recommendation =
  | 'saltar_proxima_vuelta'
  | 'pastoreo_leve'
  | 'resembrar'
  | 'regenerar'
  | 'otra';

export type MovementKind =
  | 'nacimiento'
  | 'compra'
  | 'traslado_entrada'
  | 'muerte'
  | 'venta'
  | 'traslado_salida';

export type ManagementKind =
  | 'cosecha_bolos'
  | 'resiembra'
  | 'muestra_suelo'
  | 'otro';

export type WeatherKind =
  | 'lluvia_significativa'
  | 'helada'
  | 'crecimiento_pasto';

export type GrowthSpeed = 'rapido' | 'lento' | 'estancado';

export interface GeoJSONPolygon {
  type: 'Polygon';
  // [ring][point][lng,lat]
  coordinates: number[][][];
}

export interface Campo {
  id: ID;
  owner_user_id: ID;
  name: string;
  agricultural_year_start_month: number; // 1-12
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Potrero {
  id: ID;
  campo_id: ID;
  name: string;
  geometry: GeoJSONPolygon;
  area_ha: number | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Rebano {
  id: ID;
  campo_id: ID;
  name: string;
  category: string | null; // p. ej. "vacas", "terneros", "ovejas"
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Pastoreo {
  id: ID;
  potrero_id: ID;
  rebano_id: ID | null; // puede ser null si se registra animales sueltos
  entry_date: ISODate;
  exit_date: ISODate | null;
  days_in_paddock: number | null;
  animal_count: number;
  weight_kg_avg: number | null;
  intensity: Intensity | null;
  recommendation: Recommendation | null;
  notes: string | null;
  // Flujo de movimiento (de qué potrero vienen, a qué potrero van)
  came_from_potrero_id: ID | null;
  went_to_potrero_id: ID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Observacion {
  id: ID;
  pastoreo_id: ID;
  kind: 'malezas' | 'plagas' | 'otra';
  description: string;
  photo_uri: string | null;
  created_at: ISODateTime;
}

export interface Suplementacion {
  id: ID;
  pastoreo_id: ID;
  date: ISODate;
  feed_type: string; // p. ej. "silo", "heno"
  amount: number;
  unit: string; // p. ej. "bolos", "kg"
  created_at: ISODateTime;
}

export interface AnimalMovimiento {
  id: ID;
  rebano_id: ID;
  kind: MovementKind;
  count: number;
  date: ISODate;
  weight_kg_avg: number | null;
  customer_name: string | null;
  price_total: number | null;
  notes: string | null;
  created_at: ISODateTime;
}

export interface Manejo {
  id: ID;
  potrero_id: ID;
  kind: ManagementKind;
  date: ISODate;
  notes: string | null;
  created_at: ISODateTime;
}

export interface ClimaEvento {
  id: ID;
  campo_id: ID;
  date: ISODate;
  kind: WeatherKind;
  growth_speed: GrowthSpeed | null;
  rainfall_mm: number | null;
  notes: string | null;
  created_at: ISODateTime;
}

export interface CollarPing {
  id: ID;
  rebano_id: ID;
  lat: number;
  lng: number;
  recorded_at: ISODateTime;
  created_at: ISODateTime;
}

// Para la cola de sincronización local → remoto.
export type SyncOp = 'insert' | 'update' | 'delete';
export interface SyncOutboxRow {
  id: number; // autoincrement local
  table_name: string;
  row_id: ID;
  op: SyncOp;
  payload_json: string;
  created_at: ISODateTime;
  attempts: number;
  last_error: string | null;
}
