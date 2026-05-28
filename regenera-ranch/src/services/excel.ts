// Wrapper mobile: DocumentPicker + expo-file-system → delega a @regenera/shared.

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseExcelBuffer, type ExcelParseResult } from '@regenera/shared';

export type { ParsedGrazing, ExcelParseResult } from '@regenera/shared';

export async function pickAndParseExcel(): Promise<ExcelParseResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const b64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return parseExcelBuffer(b64, { type: 'base64' });
}
