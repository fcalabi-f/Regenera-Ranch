'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { createCampoAction } from '@/app/actions';
import { setActiveCampoCookie } from '@/lib/activeCampo';

interface Props {
  onClose: () => void;
}

export function NewCampoModal({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('name', name);
      const res = await createCampoAction(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.id) {
        // Activar el nuevo campo automáticamente.
        setActiveCampoCookie(res.id);
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-700"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-[var(--color-primary-dark)]">
          Nuevo campo
        </h2>
        <p className="text-stone-500 text-sm mt-1">
          Un campo agrupa potreros, rebaños y registros.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3 mt-5">
          <input
            type="text"
            required
            autoFocus
            placeholder="Nombre del campo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3 py-2 rounded-lg border border-stone-300 text-sm hover:bg-stone-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {isPending ? '…' : 'Crear campo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
