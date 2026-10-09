import type { LogEntry, Task } from '../data/eliminator500';
import { formatInt } from './format';

export type Level = 'over' | 'soon' | 'ok' | 'none';

export type TaskStatus = {
  level: Level;
  label: string;
  detail: string;
  kmLeft: number | null;
  daysLeft: number | null;
  /** 0 = recién hecho, 1 = vence ahora, >1 = pasado. Sirve para ordenar. */
  used: number;
};

const LABELS: Record<Level, string> = {
  over: 'Toca ya',
  soon: 'Pronto',
  ok: 'Al día',
  none: 'Sin registro',
};

const LEVEL_ORDER: Record<Level, number> = { over: 0, none: 1, soon: 2, ok: 3 };

const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_DAYS = 30;

/** "AAAA-MM-DD" (o ISO) a medianoche UTC. */
function parseDay(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Suma meses de calendario; si el día no existe (31 de febrero), usa el último del mes. */
export function addMonths(iso: string, months: number): number {
  const base = new Date(parseDay(iso));
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + months;
  const d = base.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(d, lastDay));
}

function todayUtc(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** La entrada más reciente: la de más km y, a igualdad, la de fecha más tardía. */
export function lastEntry(entries: LogEntry[] | undefined): LogEntry | undefined {
  if (!entries || entries.length === 0) return undefined;
  return entries.reduce((best, e) =>
    e.km > best.km || (e.km === best.km && parseDay(e.date) > parseDay(best.date)) ? e : best,
  );
}

/** Piezas compradas que aún no se han montado (solo hay registros a 0 km, los de fábrica). */
export function isPendingMount(task: Task, entries: LogEntry[] | undefined): boolean {
  return Boolean(task.pending) && !(entries ?? []).some((e) => e.km > 0);
}

export function taskStatus(task: Task, entries: LogEntry[] | undefined, km: number, now: Date): TaskStatus {
  const last = lastEntry(entries);
  if (!last) {
    return { level: 'none', label: LABELS.none, detail: 'Nunca registrado', kmLeft: null, daysLeft: null, used: 1 };
  }

  const parts: string[] = [];
  let kmLeft: number | null = null;
  let daysLeft: number | null = null;
  let used = 0;

  if (task.everyKm) {
    kmLeft = task.everyKm - (km - last.km);
    used = Math.max(used, (km - last.km) / task.everyKm);
    parts.push(kmLeft < 0 ? `${formatInt(-kmLeft)} km pasado` : `faltan ${formatInt(kmLeft)} km`);
  }
  if (task.everyMonths) {
    const due = addMonths(last.date, task.everyMonths);
    const start = parseDay(last.date);
    const today = todayUtc(now);
    daysLeft = Math.round((due - today) / DAY_MS);
    used = Math.max(used, (today - start) / (due - start));
    parts.push(daysLeft < 0 ? `vencido hace ${formatInt(-daysLeft)} días` : `faltan ${formatInt(daysLeft)} días`);
  }

  const warnKm = task.warnKm ?? (task.everyKm ? task.everyKm * 0.1 : 0);
  let level: Level = 'ok';
  if ((kmLeft !== null && kmLeft <= 0) || (daysLeft !== null && daysLeft <= 0)) level = 'over';
  else if ((kmLeft !== null && kmLeft <= warnKm) || (daysLeft !== null && daysLeft <= WARN_DAYS)) level = 'soon';

  return { level, label: LABELS[level], detail: parts.join(' · '), kmLeft, daysLeft, used };
}

export function compareStatus(a: TaskStatus, b: TaskStatus): number {
  return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.used - a.used;
}

export function describeInterval(task: Task): string {
  const parts: string[] = [];
  if (task.everyKm) parts.push(`${formatInt(task.everyKm)} km`);
  if (task.everyMonths) {
    parts.push(
      task.everyMonths % 12 === 0
        ? `${task.everyMonths / 12} ${task.everyMonths === 12 ? 'año' : 'años'}`
        : `${task.everyMonths} ${task.everyMonths === 1 ? 'mes' : 'meses'}`,
    );
  }
  return `Cada ${parts.join(' o ')}`;
}
