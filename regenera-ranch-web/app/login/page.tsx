'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error: err } = await fn;
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    if (mode === 'signup') {
      setError('Revisá tu correo para confirmar la cuenta y después ingresá.');
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">
          Regenera Ranch
        </h1>
        <p className="text-stone-500 mb-6 text-sm">
          Panel de control para pastoreo regenerativo.
        </p>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Falta configurar Supabase en <code>.env</code>.
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          />
          <input
            type="password"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured}
            className="rounded-lg bg-[var(--color-primary)] text-white py-2 font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {busy ? '…' : mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 text-sm text-stone-600 hover:underline w-full text-center"
        >
          {mode === 'signin'
            ? '¿No tenés cuenta? Registrate'
            : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>
    </div>
  );
}
