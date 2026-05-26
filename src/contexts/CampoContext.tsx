// Mantiene el "campo activo" seleccionado por el usuario y expone refresco
// de potreros/rebanos para todas las pantallas. Persiste el id activo en AsyncStorage.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import * as DB from '../lib/db';
import type { Campo, Potrero, Rebano } from '../types/models';

const ACTIVE_CAMPO_KEY = 'rr:activeCampoId';

interface CampoState {
  loading: boolean;
  campos: Campo[];
  activeCampo: Campo | null;
  potreros: Potrero[];
  rebanos: Rebano[];
  selectCampo: (id: string) => Promise<void>;
  createCampo: (name: string) => Promise<Campo>;
  refreshPotreros: () => Promise<void>;
  refreshRebanos: () => Promise<void>;
}

const Ctx = createContext<CampoState | null>(null);

export function CampoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [rebanos, setRebanos] = useState<Rebano[]>([]);

  const activeCampo = useMemo(
    () => campos.find((c) => c.id === activeId) ?? null,
    [campos, activeId],
  );

  const refreshPotreros = useCallback(async () => {
    if (!activeId) {
      setPotreros([]);
      return;
    }
    setPotreros(await DB.listPotreros(activeId));
  }, [activeId]);

  const refreshRebanos = useCallback(async () => {
    if (!activeId) {
      setRebanos([]);
      return;
    }
    setRebanos(await DB.listRebanos(activeId));
  }, [activeId]);

  // Cargar campos cuando hay user.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (!user) {
          if (active) {
            setCampos([]);
            setActiveId(null);
          }
          return;
        }
        const list = await DB.listCampos(user.id);
        if (!active) return;
        setCampos(list);
        const stored = await AsyncStorage.getItem(ACTIVE_CAMPO_KEY);
        const candidate = stored && list.find((c) => c.id === stored) ? stored : list[0]?.id ?? null;
        setActiveId(candidate ?? null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Cuando cambia campo activo, recargar potreros/rebanos.
  useEffect(() => {
    refreshPotreros();
    refreshRebanos();
  }, [refreshPotreros, refreshRebanos]);

  const selectCampo = useCallback(async (id: string) => {
    setActiveId(id);
    await AsyncStorage.setItem(ACTIVE_CAMPO_KEY, id);
  }, []);

  const createCampo = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Sin usuario autenticado');
      const c = await DB.createCampo({ owner_user_id: user.id, name });
      setCampos((prev) => [...prev, c]);
      await selectCampo(c.id);
      return c;
    },
    [user, selectCampo],
  );

  return (
    <Ctx.Provider
      value={{
        loading,
        campos,
        activeCampo,
        potreros,
        rebanos,
        selectCampo,
        createCampo,
        refreshPotreros,
        refreshRebanos,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCampo(): CampoState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCampo debe usarse dentro de <CampoProvider>');
  return v;
}
