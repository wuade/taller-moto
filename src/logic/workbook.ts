import { BIKE, CONFIDENCE, TASKS, TORQUE_GROUPS, TORQUES, type TorqueKey } from '../data/eliminator500';
import { costOfEntry, spendingByYear } from './expenses';
import { todayIso } from './format';
import { sumEuros } from './money';
import type { AppState } from './state';
import { compareStatus, describeInterval, isPendingMount, taskStatus } from './status';
import type { Cell, Sheet } from './xlsx';

// El Excel que se exporta para ver los datos en el PC. Es una foto: no se vuelve a importar.

function summary(state: AppState, now: Date): Sheet {
  const years = spendingByYear(state.expenses);
  const rows: Cell[][] = [
    ['Moto', BIKE.name],
    ['Km actuales', { int: state.km }],
    ['Km apuntados el', state.kmDate ? { date: state.kmDate } : null],
    ['Exportado el', { date: todayIso(now) }],
    ...years.map((y): Cell[] => [`Gastado en ${y.year}`, { euros: y.total }]),
  ];
  if (years.length > 1) rows.push(['Gastado en total', { euros: sumEuros(years.map((y) => y.total)) }]);
  return { name: 'Resumen', widths: [22, 34], header: ['Dato', 'Valor'], rows };
}

function expenses(state: AppState): Sheet {
  const rows: Cell[][] = state.expenses.map((e) => [
    { date: e.date },
    e.concept,
    e.place ?? null,
    e.km !== undefined ? { int: e.km } : null,
    { euros: e.amount },
  ]);
  if (rows.length > 0) {
    const total = sumEuros(state.expenses.map((e) => e.amount));
    rows.push(['Total', null, null, null, { sum: `E2:E${rows.length + 1}`, value: total }]);
  }
  return { name: 'Gastos', widths: [12, 34, 22, 10, 13], header: ['Fecha', 'Concepto', 'Dónde', 'Km', 'Importe'], rows };
}

function jobs(state: AppState): Sheet {
  const names = new Map(TASKS.map((t) => [t.id, t.name]));
  const done = Object.entries(state.log)
    .flatMap(([taskId, entries]) => entries.map((entry) => ({ taskId, entry })))
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || a.entry.km - b.entry.km);
  const rows = done.map(({ taskId, entry }): Cell[] => {
    const cost = costOfEntry(state.expenses, taskId, entry.date);
    return [
      { date: entry.date },
      names.get(taskId) ?? taskId,
      { int: entry.km },
      cost !== null ? { euros: cost } : null,
      entry.km === 0 ? 'Punto de partida (de fábrica)' : null,
    ];
  });
  return {
    name: 'Trabajos hechos',
    widths: [12, 30, 10, 12, 30],
    header: ['Fecha', 'Trabajo', 'Km', 'Coste', 'Nota'],
    rows,
  };
}

function plan(state: AppState, now: Date): Sheet {
  const rows = TASKS.map((task) => {
    const entries = state.log[task.id];
    return { task, pending: isPendingMount(task, entries), status: taskStatus(task, entries, state.km, now) };
  })
    .sort((a, b) => Number(b.pending) - Number(a.pending) || compareStatus(a.status, b.status))
    .map(({ task, pending, status }): Cell[] => [
      task.name,
      pending ? 'Montar' : status.label,
      pending ? (task.pending ?? '') : status.detail,
      describeInterval(task),
    ]);
  return { name: 'Qué toca', widths: [30, 14, 44, 24], header: ['Trabajo', 'Estado', 'Detalle', 'Intervalo'], rows };
}

function torques(state: AppState): Sheet {
  const grouped = new Set(TORQUE_GROUPS.flatMap((g) => g.keys));
  const others = (Object.keys(TORQUES) as TorqueKey[]).filter((k) => !grouped.has(k));
  const groups = others.length > 0 ? [...TORQUE_GROUPS, { title: 'Otros', keys: others }] : TORQUE_GROUPS;
  const rows = groups.flatMap((group) =>
    group.keys.map((key): Cell[] => {
      const t = TORQUES[key];
      const override = state.overrides[key];
      if (override) return [group.title, t.part, override.nm, 'Verificado por ti', override.source];
      return [group.title, t.part, t.nm ?? 'Sin dato', CONFIDENCE[t.conf].tag, t.src];
    }),
  );
  return {
    name: 'Pares de apriete',
    widths: [18, 40, 9, 16, 60],
    header: ['Grupo', 'Pieza', 'N·m', 'Nivel', 'Fuente'],
    rows,
  };
}

export function buildWorkbook(state: AppState, now: Date): Sheet[] {
  return [summary(state, now), expenses(state), jobs(state), plan(state, now), torques(state)];
}

export function workbookFileName(now: Date): string {
  return `taller-moto-${todayIso(now)}.xlsx`;
}
