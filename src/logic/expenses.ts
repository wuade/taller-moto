import { roundCents, sumEuros } from './money';
import type { AppState } from './state';

/** Un gasto de la moto. Si se apuntó al marcar un trabajo, lleva su tarea y sus km; si es una compra, su recambio. */
export type Expense = {
  id: string;
  /** "AAAA-MM-DD" */
  date: string;
  /** Euros con 2 decimales. */
  amount: number;
  concept: string;
  place?: string;
  km?: number;
  taskId?: string;
  /** Si es la compra de un recambio de la lista (PARTS). */
  partId?: string;
};

export type ExpenseInput = Omit<Expense, 'id'>;

export function newExpenseId(now: Date): string {
  return `g-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortExpenses(list: Expense[]): Expense[] {
  return [...list].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function clean(input: ExpenseInput): ExpenseInput {
  const place = input.place?.trim();
  return {
    date: input.date.slice(0, 10),
    amount: roundCents(input.amount),
    concept: input.concept.trim(),
    ...(place ? { place } : {}),
    ...(input.km !== undefined ? { km: input.km } : {}),
    ...(input.taskId ? { taskId: input.taskId } : {}),
    ...(input.partId ? { partId: input.partId } : {}),
  };
}

export function addExpense(state: AppState, input: ExpenseInput, now: Date): AppState {
  const expense: Expense = { id: newExpenseId(now), ...clean(input) };
  return { ...state, expenses: sortExpenses([...state.expenses, expense]), updated: now.toISOString() };
}

export function updateExpense(state: AppState, id: string, input: ExpenseInput, now: Date): AppState {
  if (!state.expenses.some((e) => e.id === id)) return state;
  return {
    ...state,
    expenses: sortExpenses(state.expenses.map((e) => (e.id === id ? { id, ...clean(input) } : e))),
    updated: now.toISOString(),
  };
}

export function removeExpense(state: AppState, id: string, now: Date): AppState {
  if (!state.expenses.some((e) => e.id === id)) return state;
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id), updated: now.toISOString() };
}

/** Une los gastos de dos copias: el mismo gasto (mismo id) cuenta una vez y gana el del móvil. */
export function mergeExpenses(local: Expense[], incoming: Expense[]): Expense[] {
  const byId = new Map(incoming.map((e) => [e.id, e]));
  for (const e of local) byId.set(e.id, e);
  return sortExpenses([...byId.values()]);
}

export type YearSpending = { year: string; total: number; items: Expense[] };

/** Gastos por año, del más reciente al más antiguo; dentro de cada año, el último primero. */
export function spendingByYear(expenses: Expense[]): YearSpending[] {
  const years = new Map<string, Expense[]>();
  for (const e of expenses) {
    const year = e.date.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), e]);
  }
  return [...years.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, items]) => ({ year, total: sumEuros(items.map((e) => e.amount)), items: sortExpenses(items).reverse() }));
}

export function yearTotal(expenses: Expense[], year: string): number {
  return sumEuros(expenses.filter((e) => e.date.startsWith(year)).map((e) => e.amount));
}

/** Lo que costó un trabajo hecho: los gastos de esa tarea apuntados ese mismo día. */
export function costOfEntry(expenses: Expense[], taskId: string, date: string): number | null {
  const items = expenses.filter((e) => e.taskId === taskId && e.date === date.slice(0, 10));
  return items.length > 0 ? sumEuros(items.map((e) => e.amount)) : null;
}
