import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centroid from '@turf/centroid';
import { point, polygon as turfPolygon } from '@turf/helpers';
import type { Potrero, GeoJSONPolygon } from '../types/models';

export interface LatLng {
  lat: number;
  lng: number;
}

export function pointInPotrero(p: LatLng, potrero: Potrero): boolean {
  try {
    return booleanPointInPolygon(
      point([p.lng, p.lat]),
      turfPolygon(potrero.geometry.coordinates),
    );
  } catch {
    return false;
  }
}

export function findContainingPotrero(
  p: LatLng,
  potreros: Potrero[],
): Potrero | null {
  for (const pot of potreros) {
    if (pointInPotrero(p, pot)) return pot;
  }
  return null;
}

export function polygonCentroid(geometry: GeoJSONPolygon): LatLng {
  const c = centroid(turfPolygon(geometry.coordinates));
  const [lng, lat] = c.geometry.coordinates;
  return { lat, lng };
}

export function polygonBounds(geometry: GeoJSONPolygon): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const ring of geometry.coordinates) {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

export function boundsOfPotreros(
  potreros: Potrero[],
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (potreros.length === 0) return null;
  let acc = polygonBounds(potreros[0].geometry);
  for (let i = 1; i < potreros.length; i++) {
    const b = polygonBounds(potreros[i].geometry);
    acc = {
      minLat: Math.min(acc.minLat, b.minLat),
      maxLat: Math.max(acc.maxLat, b.maxLat),
      minLng: Math.min(acc.minLng, b.minLng),
      maxLng: Math.max(acc.maxLng, b.maxLng),
    };
  }
  return acc;
}
