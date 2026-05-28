'use client';

import { useState, useTransition } from 'react';
import { createCampoAction } from '@/app/actions';

export function Onboarding() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.append('name', name);
      const res = await createCampoAction(fd);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--color-primary-dark)]">
          Empecemos por tu campo
        </h1>
        <p className="text-stone-500 mt-2 text-sm">
          Un campo agrupa tus potreros, rebaños y registros. Después podés agregar más.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3 mt-6">
          <input
            type="text"
            required
            placeholder="Nombre del campo (p. ej. La Querencia)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-[var(--color-primary)] text-white py-2 font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {isPending ? '…' : 'Crear campo'}
          </button>
        </form>
      </div>
    </div>
  );
}
