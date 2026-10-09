import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';
export type FileKind = { mimeType: string; uti: string; title: string };

/** Escribe el archivo en la caché y abre el menú de compartir (Drive, Archivos, correo...). */
export async function shareFile(fileName: string, content: string | Uint8Array, kind: FileKind): Promise<ShareResult> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, { mimeType: kind.mimeType, UTI: kind.uti, dialogTitle: kind.title });
  return 'shared';
}
