import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

/** Escribe la copia en la caché y abre el menú de compartir (Drive, correo, WhatsApp...). */
export async function exportBackup(fileName: string, json: string): Promise<ExportResult> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Guardar copia de Taller Moto',
  });
  return 'shared';
}

/** Deja elegir un archivo de copia y devuelve su texto, o null si se cancela. */
export async function pickBackupText(): Promise<string | null> {
  // Drive y otras apps no siempre marcan el .json como application/json: se valida el contenido después.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
