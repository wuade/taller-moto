import type { AppState } from './logic/state';
import { buildWorkbook, workbookFileName } from './logic/workbook';
import { buildXlsx } from './logic/xlsx';
import { type ShareResult, shareFile } from './share-file';

/** Crea el Excel con todos los datos y abre el menú de compartir (Archivos, correo, WhatsApp...). */
export function exportExcel(state: AppState): Promise<ShareResult> {
  const now = new Date();
  return shareFile(workbookFileName(now), buildXlsx(buildWorkbook(state, now), now), {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uti: 'org.openxmlformats.spreadsheetml.sheet',
    title: 'Excel de Taller Moto',
  });
}
