import type { DueForecast } from './forecast';
import { formatInt } from './format';
import { describeInterval } from './status';

// Calendario en formato iCalendar (RFC 5545), el que importan el Calendario del iPhone y Google Calendar.

const CRLF = '\r\n';

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function utf8Length(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
}

/** Las líneas no pueden pasar de 75 octetos: se parten y la continuación empieza con un espacio. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = utf8Length(ch);
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const compactDay = (day: string) => day.replace(/-/g, '');

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function describe(item: DueForecast, rate: number | null): string {
  const lines = [`${describeInterval(item.task)}.`];
  if (item.late) lines.push('Ya toca.');
  else if (item.basis === 'km' && item.atKm !== null && rate) {
    lines.push(
      `Fecha estimada: tocará hacia los ${formatInt(item.atKm)} km si sigues a unos ${formatInt(rate)} km al día. Mira el cuentakilómetros.`,
    );
  } else if (item.atKm !== null) {
    lines.push(`Toca por fecha, salvo que llegues antes a ${formatInt(item.atKm)} km.`);
  }
  lines.push('Abre Taller Moto para ver los pasos y los pares de apriete.');
  return lines.join('\n');
}

/** Un evento de día completo por trabajo, con aviso una semana antes y el mismo día, a las 9:00. */
export function buildIcs(items: DueForecast[], rate: number | null, now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // Mismo UID por trabajo y SEQUENCE creciente: al volver a importar, el Calendario puede actualizar el evento.
  const sequence = Math.floor(now.getTime() / 60000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Taller Moto//Avisos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Taller Moto',
  ];
  for (const item of items) {
    const summary = escapeText(`Moto: ${item.task.name}`);
    lines.push(
      'BEGIN:VEVENT',
      `UID:taller-moto-${item.task.id}`,
      `SEQUENCE:${sequence}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDay(item.date)}`,
      `DTEND;VALUE=DATE:${compactDay(nextDay(item.date))}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapeText(describe(item, rate))}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      'TRIGGER:-P6DT15H',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      'TRIGGER:PT9H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

export function icsFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `taller-moto-avisos-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.ics`;
}
