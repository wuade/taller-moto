import * as DocumentPicker from 'expo-document-picker';

import { type ShareResult, shareFile } from './share-file';

export type ExportResult = ShareResult;

export function exportBackup(fileName: string, json: string): Promise<ExportResult> {
  return shareFile(fileName, json, { mimeType: 'application/json', uti: 'public.json', title: 'Copia de Taller Moto' });
}

export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  return (await fetch(asset.uri)).text();
}
