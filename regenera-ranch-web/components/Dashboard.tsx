'use client';

import { useCallback, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Upload, LogOut, MapPin, Trash2, Plus } from 'lucide-react';
import { NewCampoModal } from './NewCampoModal';
import { parseKmzBuffer, parseKmlString } from '@regenera/shared';
import type { Campo, Potrero } from '@regenera/shared';
import {
  signOutAction,
  bulkInsertPotrerosAction,
  deletePotreroAction,
  deleteAllPotrerosAction,
} from '@/app/actions';
import { setActiveCampoCookie } from '@/lib/activeCampo';

// Leaflet necesita window, así que cargamos el mapa solo del lado del cliente.
const PaddockMap = dynamic(() => import('./PaddockMap'), { ssr: false });

interface Props {
  user: { id: string; email: string };
  campos: Campo[];
  activeCampo: Campo;
  potreros: Potrero[];
}

export function Dashboard({ user, campos, activeCampo, potreros }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showNewCampo, setShowNewCampo] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setStatus(null);
      const file = files[0];
      const name = file.name.toLowerCase();
      try {
        setStatus(`Procesando ${file.name}…`);
        const buf = await file.arrayBuffer();
        const result = name.endsWith('.kml')
          ? parseKmlString(new TextDecoder().decode(buf))
          : await parseKmzBuffer(new Uint8Array(buf));

        if (result.paddocks.length === 0) {
          setError('No se encontraron polígonos en el archivo.');
          setStatus(null);
          return;
        }
        setStatus(
          `Encontrados ${result.paddocks.length} polígonos. Guardando…`,
        );
        startTransition(async () => {
          const res = await bulkInsertPotrerosAction(
            activeCampo.id,
            result.paddocks,
          );
          if (res.error) {
            setError(res.error);
            setStatus(null);
            return;
          }
          setStatus(`✓ Importados ${res.inserted} potreros.`);
          router.refresh();
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus(null);
      }
    },
    [activeCampo.id, router],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const switchCampo = (id: string) => {
    setActiveCampoCookie(id);
    router.refresh();
  };

  const deleteOne = (p: Potrero) => {
    if (!confirm(`¿Borrar el potrero "${p.name}"? Esto también borra sus pastoreos.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deletePotreroAction(p.id);
      if (res.error) {
        setError(res.error);
      } else {
        setStatus(`✓ Potrero "${p.name}" borrado.`);
        router.refresh();
      }
    });
  };

  const deleteAll = () => {
    if (
      !confirm(
        `¿Borrar TODOS los potreros del campo "${activeCampo.name}"? ` +
          'Esto también borra sus pastoreos. No se puede deshacer.',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteAllPotrerosAction(activeCampo.id);
      if (res.error) {
        setError(res.error);
      } else {
        setStatus(`✓ ${res.deleted} potreros borrados.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Topbar */}
      <header className="border-b border-stone-200 bg-white">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--color-primary-dark)] text-lg">
              Regenera Ranch
            </span>
            <select
              value={activeCampo.id}
              onChange={(e) => switchCampo(e.target.value)}
              className="rounded-md border border-stone-300 text-sm py-1 px-2"
            >
              {campos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewCampo(true)}
              className="rounded-md border border-stone-300 text-sm py-1 px-2 flex items-center gap-1 hover:bg-stone-50"
              title="Crear un nuevo campo"
            >
              <Plus size={14} /> Nuevo campo
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-500">{user.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-stone-600 hover:text-stone-900 flex items-center gap-1"
              >
                <LogOut size={16} />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-80 border-r border-stone-200 bg-white p-4 flex flex-col gap-4 overflow-y-auto">
          <section
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
              dragOver
                ? 'border-[var(--color-primary)] bg-green-50'
                : 'border-stone-300 bg-stone-50'
            }`}
          >
            <Upload className="mx-auto text-stone-400" />
            <p className="text-sm mt-2 text-stone-700">
              Arrastrá tu <strong>KMZ</strong> acá
            </p>
            <p className="text-xs text-stone-500 mt-1">o</p>
            <label className="mt-2 inline-block rounded-md bg-[var(--color-primary)] text-white text-sm px-3 py-1.5 cursor-pointer hover:bg-[var(--color-primary-dark)]">
              <input
                type="file"
                accept=".kmz,.kml"
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
              Elegir archivo
            </label>
            {status && (
              <p className="text-xs text-stone-600 mt-3">{status}</p>
            )}
            {error && <p className="text-xs text-red-700 mt-3">{error}</p>}
            {isPending && (
              <p className="text-xs text-stone-500 mt-2">Guardando…</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-1">
                <MapPin size={14} /> Potreros ({potreros.length})
              </h2>
              {potreros.length > 0 && (
                <button
                  onClick={deleteAll}
                  disabled={isPending}
                  className="text-xs text-red-700 hover:text-red-900 hover:underline disabled:opacity-50"
                  title="Borrar todos los potreros de este campo"
                >
                  Vaciar todos
                </button>
              )}
            </div>
            {potreros.length === 0 ? (
              <p className="text-xs text-stone-500">
                Sin potreros todavía. Subí un KMZ para empezar.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {potreros.map((p) => (
                  <li
                    key={p.id}
                    className="group rounded-md border border-stone-200 px-3 py-2 text-sm flex items-center justify-between gap-2"
                  >
                    <span className="truncate flex-1">{p.name}</span>
                    {p.area_ha != null && (
                      <span className="text-stone-500 text-xs shrink-0">
                        {p.area_ha.toFixed(1)} ha
                      </span>
                    )}
                    <button
                      onClick={() => deleteOne(p)}
                      disabled={isPending}
                      className="text-stone-400 hover:text-red-700 transition-colors shrink-0 disabled:opacity-50"
                      title={`Borrar potrero "${p.name}"`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* Mapa */}
        <main className="flex-1 relative">
          <PaddockMap potreros={potreros} />
          {potreros.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none">
              <p className="bg-white shadow rounded-lg px-4 py-2 text-stone-700 text-sm">
                Subí un KMZ para ver tus potreros acá.
              </p>
            </div>
          )}
        </main>
      </div>

      {showNewCampo && <NewCampoModal onClose={() => setShowNewCampo(false)} />}
    </div>
  );
}
