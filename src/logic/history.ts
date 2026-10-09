import { BIKE, PARTS, TASKS } from '../data/eliminator500';
import type { Expense } from './expenses';
import { todayIso } from './format';
import type { AppState } from './state';
import { compareStatus, describeInterval, isPendingMount, taskStatus } from './status';

// Historial de mantenimiento para enseñarlo, por ejemplo al vender la moto: lo hecho con fechas y km, sin importes.

/** Trabajos hechos el mismo día con los mismos km. */
export type Visit = { date: string; km: number; jobs: string[]; place: string | null };
export type BoughtPart = {
  date: string;
  concept: string;
  place: string | null;
  /** Día en que se hizo su trabajo después de comprarlo; null si aún no, o si el recambio no tiene trabajo. */
  mountedOn: string | null;
  hasJob: boolean;
};
export type PlanRow = { name: string; status: string; detail: string; interval: string };
export type History = {
  bike: string;
  detail: string;
  km: number;
  kmDate: string | null;
  generated: string;
  visits: Visit[];
  parts: BoughtPart[];
  plan: PlanRow[];
};

/** Dónde se hizo: el gasto de ese día de uno de sus trabajos, o uno de ese día con esos km (una revisión de taller). */
function placeOf(expenses: Expense[], date: string, km: number, taskIds: string[]): string | null {
  const match = expenses.find(
    (e) => e.place && e.date === date && (e.taskId ? taskIds.includes(e.taskId) : e.km === km),
  );
  return match?.place ?? null;
}

function visits(state: AppState): Visit[] {
  const byVisit = new Map<string, { date: string; km: number; jobs: string[]; taskIds: string[] }>();
  for (const task of TASKS) {
    for (const entry of state.log[task.id] ?? []) {
      // Los registros a 0 km son el estado de fábrica, no un trabajo hecho.
      if (entry.km <= 0) continue;
      const date = entry.date.slice(0, 10);
      const key = `${date}|${entry.km}`;
      const visit = byVisit.get(key) ?? { date, km: entry.km, jobs: [], taskIds: [] };
      visit.jobs.push(task.name);
      visit.taskIds.push(task.id);
      byVisit.set(key, visit);
    }
  }
  return [...byVisit.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km)
    .map(({ date, km, jobs, taskIds }) => ({ date, km, jobs, place: placeOf(state.expenses, date, km, taskIds) }));
}

function boughtParts(state: AppState): BoughtPart[] {
  return state.expenses
    .filter((e) => e.partId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((e) => {
      const taskId = PARTS.find((p) => p.id === e.partId)?.taskId;
      const mounts = taskId
        ? (state.log[taskId] ?? [])
            .filter((entry) => entry.km > 0 && entry.date.slice(0, 10) >= e.date)
            .map((entry) => entry.date.slice(0, 10))
            .sort()
        : [];
      return { date: e.date, concept: e.concept, place: e.place ?? null, mountedOn: mounts[0] ?? null, hasJob: Boolean(taskId) };
    });
}

/** Lo que toca, en el orden de la pantalla de inicio: primero lo que falta por montar. */
export function plan(state: AppState, now: Date): PlanRow[] {
  return TASKS.map((task) => {
    const entries = state.log[task.id];
    return { task, pending: isPendingMount(task, entries), status: taskStatus(task, entries, state.km, now) };
  })
    .sort((a, b) => Number(b.pending) - Number(a.pending) || compareStatus(a.status, b.status))
    .map(({ task, pending, status }) => ({
      name: task.name,
      status: pending ? 'Montar' : status.label,
      detail: pending ? (task.pending ?? '') : status.detail,
      interval: describeInterval(task),
    }));
}

export function buildHistory(state: AppState, now: Date): History {
  return {
    bike: BIKE.name,
    detail: BIKE.detail,
    km: state.km,
    kmDate: state.kmDate ?? null,
    generated: todayIso(now),
    visits: visits(state),
    parts: boughtParts(state),
    plan: plan(state, now),
  };
}

export function historyFileName(now: Date): string {
  return `historial-moto-${todayIso(now)}.pdf`;
}
