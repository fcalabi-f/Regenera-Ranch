import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import * as DB from '../lib/db';
import { useCampo } from '../contexts/CampoContext';
import { colors, intensityColor, radius, spacing } from '../theme';
import type { Intensity, Recommendation } from '@regenera/shared';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'NewGrazing'>;

const RECOMMENDATIONS: { value: Recommendation; label: string }[] = [
  { value: 'saltar_proxima_vuelta', label: 'Saltar próxima vuelta' },
  { value: 'pastoreo_leve', label: 'Pastoreo leve' },
  { value: 'resembrar', label: 'Resembrar' },
  { value: 'regenerar', label: 'Regenerar' },
  { value: 'otra', label: 'Otra' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function NewGrazingScreen() {
  const { params } = useRoute<Route>();
  const nav = useNavigation();
  const { potreros, rebanos } = useCampo();

  const [potreroId, setPotreroId] = useState<string | undefined>(params?.potreroId);
  const [rebanoId, setRebanoId] = useState<string | undefined>(undefined);
  const [entryDate, setEntryDate] = useState(today());
  const [days, setDays] = useState('1');
  const [animalCount, setAnimalCount] = useState('');
  const [weight, setWeight] = useState('');
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [observationKind, setObservationKind] = useState<'malezas' | 'plagas' | 'otra' | null>(null);
  const [observationText, setObservationText] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Si vino un rebano predefinido (uno solo), preseleccionarlo.
    if (rebanos.length === 1 && !rebanoId) setRebanoId(rebanos[0].id);
  }, [rebanos, rebanoId]);

  const submit = async () => {
    if (!potreroId) {
      Alert.alert('Falta potrero', 'Seleccioná un potrero.');
      return;
    }
    const n = parseInt(animalCount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Animales', 'Ingresá la cantidad de animales.');
      return;
    }
    setBusy(true);
    try {
      const daysN = parseInt(days, 10);
      const w = parseFloat(weight);
      const pastoreo = await DB.createPastoreo({
        potrero_id: potreroId,
        rebano_id: rebanoId ?? null,
        entry_date: entryDate,
        exit_date: null,
        days_in_paddock: Number.isFinite(daysN) ? daysN : null,
        animal_count: n,
        weight_kg_avg: Number.isFinite(w) ? w : null,
        intensity,
        recommendation,
        notes: notes || null,
        came_from_potrero_id: null,
        went_to_potrero_id: null,
      });

      if (observationText.trim() && observationKind) {
        await DB.createObservacion({
          pastoreo_id: pastoreo.id,
          kind: observationKind,
          description: observationText.trim(),
          photo_uri: null,
        });
      }
      nav.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Potrero</Text>
      <View style={styles.chips}>
        {potreros.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setPotreroId(p.id)}
            style={[styles.chip, potreroId === p.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, potreroId === p.id && styles.chipTextActive]}>
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {rebanos.length > 0 && (
        <>
          <Text style={styles.label}>Rebaño (opcional)</Text>
          <View style={styles.chips}>
            <Pressable
              onPress={() => setRebanoId(undefined)}
              style={[styles.chip, !rebanoId && styles.chipActive]}
            >
              <Text style={[styles.chipText, !rebanoId && styles.chipTextActive]}>—</Text>
            </Pressable>
            {rebanos.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setRebanoId(r.id)}
                style={[styles.chip, rebanoId === r.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, rebanoId === r.id && styles.chipTextActive]}>
                  {r.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Fecha de entrada (YYYY-MM-DD)</Text>
      <TextInput value={entryDate} onChangeText={setEntryDate} style={styles.input} />

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Días en potrero</Text>
          <TextInput
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Cantidad de animales</Text>
          <TextInput
            value={animalCount}
            onChangeText={setAnimalCount}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
      </View>

      <Text style={styles.label}>Peso promedio (kg)</Text>
      <TextInput
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
        placeholder="Opcional"
        style={styles.input}
      />

      <Text style={styles.label}>Intensidad</Text>
      <View style={styles.chips}>
        {(['L', 'M', 'I'] as Intensity[]).map((i) => (
          <Pressable
            key={i}
            onPress={() => setIntensity(intensity === i ? null : i)}
            style={[
              styles.chip,
              intensity === i && { backgroundColor: intensityColor(i), borderColor: intensityColor(i) },
            ]}
          >
            <Text style={[styles.chipText, intensity === i && { color: '#fff' }]}>
              {i === 'L' ? 'Leve' : i === 'M' ? 'Moderado' : 'Intenso'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Recomendación</Text>
      <View style={styles.chips}>
        {RECOMMENDATIONS.map((r) => (
          <Pressable
            key={r.value}
            onPress={() => setRecommendation(recommendation === r.value ? null : r.value)}
            style={[styles.chip, recommendation === r.value && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, recommendation === r.value && styles.chipTextActive]}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Observación</Text>
      <View style={styles.chips}>
        {(['malezas', 'plagas', 'otra'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setObservationKind(observationKind === k ? null : k)}
            style={[styles.chip, observationKind === k && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, observationKind === k && styles.chipTextActive]}
            >
              {k}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={observationText}
        onChangeText={setObservationText}
        placeholder="Descripción de la observación"
        multiline
        style={[styles.input, { minHeight: 60 }]}
      />

      <Text style={styles.label}>Notas</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        style={[styles.input, { minHeight: 60 }]}
      />

      <Pressable
        onPress={submit}
        disabled={busy}
        style={({ pressed }) => [
          styles.btn,
          busy && { opacity: 0.5 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.btnText}>Guardar pastoreo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  label: { color: colors.textMuted, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
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
    marginTop: spacing.lg,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
