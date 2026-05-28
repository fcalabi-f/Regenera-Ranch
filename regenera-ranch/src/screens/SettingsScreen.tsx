import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCampo } from '../contexts/CampoContext';
import { pendingCount, syncOnce } from '../lib/sync';
import { colors, radius, spacing } from '../theme';

export function SettingsScreen() {
  const { user, signOut, configured } = useAuth();
  const { activeCampo, campos, selectCampo } = useCampo();
  const [pending, setPending] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    pendingCount().then(setPending);
  }, []);

  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await syncOnce();
      if (r) {
        Alert.alert(
          'Sincronización',
          `Subidos: ${r.pushed}. Fallidos: ${r.failed}.`,
        );
        setPending(await pendingCount());
      } else {
        Alert.alert(
          'Sin sincronizar',
          configured ? 'Sin conexión.' : 'Configurá Supabase en .env primero.',
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ajustes</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cuenta</Text>
        <Text>{user?.email}</Text>
        <Pressable onPress={signOut} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sincronización</Text>
        <Text style={styles.muted}>
          {configured
            ? `Cambios pendientes de subir: ${pending ?? '…'}`
            : 'Supabase no está configurado. Editá .env y reiniciá.'}
        </Text>
        <Pressable onPress={doSync} style={styles.btn} disabled={syncing || !configured}>
          <Text style={styles.btnText}>{syncing ? 'Sincronizando…' : 'Sincronizar ahora'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Campos</Text>
        {campos.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => selectCampo(c.id)}
            style={[styles.row, c.id === activeCampo?.id && { backgroundColor: '#F0F7F0' }]}
          >
            <Text style={{ fontWeight: c.id === activeCampo?.id ? '700' : '400' }}>
              {c.name}
            </Text>
            {c.id === activeCampo?.id && <Text style={styles.activeMark}>● activo</Text>}
          </Pressable>
        ))}
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
  cardTitle: { fontWeight: '700', fontSize: 18 },
  muted: { color: colors.textMuted },
  row: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeMark: { color: colors.primary, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSecondary: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.text, fontWeight: '600' },
});
