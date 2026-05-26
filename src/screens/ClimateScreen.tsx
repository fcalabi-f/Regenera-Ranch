import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useCampo } from '../contexts/CampoContext';
import * as DB from '../lib/db';
import { colors, radius, spacing } from '../theme';
import type { ClimaEvento, GrowthSpeed, WeatherKind } from '../types/models';

const SPEEDS: GrowthSpeed[] = ['rapido', 'lento', 'estancado'];

export function ClimateScreen() {
  const { activeCampo } = useCampo();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [growth, setGrowth] = useState<GrowthSpeed | null>(null);
  const [rain, setRain] = useState('');
  const [frost, setFrost] = useState(false);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<ClimaEvento[]>([]);

  const refresh = async () => {
    if (!activeCampo) return;
    setHistory(await DB.listClimaByCampo(activeCampo.id));
  };

  useEffect(() => {
    refresh();
  }, [activeCampo]);

  const submit = async () => {
    if (!activeCampo) return;
    const events: { kind: WeatherKind; rainfall_mm?: number | null; growth_speed?: GrowthSpeed | null }[] = [];
    if (growth) events.push({ kind: 'crecimiento_pasto', growth_speed: growth });
    const r = parseFloat(rain);
    if (Number.isFinite(r) && r > 0) events.push({ kind: 'lluvia_significativa', rainfall_mm: r });
    if (frost) events.push({ kind: 'helada' });
    if (events.length === 0) {
      Alert.alert('Nada para guardar', 'Indicá al menos un evento.');
      return;
    }
    for (const e of events) {
      await DB.createClimaEvento({
        campo_id: activeCampo.id,
        date,
        kind: e.kind,
        growth_speed: e.growth_speed ?? null,
        rainfall_mm: e.rainfall_mm ?? null,
        notes: notes || null,
      });
    }
    setGrowth(null);
    setRain('');
    setFrost(false);
    setNotes('');
    await refresh();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Clima del campo</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Registro rápido</Text>
        <Text style={styles.muted}>Fecha</Text>
        <TextInput value={date} onChangeText={setDate} style={styles.input} />

        <Text style={styles.muted}>Velocidad de crecimiento del pasto</Text>
        <View style={styles.chips}>
          {SPEEDS.map((s) => (
            <Pressable
              key={s}
              onPress={() => setGrowth(growth === s ? null : s)}
              style={[styles.chip, growth === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, growth === s && styles.chipTextActive]}>
                {s === 'rapido' ? 'Rápido' : s === 'lento' ? 'Lento' : 'Estancado'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.muted}>Lluvia (mm, opcional)</Text>
        <TextInput
          value={rain}
          onChangeText={setRain}
          keyboardType="numeric"
          style={styles.input}
        />

        <Pressable
          onPress={() => setFrost(!frost)}
          style={[styles.chip, frost && styles.chipActive, { alignSelf: 'flex-start' }]}
        >
          <Text style={[styles.chipText, frost && styles.chipTextActive]}>Heladas</Text>
        </Pressable>

        <TextInput
          placeholder="Notas"
          value={notes}
          onChangeText={setNotes}
          style={styles.input}
        />

        <Pressable onPress={submit} style={styles.btn}>
          <Text style={styles.btnText}>Guardar</Text>
        </Pressable>
      </View>

      <Text style={styles.subTitle}>Histórico ({history.length})</Text>
      {history.map((h) => (
        <View key={h.id} style={styles.histRow}>
          <Text style={{ fontWeight: '600' }}>{h.date}</Text>
          <Text style={{ flex: 1, marginLeft: spacing.sm }}>
            {h.kind === 'crecimiento_pasto'
              ? `Crecimiento ${h.growth_speed}`
              : h.kind === 'lluvia_significativa'
              ? `Lluvia ${h.rainfall_mm} mm`
              : 'Helada'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  subTitle: { fontWeight: '700', fontSize: 16, marginTop: spacing.md },
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: { fontWeight: '700', fontSize: 18 },
  muted: { color: colors.textMuted },
  input: {
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  histRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
