import { SEED, type LogEntry, type TorqueKey, TORQUES } from '../data/eliminator500';
import { type Expense, mergeExpenses } from './expenses';

/** Valor de par que el usuario ha confirmado (taller, manual de servicio...), siempre con su fuente. */
export type TorqueOverride = { nm: number; source: string; date: string };

export type AppState = {
  km: number;
  /** Día en que se apuntaron esos km, "AAAA-MM-DD". Sirve para estimar los km al día. */
  kmDate?: string;
  log: Record<string, LogEntry[]>;
  overrides: Partial<Record<TorqueKey, TorqueOverride>>;
  expenses: Expense[];
  /** Último cambio de datos (ISO). */
  updated: string;
  /** Última copia de seguridad exportada (ISO). */
  lastExport?: string;
};

export function seedState(): AppState {
  return {
    km: SEED.km,
    kmDate: SEED.kmDate,
    log: structuredCloneLog(SEED.log),
    overrides: {},
    expenses: [],
    updated: '2026-10-09T00:00:00.000Z',
  };
}

function structuredCloneLog(log: Record<string, LogEntry[]>): Record<string, LogEntry[]> {
  return Object.fromEntries(Object.entries(log).map(([id, entries]) => [id, entries.map((e) => ({ ...e }))]));
}

const dayOf = (iso: string) => iso.slice(0, 10);

function sortEntries(entries: LogEntry[]): LogEntry[] {
  return [...entries].sort((a, b) => a.km - b.km || dayOf(a.date).localeCompare(dayOf(b.date)));
}

/** Une dos historiales sin perder nada: mismas km y mismo día cuentan como un solo registro. */
export function mergeLogs(a: Record<string, LogEntry[]>, b: Record<string, LogEntry[]>): Record<string, LogEntry[]> {
  const out: Record<string, LogEntry[]> = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const seen = new Map<string, LogEntry>();
    for (const e of [...(a[id] ?? []), ...(b[id] ?? [])]) {
      seen.set(`${e.km}|${dayOf(e.date)}`, { km: e.km, date: dayOf(e.date) });
    }
    out[id] = sortEntries([...seen.values()]);
  }
  return out;
}

/** Fusiona una copia importada con lo que hay en el móvil. Nunca borra registros. */
export function mergeStates(local: AppState, incoming: AppState): AppState {
  const overrides = { ...local.overrides };
  for (const [key, value] of Object.entries(incoming.overrides) as [TorqueKey, TorqueOverride][]) {
    const current = overrides[key];
    if (!current || value.date > current.date) overrides[key] = value;
  }
  // La lectura de km que gana es la más alta; con los mismos km, la apuntada más tarde.
  const reading =
    incoming.km > local.km || (incoming.km === local.km && (incoming.kmDate ?? '') > (local.kmDate ?? ''))
      ? incoming
      : local;
  return {
    km: reading.km,
    kmDate: reading.kmDate,
    log: mergeLogs(local.log, incoming.log),
    overrides,
    expenses: mergeExpenses(local.expenses, incoming.expenses),
    updated: local.updated > incoming.updated ? local.updated : incoming.updated,
    lastExport: local.lastExport,
  };
}

export function addEntry(state: AppState, taskId: string, entry: LogEntry, now: Date): AppState {
  return {
    ...state,
    log: { ...state.log, [taskId]: sortEntries([...(state.log[taskId] ?? []), entry]) },
    updated: now.toISOString(),
  };
}

/** Quita un trabajo hecho y lo que se apuntó que costó ese día. */
export function removeEntry(state: AppState, taskId: string, entry: LogEntry, now: Date): AppState {
  const entries = state.log[taskId] ?? [];
  const index = entries.findIndex((e) => e.km === entry.km && dayOf(e.date) === dayOf(entry.date));
  if (index < 0) return state;
  return {
    ...state,
    log: { ...state.log, [taskId]: entries.filter((_, i) => i !== index) },
    expenses: state.expenses.filter((e) => !(e.taskId === taskId && e.date === dayOf(entry.date))),
    updated: now.toISOString(),
  };
}

export function countEntries(log: Record<string, LogEntry[]>): number {
  return Object.values(log).reduce((n, entries) => n + entries.length, 0);
}

export function isTorqueKey(key: string): key is TorqueKey {
  return Object.prototype.hasOwnProperty.call(TORQUES, key);
}
