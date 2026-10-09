import { TASKS, type LogEntry, type Task } from '../data/eliminator500';
import type { AppState } from './state';
import { addMonths, isPendingMount, lastEntry, parseDay } from './status';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Con menos historial que esto, la media de km al día no es fiable. */
const MIN_DAYS = 30;

export type DueForecast = {
  task: Task;
  /** Día en que toca, "AAAA-MM-DD". Si ya tocaba, es hoy. */
  date: string;
  /** Qué llega antes: la fecha del intervalo o los km, estimados con la media de km al día. */
  basis: 'fecha' | 'km';
  /** Km a los que toca, si el intervalo tiene km. */
  atKm: number | null;
  /** Ya tocaba antes de hoy. */
  late: boolean;
};

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Día de la última lectura del cuentakilómetros. Los datos anteriores a guardarla usan el último cambio. */
export function kmReadingDate(state: AppState): string {
  return (state.kmDate ?? state.updated).slice(0, 10);
}

/** Media de km al día, desde el registro más antiguo hasta la última lectura de km. */
export function kmPerDay(state: AppState): number | null {
  const entries = Object.values(state.log).flat();
  if (entries.length === 0) return null;
  const first = entries.reduce((a, b) => {
    const da = parseDay(a.date);
    const db = parseDay(b.date);
    return db < da || (db === da && b.km < a.km) ? b : a;
  });
  const days = (parseDay(kmReadingDate(state)) - parseDay(first.date)) / DAY_MS;
  const km = state.km - first.km;
  if (days < MIN_DAYS || km <= 0) return null;
  return km / days;
}

export function forecastDue(
  task: Task,
  entries: LogEntry[] | undefined,
  state: AppState,
  rate: number | null,
  today: string,
): DueForecast | null {
  const last = lastEntry(entries);
  if (!last || isPendingMount(task, entries)) return null;

  const candidates: { day: number; basis: DueForecast['basis'] }[] = [];
  if (task.everyMonths) candidates.push({ day: addMonths(last.date, task.everyMonths), basis: 'fecha' });
  const atKm = task.everyKm ? last.km + task.everyKm : null;
  if (atKm !== null && rate) {
    const daysLeft = Math.ceil((atKm - state.km) / rate);
    candidates.push({ day: parseDay(kmReadingDate(state)) + daysLeft * DAY_MS, basis: 'km' });
  }
  if (candidates.length === 0) return null;

  const first = candidates.reduce((a, b) => (b.day < a.day ? b : a));
  const todayDay = parseDay(today);
  const late = first.day < todayDay;
  return { task, date: isoDay(late ? todayDay : first.day), basis: first.basis, atKm, late };
}

/** Próxima fecha de cada trabajo, de la más cercana a la más lejana. Las piezas sin montar no cuentan. */
export function forecastAll(state: AppState, today: string) {
  const rate = kmPerDay(state);
  const items: DueForecast[] = [];
  const undated: Task[] = [];
  for (const task of TASKS) {
    const entries = state.log[task.id];
    if (isPendingMount(task, entries)) continue;
    const item = forecastDue(task, entries, state, rate, today);
    if (item) items.push(item);
    else undated.push(task);
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || Number(b.late) - Number(a.late));
  return { rate, items, undated };
}
