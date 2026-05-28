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
import type { Rebano, MovementKind } from '@regenera/shared';

const MOVEMENT_OPTIONS: { value: MovementKind; label: string; sign: 1 | -1 }[] = [
  { value: 'nacimiento', label: 'Nacimiento', sign: 1 },
  { value: 'compra', label: 'Compra', sign: 1 },
  { value: 'traslado_entrada', label: 'Traslado entrada', sign: 1 },
  { value: 'muerte', label: 'Muerte', sign: -1 },
  { value: 'venta', label: 'Venta', sign: -1 },
  { value: 'traslado_salida', label: 'Traslado salida', sign: -1 },
];

export function HerdsScreen() {
  const { activeCampo, rebanos, refreshRebanos } = useCampo();
  const [newName, setNewName] = useState('');
  const [category, setCategory] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const c: Record<string, number> = {};
      for (const r of rebanos) c[r.id] = await DB.countCabezasRebano(r.id);
      setCounts(c);
    })();
  }, [rebanos]);

  const createRebano = async () => {
    if (!activeCampo || !newName.trim()) return;
    await DB.createRebano({
      campo_id: activeCampo.id,
      name: newName.trim(),
      category: category.trim() || null,
    });
    setNewName('');
    setCategory('');
    await refreshRebanos();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rebaños</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nuevo rebaño</Text>
        <TextInput
          placeholder="Nombre (p. ej. Rebaño A)"
          value={newName}
          onChangeText={setNewName}
          style={styles.input}
        />
        <TextInput
          placeholder="Categoría (vacas, terneros, ovejas...)"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
        />
        <Pressable onPress={createRebano} style={styles.btn} disabled={!newName.trim()}>
          <Text style={styles.btnText}>Crear rebaño</Text>
        </Pressable>
      </View>

      {rebanos.map((r) => (
        <HerdCard
          key={r.id}
          rebano={r}
          headCount={counts[r.id] ?? 0}
          onChanged={async () => {
            setCounts((c) => ({ ...c, [r.id]: 0 })); // optimistic
            setCounts((prev) => ({ ...prev, [r.id]: 0 }));
            const total = await DB.countCabezasRebano(r.id);
            setCounts((prev) => ({ ...prev, [r.id]: total }));
          }}
        />
      ))}
    </ScrollView>
  );
}

function HerdCard({
  rebano,
  headCount,
  onChanged,
}: {
  rebano: Rebano;
  headCount: number;
  onChanged: () => Promise<void>;
}) {
  const [kind, setKind] = useState<MovementKind>('compra');
  const [count, setCount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [customer, setCustomer] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const submit = async () => {
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('Cantidad', 'Ingresá una cantidad válida.');
      return;
    }
    const w = parseFloat(weight);
    const p = parseFloat(price);
    await DB.createMovimiento({
      rebano_id: rebano.id,
      kind,
      count: n,
      date,
      weight_kg_avg: Number.isFinite(w) ? w : null,
      customer_name: kind === 'venta' && customer ? customer : null,
      price_total: kind === 'venta' && Number.isFinite(p) ? p : null,
      notes: notes || null,
    });
    setCount('');
    setWeight('');
    setCustomer('');
    setPrice('');
    setNotes('');
    await onChanged();
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{rebano.name}</Text>
        <Text style={styles.badge}>{headCount} cabezas</Text>
      </View>
      {rebano.category && <Text style={styles.muted}>{rebano.category}</Text>}

      <Text style={styles.muted}>Registrar movimiento</Text>
      <View style={styles.chips}>
        {MOVEMENT_OPTIONS.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setKind(o.value)}
            style={[
              styles.chip,
              kind === o.value && {
                backgroundColor: o.sign > 0 ? colors.success : colors.danger,
                borderColor: 'transparent',
              },
            ]}
          >
            <Text style={[styles.chipText, kind === o.value && { color: '#fff' }]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row2}>
        <TextInput
          placeholder="Cantidad"
          keyboardType="numeric"
          value={count}
          onChangeText={setCount}
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          placeholder="Fecha"
          value={date}
          onChangeText={setDate}
          style={[styles.input, { flex: 1 }]}
        />
      </View>
      <TextInput
        placeholder="Peso promedio (opcional)"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
        style={styles.input}
      />
      {kind === 'venta' && (
        <>
          <TextInput
            placeholder="Cliente"
            value={customer}
            onChangeText={setCustomer}
            style={styles.input}
          />
          <TextInput
            placeholder="Precio total"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
            style={styles.input}
          />
        </>
      )}
      <TextInput
        placeholder="Notas"
        value={notes}
        onChangeText={setNotes}
        style={styles.input}
      />
      <Pressable onPress={submit} style={styles.btnSmall}>
        <Text style={styles.btnText}>Guardar movimiento</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  card: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 18, color: colors.text },
  badge: {
    backgroundColor: colors.primary,
    color: '#fff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: '600',
  },
  muted: { color: colors.textMuted },
  input: {
    backgroundColor: '#fff',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  row2: { flexDirection: 'row', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnSmall: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
