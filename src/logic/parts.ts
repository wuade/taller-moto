import { PARTS, type Part } from '../data/eliminator500';
import type { Expense } from './expenses';
import type { AppState } from './state';

// Recambios: lo que se ha comprado de cada uno y si ya está montado.

export type Purchase = {
  expense: Expense;
  /** true si su trabajo se hizo ese día o después; false si aún no; null si el recambio no tiene trabajo. */
  mounted: boolean | null;
};

/** Compras apuntadas de un recambio, la más reciente primero. */
export function purchasesOf(state: AppState, part: Part): Purchase[] {
  // Los registros a 0 km son el estado de fábrica, no un montaje.
  const done = part.taskId ? (state.log[part.taskId] ?? []).filter((entry) => entry.km > 0) : [];
  return state.expenses
    .filter((e) => e.partId === part.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .map((expense) => ({
      expense,
      mounted: part.taskId ? done.some((entry) => entry.date.slice(0, 10) >= expense.date) : null,
    }));
}

/** Recambios cuya última compra aún no está montada. */
export function unmountedParts(state: AppState, parts: Part[] = PARTS): Part[] {
  return parts.filter((part) => purchasesOf(state, part)[0]?.mounted === false);
}

export type PartGroup = { title: string; parts: Part[] };

/** Recambios por grupo, en el orden de la lista. */
export function partGroups(parts: Part[] = PARTS): PartGroup[] {
  const groups: PartGroup[] = [];
  for (const part of parts) {
    const group = groups.find((g) => g.title === part.group);
    if (group) group.parts.push(part);
    else groups.push({ title: part.group, parts: [part] });
  }
  return groups;
}

export function partName(partId: string | undefined): string | undefined {
  return PARTS.find((p) => p.id === partId)?.name;
}
