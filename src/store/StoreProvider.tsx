import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { LogEntry, TorqueKey } from '../data/eliminator500';
import { parseBackup } from '../logic/backup';
import { type ExpenseInput, addExpense, removeExpense, updateExpense } from '../logic/expenses';
import { todayIso } from '../logic/format';
import { type AppState, addEntry, countEntries, mergeStates, removeEntry, seedState } from '../logic/state';

// Todo se guarda en el propio móvil: la app funciona igual sin cobertura.
const STORAGE_KEY = 'taller-moto:state:v1';

type Store = {
  state: AppState;
  saveError: string | null;
  setKm: (km: number) => void;
  /** Marca un trabajo como hecho con los km actuales; si se indica, apunta también lo que costó. */
  markDone: (taskId: string, cost?: Pick<ExpenseInput, 'amount' | 'concept' | 'place'>) => void;
  deleteEntry: (taskId: string, entry: LogEntry) => void;
  setOverride: (key: TorqueKey, nm: number, source: string) => void;
  addExpense: (input: ExpenseInput) => void;
  updateExpense: (id: string, input: ExpenseInput) => void;
  removeExpense: (id: string) => void;
  clearOverride: (key: TorqueKey) => void;
  /** Une una copia con lo del móvil y dice cuántos trabajos y gastos nuevos ha traído. */
  importState: (incoming: AppState) => { added: number; addedExpenses: number };
  markExported: () => void;
};

const StoreContext = createContext<Store | null>(null);

function parseStored(raw: string): AppState {
  const state = parseBackup(raw);
  const lastExport = (JSON.parse(raw) as { lastExport?: unknown }).lastExport;
  return { ...state, lastExport: typeof lastExport === 'string' ? lastExport : undefined };
}

export function StoreProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (!raw) return setState(seedState());
        try {
          setState(parseStored(raw));
        } catch {
          // Datos guardados ilegibles: se parte del estado inicial en vez de bloquear la app.
          setState(seedState());
        }
      })
      .catch(() => !cancelled && setState(seedState()));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      .then(() => setSaveError(null))
      .catch(() => setSaveError('No se pudo guardar en el móvil. Haz una copia de seguridad.'));
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => (s ? fn(s) : s));
  }, []);

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    return {
      state,
      saveError,
      setKm: (km) =>
        update((s) => {
          const now = new Date();
          return { ...s, km, kmDate: todayIso(now), updated: now.toISOString() };
        }),
      markDone: (taskId, cost) =>
        update((s) => {
          const now = new Date();
          const date = todayIso(now);
          const done = addEntry(s, taskId, { km: s.km, date }, now);
          return cost ? addExpense(done, { ...cost, date, km: s.km, taskId }, now) : done;
        }),
      deleteEntry: (taskId, entry) => update((s) => removeEntry(s, taskId, entry, new Date())),
      setOverride: (key, nm, source) =>
        update((s) => {
          const now = new Date();
          return {
            ...s,
            overrides: { ...s.overrides, [key]: { nm, source, date: now.toISOString() } },
            updated: now.toISOString(),
          };
        }),
      addExpense: (input) => update((s) => addExpense(s, input, new Date())),
      updateExpense: (id, input) => update((s) => updateExpense(s, id, input, new Date())),
      removeExpense: (id) => update((s) => removeExpense(s, id, new Date())),
      clearOverride: (key) =>
        update((s) => {
          const overrides = { ...s.overrides };
          delete overrides[key];
          return { ...s, overrides, updated: new Date().toISOString() };
        }),
      importState: (incoming) => {
        const merged = mergeStates(state, incoming);
        setState(merged);
        return {
          added: countEntries(merged.log) - countEntries(state.log),
          addedExpenses: merged.expenses.length - state.expenses.length,
        };
      },
      markExported: () => update((s) => ({ ...s, lastExport: new Date().toISOString() })),
    };
  }, [state, saveError, update]);

  if (!store) return <>{fallback}</>;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore fuera de StoreProvider');
  return store;
}
