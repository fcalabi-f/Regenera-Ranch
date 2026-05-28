// Sincronización local → remoto.
// Flushea sync_outbox a Supabase. Es best-effort; si falla deja la fila para reintentar.
//
// Pendiente (futuro): pull de cambios remotos con last_synced_at + resolución de conflictos.

import NetInfo from '@react-native-community/netinfo';
import { getDb } from './sqlite';
import { supabase } from './supabase';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

let _isSyncing = false;

export async function syncOnce(): Promise<{ pushed: number; failed: number } | null> {
  if (_isSyncing) return null;
  if (!supabase) return null;

  const state = await NetInfo.fetch();
  if (!state.isConnected) return null;

  _isSyncing = true;
  let pushed = 0;
  let failed = 0;
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: number;
      table_name: string;
      row_id: string;
      op: 'insert' | 'update' | 'delete';
      payload_json: string;
      attempts: number;
    }>(
      `SELECT id, table_name, row_id, op, payload_json, attempts
         FROM sync_outbox
        WHERE attempts < ?
        ORDER BY id ASC
        LIMIT ?`,
      [MAX_ATTEMPTS, BATCH_SIZE],
    );

    for (const r of rows) {
      const payload = JSON.parse(r.payload_json);
      try {
        if (r.op === 'insert' || r.op === 'update') {
          const { error } = await supabase
            .from(r.table_name)
            .upsert(payload, { onConflict: 'id' });
          if (error) throw error;
        } else {
          const { error } = await supabase.from(r.table_name).delete().eq('id', r.row_id);
          if (error) throw error;
        }
        await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', [r.id]);
        pushed++;
      } catch (e: unknown) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await db.runAsync(
          'UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?',
          [msg, r.id],
        );
      }
    }
  } finally {
    _isSyncing = false;
  }
  return { pushed, failed };
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM sync_outbox WHERE attempts < ?',
    [MAX_ATTEMPTS],
  );
  return r?.c ?? 0;
}

let _unsubscribe: (() => void) | null = null;

export function startSyncWorker() {
  if (_unsubscribe) return;
  // Cada vez que vuelve la conexión, intenta vaciar la cola.
  _unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncOnce().catch(() => {});
    }
  });
  // Intento inicial.
  syncOnce().catch(() => {});
}

export function stopSyncWorker() {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}
