// Parseo puro de KMZ/KML → potreros. Sin IO: el caller pasa los bytes/string.
//
// - `parseKmlString(kmlText)` → ParsedPaddock[]
// - `parseKmzBuffer(uint8array)` → ParsedPaddock[]  (usa JSZip para extraer el KML)
//
// Los wrappers de cada plataforma (mobile usa expo-file-system + DocumentPicker;
// web usa File API) son responsables de leer los archivos y pasar los datos.

import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import area from '@turf/area';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { GeoJSONPolygon } from '../types/models';

export interface ParsedPaddock {
  name: string;
  geometry: GeoJSONPolygon;
  area_ha: number;
}

export interface KmzParseResult {
  paddocks: ParsedPaddock[];
  /** Features que no eran polígonos (puntos, líneas, etc.). */
  skipped: number;
}

function featureToPaddocks(feature: Feature): ParsedPaddock[] {
  if (!feature.geometry) return [];
  const name =
    (feature.properties && (feature.properties.name as string | undefined)) || 'Potrero';

  if (feature.geometry.type === 'Polygon') {
    const poly = feature.geometry as Polygon;
    return [
      {
        name,
        geometry: { type: 'Polygon', coordinates: poly.coordinates },
        area_ha: area(poly) / 10_000,
      },
    ];
  }
  if (feature.geometry.type === 'MultiPolygon') {
    const mp = feature.geometry as MultiPolygon;
    return mp.coordinates.map((rings, i) => {
      const poly: Polygon = { type: 'Polygon', coordinates: rings };
      return {
        name: mp.coordinates.length > 1 ? `${name} (${i + 1})` : name,
        geometry: { type: 'Polygon', coordinates: rings },
        area_ha: area(poly) / 10_000,
      };
    });
  }
  return [];
}

export function parseKmlString(kmlText: string): KmzParseResult {
  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  // togeojson tipa con Document del DOM nativo. El DOM de @xmldom/xmldom es compatible en runtime.
  const fc = kml(dom as unknown as Document) as FeatureCollection;
  const paddocks: ParsedPaddock[] = [];
  let skipped = 0;
  for (const f of fc.features) {
    const ps = featureToPaddocks(f);
    if (ps.length === 0) skipped++;
    paddocks.push(...ps);
  }
  return { paddocks, skipped };
}

/**
 * Acepta el contenido binario de un .kmz (zip que contiene un .kml).
 * `input` puede ser Uint8Array, ArrayBuffer o base64 string.
 */
export async function parseKmzBuffer(
  input: Uint8Array | ArrayBuffer | string,
): Promise<KmzParseResult> {
  const opts =
    typeof input === 'string' ? { base64: true as const } : undefined;
  const zip = await JSZip.loadAsync(input as never, opts);
  const kmlEntry =
    zip.file('doc.kml') ||
    Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) {
    throw new Error('El KMZ no contiene ningún archivo .kml.');
  }
  const kmlText = await kmlEntry.async('string');
  return parseKmlString(kmlText);
}
