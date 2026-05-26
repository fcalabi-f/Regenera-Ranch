// Importación de archivos KMZ (zip que contiene un KML) producidos en Google Earth.
//
// Estrategia:
//  1) DocumentPicker para que el usuario elija el archivo.
//  2) Si es .kmz, leerlo como base64, abrirlo con JSZip y extraer el .kml.
//     Si es .kml, leerlo como texto directamente.
//  3) Parsear el KML con @xmldom/xmldom y convertirlo a GeoJSON con @tmcw/togeojson.
//  4) De cada Feature tipo Polygon o MultiPolygon, generar potreros.

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import area from '@turf/area';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { GeoJSONPolygon } from '../types/models';

export interface ParsedPaddock {
  name: string;
  geometry: GeoJSONPolygon;
  area_ha: number;
}

export interface KmzImportResult {
  paddocks: ParsedPaddock[];
  skipped: number; // features que no eran polígonos
}

async function readFileAsText(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri);
}

async function readFileAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function extractKmlFromKmz(uri: string): Promise<string> {
  const b64 = await readFileAsBase64(uri);
  const zip = await JSZip.loadAsync(b64, { base64: true });
  // El archivo principal generalmente se llama doc.kml.
  const kmlEntry =
    zip.file('doc.kml') ||
    Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) {
    throw new Error('El KMZ no contiene ningún archivo .kml.');
  }
  return kmlEntry.async('string');
}

function featureToPaddocks(feature: Feature): ParsedPaddock[] {
  if (!feature.geometry) return [];
  const name =
    (feature.properties &&
      (feature.properties.name as string | undefined)) ||
    'Potrero';

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

export async function pickAndParseKmz(): Promise<KmzImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/vnd.google-earth.kmz', 'application/vnd.google-earth.kml+xml', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const lower = asset.name.toLowerCase();

  let kmlText: string;
  if (lower.endsWith('.kmz')) {
    kmlText = await extractKmlFromKmz(asset.uri);
  } else if (lower.endsWith('.kml')) {
    kmlText = await readFileAsText(asset.uri);
  } else {
    // Intentamos primero como KMZ; si falla, como KML.
    try {
      kmlText = await extractKmlFromKmz(asset.uri);
    } catch {
      kmlText = await readFileAsText(asset.uri);
    }
  }

  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  // togeojson tipa el primer argumento como Document del DOM nativo.
  // El DOM de @xmldom/xmldom es compatible en runtime.
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
