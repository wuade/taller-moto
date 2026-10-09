export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'unavailable';
export type FileKind = { mimeType: string; uti: string; title: string };

/** En el navegador: menú de compartir del sistema si admite archivos (iPhone), si no, descarga. */
export async function shareFile(fileName: string, text: string, kind: FileKind): Promise<ShareResult> {
  const file = new File([text], fileName, { type: kind.mimeType });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: kind.title });
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
