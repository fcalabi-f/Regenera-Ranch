import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { pickAndParseExcel } from '../services/excel';
import { useCampo } from '../contexts/CampoContext';
import * as DB from '../lib/db';
import { colors, radius, spacing } from '../theme';

export function RecordsScreen() {
  const { activeCampo, potreros, rebanos, refreshPotreros, refreshRebanos } = useCampo();
  const [busy, setBusy] = useState(false);

  const importExcel = async () => {
    if (!activeCampo) return;
    setBusy(true);
    try {
      const res = await pickAndParseExcel();
      if (!res) return;
      if (res.rows.length === 0) {
        Alert.alert('Sin filas', 'No se detectaron filas con datos válidos.');
        return;
      }

      // Resolver/crear potreros y rebaños por nombre.
      const potreroByName = new Map(potreros.map((p) => [p.name.toLowerCase(), p]));
      const rebanoByName = new Map(rebanos.map((r) => [r.name.toLowerCase(), r]));

      let imported = 0;
      let skipped = res.skipped;

      for (const row of res.rows) {
        const pot = potreroByName.get(row.potreroName.toLowerCase());
        if (!pot) {
          // Sin geometría no podemos crear potreros automáticos: los saltamos.
          skipped++;
          continue;
        }
        let rebanoId: string | null = null;
        if (row.rebanoName) {
          let r = rebanoByName.get(row.rebanoName.toLowerCase());
          if (!r) {
            r = await DB.createRebano({
              campo_id: activeCampo.id,
              name: row.rebanoName,
              category: null,
            });
            rebanoByName.set(r.name.toLowerCase(), r);
          }
          rebanoId = r.id;
        }
        await DB.createPastoreo({
          potrero_id: pot.id,
          rebano_id: rebanoId,
          entry_date: row.entry_date,
          exit_date: row.exit_date ?? null,
          days_in_paddock: row.days_in_paddock ?? null,
          animal_count: row.animal_count,
          weight_kg_avg: row.weight_kg_avg ?? null,
          intensity: row.intensity ?? null,
          recommendation: null,
          notes: row.notes ?? null,
          came_from_potrero_id: null,
          went_to_potrero_id: null,
        });
        imported++;
      }
      await refreshPotreros();
      await refreshRebanos();
      Alert.alert(
        'Importación lista',
        `Importados: ${imported}. Saltados: ${skipped}.${
          res.unmappedHeaders.length
            ? `\nColumnas no reconocidas: ${res.unmappedHeaders.join(', ')}`
            : ''
        }`,
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al importar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pastoreos</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Importar planilla Excel</Text>
        <Text style={styles.muted}>
          Formato Savory. Los nombres de potreros deben coincidir con los ya cargados (mismo
          nombre, mayúsculas no importan). Los rebaños nuevos se crean automáticamente.
        </Text>
        <Pressable onPress={importExcel} disabled={busy} style={styles.btn}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Seleccionar archivo .xlsx</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: { fontWeight: '700', fontSize: 18, color: colors.text },
  muted: { color: colors.textMuted },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
