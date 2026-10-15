import { BIKE, type LogEntry } from '../data/eliminator500';
import { formatDate, formatKm, parseDayInput, todayIso } from './format';

// Un trabajo hecho otro día: se apunta con la fecha y los km de ese día, no con los de hoy.

export type DoneWhen = { date: string; km: number };

const dayOf = (iso: string) => iso.slice(0, 10);

/**
 * Lee la fecha y los km escritos a mano. Si no valen, devuelve el motivo: la fecha no puede ser futura ni anterior
 * a la matriculación, los km no pueden pasar de los actuales ni contradecir los de otros trabajos, y el trabajo no
 * puede estar ya apuntado igual.
 */
export function parseDoneWhen(
  dateText: string,
  kmText: string,
  current: { taskId: string; km: number; log: Record<string, LogEntry[]>; now: Date },
): DoneWhen | { error: string } {
  const date = parseDayInput(dateText);
  if (!date) return { error: 'Escribe la fecha así: 09/10/2026.' };
  if (date > todayIso(current.now)) return { error: 'La fecha no puede ser de un día que aún no ha llegado.' };
  if (date < BIKE.registered) {
    return { error: `La moto se matriculó el ${formatDate(BIKE.registered)}: la fecha no puede ser anterior.` };
  }
  const km = Number(kmText.replace(/[.\s]/g, ''));
  if (!kmText.trim() || !Number.isInteger(km) || km <= 0) {
    return { error: 'Escribe los km que tenía la moto ese día, sin decimales.' };
  }
  if (km > current.km) {
    return {
      error: `Los km no pueden pasar de los actuales (${formatKm(current.km)}). Si ya tiene más, apúntalos primero en inicio.`,
    };
  }
  // Los km tienen que cuadrar con los de los demás trabajos: ni menos que uno de antes ni más que uno de después.
  // Así se pilla una cifra de menos. Los registros a 0 km son el estado de fábrica, no una lectura.
  const readings = Object.values(current.log)
    .flat()
    .filter((e) => e.km > 0);
  const before = readings.filter((e) => dayOf(e.date) < date && e.km > km).sort((a, b) => b.km - a.km)[0];
  if (before) {
    return {
      error: `El ${formatDate(dayOf(before.date))} ya tenía ${formatKm(before.km)}: el ${formatDate(date)} no pudo tener menos. Revisa los km.`,
    };
  }
  const after = readings.filter((e) => dayOf(e.date) > date && e.km < km).sort((a, b) => a.km - b.km)[0];
  if (after) {
    return {
      error: `El ${formatDate(dayOf(after.date))} tenía ${formatKm(after.km)}: el ${formatDate(date)} no pudo tener más. Revisa los km.`,
    };
  }
  const entries = current.log[current.taskId] ?? [];
  if (entries.some((e) => e.km === km && dayOf(e.date) === date)) {
    return { error: 'Este trabajo ya está apuntado con esa fecha y esos km.' };
  }
  return { date, km };
}
