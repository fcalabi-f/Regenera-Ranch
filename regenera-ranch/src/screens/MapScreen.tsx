import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCampo } from '../contexts/CampoContext';
import { useAuth } from '../contexts/AuthContext';
import * as Gps from '../services/gps';
import { findContainingPotrero, boundsOfPotreros, polygonCentroid } from '@regenera/shared';
import { pickAndParseKmz } from '../services/kmz';
import * as DB from '../lib/db';
import { intensityColor, colors, radius, spacing } from '../theme';
import { daysSinceLastGrazing } from '@regenera/shared';
import type { Potrero, Pastoreo } from '@regenera/shared';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface PotreroWithLast {
  potrero: Potrero;
  last: Pastoreo | null;
}

export function MapScreen() {
  const nav = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const { activeCampo, campos, potreros, refreshPotreros, selectCampo } = useCampo();
  const mapRef = useRef<MapView | null>(null);
  const [enriched, setEnriched] = useState<PotreroWithLast[]>([]);
  const [fix, setFix] = useState<Gps.LocationFix | null>(null);
  const [currentPotrero, setCurrentPotrero] = useState<Potrero | null>(null);
  const [importing, setImporting] = useState(false);

  // Enriquecer potreros con su último pastoreo.
  useEffect(() => {
    let active = true;
    (async () => {
      const result: PotreroWithLast[] = [];
      for (const p of potreros) {
        const last = await DB.getLastPastoreo(p.id);
        result.push({ potrero: p, last });
      }
      if (active) setEnriched(result);
    })();
    return () => {
      active = false;
    };
  }, [potreros]);

  // Encuadrar al cargar potreros.
  useEffect(() => {
    if (potreros.length === 0) return;
    const b = boundsOfPotreros(potreros);
    if (!b || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      [
        { latitude: b.minLat, longitude: b.minLng },
        { latitude: b.maxLat, longitude: b.maxLng },
      ],
      { edgePadding: { top: 60, right: 30, bottom: 200, left: 30 }, animated: true },
    );
  }, [potreros]);

  // GPS continuo.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const ok = await Gps.requestForegroundPermission();
      if (!ok) return;
      unsub = await Gps.watchLocation((f) => setFix(f));
    })();
    return () => {
      unsub?.();
    };
  }, []);

  // Calcular potrero actual.
  useEffect(() => {
    if (!fix) {
      setCurrentPotrero(null);
      return;
    }
    setCurrentPotrero(findContainingPotrero({ lat: fix.lat, lng: fix.lng }, potreros));
  }, [fix, potreros]);

  const handleImportKmz = useCallback(async () => {
    if (!activeCampo) return;
    setImporting(true);
    try {
      const res = await pickAndParseKmz();
      if (!res) return;
      if (res.paddocks.length === 0) {
        Alert.alert('KMZ vacío', 'No se encontraron polígonos en el archivo.');
        return;
      }
      await DB.bulkCreatePotreros(
        res.paddocks.map((p) => ({
          campo_id: activeCampo.id,
          name: p.name,
          geometry: p.geometry,
          area_ha: p.area_ha,
        })),
      );
      await refreshPotreros();
      Alert.alert(
        'Importación lista',
        `Se cargaron ${res.paddocks.length} potreros${
          res.skipped ? ` (${res.skipped} features ignorados)` : ''
        }.`,
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo importar el KMZ.');
    } finally {
      setImporting(false);
    }
  }, [activeCampo, refreshPotreros]);

  const initialRegion = useMemo(
    () => ({
      latitude: -34.6,
      longitude: -58.4,
      latitudeDelta: 30,
      longitudeDelta: 30,
    }),
    [],
  );

  const polygonColor = (pl: PotreroWithLast) => {
    const days = daysSinceLastGrazing(pl.last);
    if (days == null) return 'rgba(160,160,160,0.25)';
    // Más rojo si está reciente, más verde si descansó.
    if (days < 7) return 'rgba(198,106,86,0.40)';
    if (days < 30) return 'rgba(224,184,91,0.40)';
    if (days < 90) return 'rgba(167,208,142,0.40)';
    return 'rgba(63,123,63,0.40)';
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        mapType="hybrid"
      >
        {enriched.map((pl) => {
          const coords = pl.potrero.geometry.coordinates[0].map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }));
          const c = polygonCentroid(pl.potrero.geometry);
          const last = pl.last;
          return (
            <React.Fragment key={pl.potrero.id}>
              <Polygon
                coordinates={coords}
                fillColor={polygonColor(pl)}
                strokeColor={intensityColor(last?.intensity ?? null)}
                strokeWidth={2}
                tappable
                onPress={() =>
                  nav.navigate('PaddockDetail', { potreroId: pl.potrero.id })
                }
              />
              <Marker
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                onPress={() =>
                  nav.navigate('PaddockDetail', { potreroId: pl.potrero.id })
                }
              >
                <View style={styles.label}>
                  <Text style={styles.labelText}>{pl.potrero.name}</Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Header */}
      <View style={styles.header} pointerEvents="box-none">
        <View style={styles.headerCard}>
          <Text style={styles.headerCampo}>
            {activeCampo?.name ?? 'Sin campo activo'}
          </Text>
          <Text style={styles.headerStatus}>
            {currentPotrero
              ? `Estás en: ${currentPotrero.name}`
              : fix
              ? 'Fuera de cualquier potrero cargado'
              : 'Esperando GPS…'}
          </Text>
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom} pointerEvents="box-none">
        {potreros.length === 0 ? (
          <Pressable style={[styles.fab, styles.primaryFab]} onPress={handleImportKmz}>
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.fabPrimaryText}>Importar KMZ del campo</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.row}>
            <Pressable
              style={styles.fab}
              onPress={() => nav.navigate('Records', undefined)}
            >
              <Text style={styles.fabText}>Pastoreos</Text>
            </Pressable>
            <Pressable
              style={styles.fab}
              onPress={() => nav.navigate('Herds', undefined)}
            >
              <Text style={styles.fabText}>Rebaños</Text>
            </Pressable>
            <Pressable
              style={styles.fab}
              onPress={() => nav.navigate('Settings', undefined)}
            >
              <Text style={styles.fabText}>Ajustes</Text>
            </Pressable>
          </View>
        )}

        {potreros.length > 0 && (
          <Pressable
            style={[styles.fab, styles.primaryFab]}
            onPress={() =>
              nav.navigate('NewGrazing', {
                potreroId: currentPotrero?.id ?? undefined,
              })
            }
          >
            <Text style={styles.fabPrimaryText}>＋ Registrar pastoreo</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { position: 'absolute', top: 50, left: 0, right: 0, padding: spacing.md },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerCampo: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  headerStatus: { color: colors.textMuted, marginTop: 2 },
  label: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelText: { fontSize: 11, fontWeight: '600', color: colors.text },
  bottom: { position: 'absolute', bottom: 30, left: 0, right: 0, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  fab: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    minWidth: 100,
  },
  fabText: { color: colors.text, fontWeight: '600' },
  primaryFab: { backgroundColor: colors.primary },
  fabPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
