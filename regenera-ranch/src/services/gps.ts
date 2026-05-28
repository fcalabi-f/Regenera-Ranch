import * as Location from 'expo-location';

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
}

export async function requestForegroundPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentFix(): Promise<LocationFix> {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
    timestamp: loc.timestamp,
  };
}

/**
 * Suscribe a actualizaciones de ubicación.
 * Devuelve la función para cancelar la suscripción.
 */
export async function watchLocation(
  cb: (fix: LocationFix) => void,
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000, // cada 10s suele ser suficiente para detectar potrero
      distanceInterval: 10, // o cada 10m de movimiento
    },
    (loc) => {
      cb({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        timestamp: loc.timestamp,
      });
    },
  );
  return () => sub.remove();
}
