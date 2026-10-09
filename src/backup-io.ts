import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { type ShareResult, shareFile } from './share-file';

export type ExportResult = ShareResult;

/** Abre el menú de compartir con la copia (Drive, correo, WhatsApp...). */
export function exportBackup(fileName: string, json: string): Promise<ExportResult> {
  return shareFile(fileName, json, { mimeType: 'application/json', uti: 'public.json', title: 'Guardar copia de Taller Moto' });
}

/** Deja elegir un archivo de copia y devuelve su texto, o null si se cancela. */
export async function pickBackupText(): Promise<string | null> {
  // Drive y otras apps no siempre marcan el .json como application/json: se valida el contenido después.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
