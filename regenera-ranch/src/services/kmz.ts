// Wrapper mobile: DocumentPicker + expo-file-system → delega el parseo a @regenera/shared.

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseKmlString, parseKmzBuffer, type KmzParseResult } from '@regenera/shared';

export type { ParsedPaddock, KmzParseResult } from '@regenera/shared';

export async function pickAndParseKmz(): Promise<KmzParseResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/vnd.google-earth.kmz', 'application/vnd.google-earth.kml+xml', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const lower = asset.name.toLowerCase();

  if (lower.endsWith('.kml')) {
    const text = await FileSystem.readAsStringAsync(asset.uri);
    return parseKmlString(text);
  }

  // KMZ (o desconocido — intentamos como KMZ primero, después como KML).
  const b64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  try {
    return await parseKmzBuffer(b64);
  } catch {
    // Si no era zip válido, probamos leerlo como KML plano.
    const text = await FileSystem.readAsStringAsync(asset.uri);
    return parseKmlString(text);
  }
}
