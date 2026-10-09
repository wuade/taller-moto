import { PARTS, TASKS } from '../../data/eliminator500';
import { parseBackup, serializeBackup } from '../backup';
import { addExpense } from '../expenses';
import { partGroups, purchasesOf, unmountedParts } from '../parts';
import { type AppState, addEntry, seedState } from '../state';

const NOW = new Date('2026-10-12T10:00:00.000Z');
const part = (id: string) => {
  const found = PARTS.find((p) => p.id === id);
  if (!found) throw new Error(id);
  return found;
};
const buy = (state: AppState, partId: string, date: string, amount = 10) =>
  addExpense(state, { date, amount, concept: part(partId).name, partId }, NOW);

describe('recambios', () => {
  it('cada recambio tiene un id único y su trabajo existe', () => {
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
    const tasks = new Set(TASKS.map((t) => t.id));
    for (const p of PARTS) if (p.taskId) expect(tasks.has(p.taskId)).toBe(true);
  });

  it('los grupos salen en el orden de la lista y no se pierde ninguno', () => {
    const groups = partGroups();
    expect(groups.map((g) => g.title)).toEqual(['Motor', 'Frenos', 'Transmisión', 'Neumáticos', 'Refrigeración', 'Eléctrico']);
    expect(groups.flatMap((g) => g.parts)).toHaveLength(PARTS.length);
  });

  it('una compra queda sin montar hasta que se hace su trabajo ese día o después', () => {
    let state = buy(seedState(), 'neumaticoDel', '2026-09-27');
    expect(purchasesOf(state, part('neumaticoDel'))[0].mounted).toBe(false);
    expect(unmountedParts(state).map((p) => p.id)).toEqual(['neumaticoDel']);

    state = addEntry({ ...state, km: 12100 }, 'neumaticos', { km: 12100, date: '2026-10-20' }, NOW);
    expect(purchasesOf(state, part('neumaticoDel'))[0].mounted).toBe(true);
    expect(unmountedParts(state)).toEqual([]);
  });

  it('un trabajo anterior a la compra no la monta', () => {
    const state = buy(seedState(), 'filtroAceite', '2026-10-01');
    // La revisión de los 9.531 km fue el 26/05/2026, antes de comprar el filtro.
    expect(purchasesOf(state, part('filtroAceite'))[0].mounted).toBe(false);
  });

  it('un recambio sin trabajo queda como comprado', () => {
    const state = buy(seedState(), 'bateria', '2026-10-01', 75);
    expect(purchasesOf(state, part('bateria'))[0].mounted).toBeNull();
    expect(unmountedParts(state)).toEqual([]);
  });

  it('la compra más reciente va primero', () => {
    let state = buy(seedState(), 'bujia', '2025-01-10');
    state = buy(state, 'bujia', '2026-10-09');
    expect(purchasesOf(state, part('bujia')).map((p) => p.expense.date)).toEqual(['2026-10-09', '2025-01-10']);
  });
});

describe('recambios en copias de seguridad', () => {
  it('la compra conserva su recambio al exportar e importar', () => {
    const state = buy(seedState(), 'corona', '2026-08-06', 30);
    const back = parseBackup(serializeBackup(state, NOW));
    expect(back.expenses[0].partId).toBe('corona');
  });

  it('acepta las copias de formato 1 y rechaza las de una versión más nueva', () => {
    const doc = (format: number) =>
      JSON.stringify({ app: 'taller-moto', format, state: { km: 100, log: {}, updated: NOW.toISOString() } });
    expect(parseBackup(doc(1)).km).toBe(100);
    expect(() => parseBackup(doc(3))).toThrow(/versión más nueva/);
  });
});
