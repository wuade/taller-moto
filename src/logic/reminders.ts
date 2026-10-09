import { todayIso } from './format';
import { type AppState, SEED_UPDATED } from './state';

// Avisos de la pantalla de inicio: copia de seguridad pendiente y km sin actualizar.

/** Con cambios sin copia, se avisa cuando la última copia tiene estos días. */
export const BACKUP_EVERY_DAYS = 7;
/** Días sin apuntar los km a partir de los que «Qué toca» puede ir atrasado. */
export const KM_STALE_DAYS = 14;

const DAY_MS = 86_400_000;

/** Día local "AAAA-MM-DD" de una fecha ISO completa; un día ya en ese formato se queda igual. */
function localDay(isoOrDay: string): string {
  return isoOrDay.length > 10 ? todayIso(new Date(isoOrDay)) : isoOrDay;
}

/** Días de calendario de una fecha a otra ("AAAA-MM-DD" o ISO completa). */
export function daysBetween(from: string, to: string): number {
  const utc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
  return Math.round((utc(localDay(to)) - utc(localDay(from))) / DAY_MS);
}

/**
 * Avisa de hacer copia si hay cambios que solo están en el móvil y no hay ninguna copia, o la última es de hace
 * una semana o más. lastDays es null si nunca se ha hecho copia.
 */
export function backupReminder(
  state: Pick<AppState, 'updated' | 'lastExport'>,
  now: Date,
): { lastDays: number | null } | null {
  if (!state.lastExport) return state.updated > SEED_UPDATED ? { lastDays: null } : null;
  if (state.updated <= state.lastExport) return null;
  const lastDays = daysBetween(state.lastExport, todayIso(now));
  return lastDays >= BACKUP_EVERY_DAYS ? { lastDays } : null;
}

/** Días desde que se apuntaron los km, y si son tantos que conviene actualizarlos. null si no consta el día. */
export function kmAge(kmDate: string | undefined, now: Date): { days: number; stale: boolean } | null {
  if (!kmDate) return null;
  const days = Math.max(0, daysBetween(kmDate, todayIso(now)));
  return { days, stale: days >= KM_STALE_DAYS };
}
