import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DB from '../lib/db';
import {
  comparePaddockSeasons,
  calendarYearWindow,
  agriculturalYearWindow,
  daysSinceLastGrazing,
  type SeasonComparison,
  type Potrero,
  type Pastoreo,
} from '@regenera/shared';
import { colors, intensityColor, radius, spacing } from '../theme';
import { useCampo } from '../contexts/CampoContext';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'PaddockDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PaddockDetailScreen() {
  const { params } = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { activeCampo, potreros } = useCampo();
  const [potrero, setPotrero] = useState<Potrero | null>(null);
  const [pastoreos, setPastoreos] = useState<Pastoreo[] | null>(null);
  const [last, setLast] = useState<Pastoreo | null>(null);

  useEffect(() => {
    (async () => {
      const p = await DB.getPotrero(params.potreroId);
      setPotrero(p);
      const list = await DB.listPastoreosByPotrero(params.potreroId);
      setPastoreos(list);
      setLast(list[0] ?? null);
    })();
  }, [params.potreroId]);

  const window = useMemo(() => {
    const startMonth = activeCampo?.agricultural_year_start_month ?? 7;
    return startMonth === 1 ? calendarYearWindow() : agriculturalYearWindow(startMonth);
  }, [activeCampo]);

  const comparison: SeasonComparison | null = useMemo(() => {
    if (!pastoreos) return null;
    return comparePaddockSeasons(pastoreos, window);
  }, [pastoreos, window]);

  if (!potrero || !pastoreos || !comparison) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const days = daysSinceLastGrazing(last);
  const flowFrom = last?.came_from_potrero_id
    ? potreros.find((p) => p.id === last.came_from_potrero_id)
    : null;
  const flowTo = last?.went_to_potrero_id
    ? potreros.find((p) => p.id === last.went_to_potrero_id)
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={styles.name}>{potrero.name}</Text>
        {potrero.area_ha != null && (
          <Text style={styles.sub}>{potrero.area_ha.toFixed(2)} ha</Text>
        )}
      </View>

      {/* Tarjeta principal */}
      <View style={styles.card}>
        <Stat label="Días de rezago" value={days != null ? `${days} d` : '—'} />
        <Stat
          label="Última intensidad"
          value={last?.intensity ?? '—'}
          tint={intensityColor(last?.intensity ?? null)}
        />
        {last && (
          <>
            <Stat
              label="Último pastoreo"
              value={`${last.animal_count} animales · ${
                last.days_in_paddock ?? '?'
              } d`}
            />
            <Stat
              label="Fecha"
              value={`${last.entry_date}${last.exit_date ? ` → ${last.exit_date}` : ''}`}
            />
          </>
        )}
        {(flowFrom || flowTo) && (
          <Text style={styles.flow}>
            {flowFrom ? `↗ desde ${flowFrom.name}` : ''}{' '}
            {flowTo ? `→ hacia ${flowTo.name}` : ''}
          </Text>
        )}
      </View>

      {/* Análisis histórico */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Temporada {comparison.current.window.label}
        </Text>
        <Stat
          label="Unidades animal · día"
          value={comparison.current.animal_days.toLocaleString()}
        />
        {comparison.current.dm_kg_estimate != null && (
          <Stat
            label="MS consumida (estim.)"
            value={`${comparison.current.dm_kg_estimate.toLocaleString()} kg`}
          />
        )}
        <Stat label="N° pastoreos" value={String(comparison.current.pastoreo_count)} />

        <Text style={styles.cardSubtitle}>Secuencia</Text>
        <View style={styles.sequence}>
          {comparison.current.intensity_sequence.length === 0 ? (
            <Text style={styles.muted}>Sin pastoreos en la temporada.</Text>
          ) : (
            comparison.current.intensity_sequence.map((i, idx) => (
              <View
                key={idx}
                style={[styles.intensityChip, { backgroundColor: intensityColor(i) }]}
              >
                <Text style={styles.intensityChipText}>{i}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.cardSubtitle}>vs. {comparison.previous.window.label}</Text>
        <Stat
          label="Cambio en raciones"
          value={
            comparison.animal_days_change_pct == null
              ? '—'
              : `${comparison.animal_days_change_pct.toFixed(0)}%`
          }
        />
        <Stat
          label="Tendencia"
          value={
            comparison.productivity_trend === 'mas_productivo'
              ? 'Más productivo'
              : comparison.productivity_trend === 'menos_productivo'
              ? 'Menos productivo'
              : comparison.productivity_trend === 'similar'
              ? 'Similar'
              : 'Sin datos'
          }
        />
      </View>

      <Pressable
        style={styles.primaryBtn}
        onPress={() => nav.navigate('NewGrazing', { potreroId: potrero.id })}
      >
        <Text style={styles.primaryBtnText}>＋ Registrar pastoreo</Text>
      </Pressable>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: string;
  tint?: string;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.lg, paddingTop: spacing.xl },
  name: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  sub: { color: colors.textMuted },
  card: {
    backgroundColor: colors.card,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  cardSubtitle: { fontWeight: '600', marginTop: spacing.md, color: colors.text },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { color: colors.textMuted },
  statValue: { fontWeight: '600', color: colors.text },
  flow: { marginTop: spacing.sm, color: colors.textMuted },
  sequence: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  intensityChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  intensityChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  muted: { color: colors.textMuted },
  primaryBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
