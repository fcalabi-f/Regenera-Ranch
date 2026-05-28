import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useCampo } from '../contexts/CampoContext';
import { colors, radius, spacing } from '../theme';

export function OnboardingCampoScreen() {
  const { createCampo } = useCampo();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCampo(name.trim());
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el campo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Empecemos por tu campo</Text>
      <Text style={styles.sub}>
        Un "campo" es la unidad principal: contiene tus potreros, rebaños y registros.
        Después podés agregar más.
      </Text>
      <TextInput
        placeholder="Nombre del campo (p. ej. La Querencia)"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <Pressable
        onPress={submit}
        disabled={busy || !name.trim()}
        style={({ pressed }) => [
          styles.btn,
          (busy || !name.trim()) && { opacity: 0.5 },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.btnText}>Crear campo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: '700', color: colors.primaryDark, marginTop: spacing.xxl },
  sub: { color: colors.textMuted, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
