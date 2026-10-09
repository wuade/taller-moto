import { type ShareResult, shareFile } from './share-file';

const CALENDAR = { mimeType: 'text/calendar', uti: 'com.apple.ical.ics', title: 'Avisos de Taller Moto' };

/**
 * Abre el calendario en una ventana nueva; Safari en el iPhone ofrece añadir los eventos.
 * Tiene que llamarse directamente al pulsar el botón, sin esperas antes, o el navegador lo bloquea.
 */
export function openInCalendar(_fileName: string, ics: string): Promise<ShareResult | 'opened' | 'blocked'> {
  const opened = window.open(`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`, '_blank');
  return Promise.resolve(opened ? 'opened' : 'blocked');
}

/** Plan B: guardar el .ics (por ejemplo en Archivos) y abrirlo desde allí. */
export function saveCalendarFile(fileName: string, ics: string): Promise<ShareResult> {
  return shareFile(fileName, ics, CALENDAR);
}
