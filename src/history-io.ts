import { buildHistory, historyFileName } from './logic/history';
import { buildHistoryPdf } from './logic/historyPdf';
import type { AppState } from './logic/state';
import { type ShareResult, shareFile } from './share-file';

/** Crea el historial en PDF y abre el menú de compartir (Archivos, imprimir, WhatsApp...). */
export function exportHistory(state: AppState): Promise<ShareResult> {
  const now = new Date();
  return shareFile(historyFileName(now), buildHistoryPdf(buildHistory(state, now)), {
    mimeType: 'application/pdf',
    uti: 'com.adobe.pdf',
    title: 'Historial de la moto',
  });
}
