import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, radius, spacing } from '../theme';

export function LoginScreen() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);
    if (err) setError(err);
    else if (mode === 'signup') setError('Revisá tu correo para confirmar la cuenta.');
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Regenera Ranch</Text>
        <Text style={styles.subtitle}>Pastoreo regenerativo en tu bolsillo</Text>

        {!configured && (
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>Configurá Supabase</Text>
            <Text style={styles.warningText}>
              Creá un proyecto en supabase.com, copiá la URL y la anon key en un archivo
              `.env` (ver `.env.example`), y reiniciá la app.
            </Text>
          </View>
        )}

        <TextInput
          placeholder="Correo electrónico"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy || !configured}
          style={({ pressed }) => [
            styles.btn,
            (busy || !configured) && { opacity: 0.5 },
            pressed && { opacity: 0.7 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.link}>
            {mode === 'signin'
              ? '¿No tenés cuenta? Registrate'
              : '¿Ya tenés cuenta? Ingresá'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: spacing.xxl * 2, gap: spacing.md },
  title: { fontSize: 32, fontWeight: '700', color: colors.primaryDark },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.xl },
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
  link: { color: colors.primaryDark, textAlign: 'center', marginTop: spacing.lg },
  error: { color: colors.danger },
  warning: {
    backgroundColor: '#FFF7E0',
    borderColor: '#E0B85B',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningTitle: { fontWeight: '600', marginBottom: spacing.xs },
  warningText: { color: colors.textMuted },
});
