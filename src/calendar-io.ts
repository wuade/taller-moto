import { type ShareResult, shareFile } from './share-file';

const CALENDAR = { mimeType: 'text/calendar', uti: 'com.apple.ical.ics', title: 'Avisos de Taller Moto' };

/** En la app instalada, el menú de compartir deja abrir el archivo con el calendario. */
export function openInCalendar(fileName: string, ics: string): Promise<ShareResult | 'opened' | 'blocked'> {
  return shareFile(fileName, ics, CALENDAR);
}

export function saveCalendarFile(fileName: string, ics: string): Promise<ShareResult> {
  return shareFile(fileName, ics, CALENDAR);
}
