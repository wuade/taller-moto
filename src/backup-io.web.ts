import * as DocumentPicker from 'expo-document-picker';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';

/** En el navegador: menú de compartir del sistema si admite archivos (iPhone), si no, descarga. */
export async function exportBackup(fileName: string, json: string): Promise<ExportResult> {
  const file = new File([json], fileName, { type: 'application/json' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de Taller Moto' });
      return 'shared';
    } catch (error) {
      // El usuario cerró el menú: no es un error.
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  return (await fetch(asset.uri)).text();
}
