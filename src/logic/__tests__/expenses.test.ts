import { parseBackup, serializeBackup } from '../backup';
import {
  addExpense,
  costOfEntry,
  mergeExpenses,
  removeExpense,
  spendingByYear,
  updateExpense,
  yearTotal,
} from '../expenses';
import { parseDayInput } from '../format';
import { eurosInput, formatEuros, parseEuros, sumEuros } from '../money';
import { addEntry, mergeStates, removeEntry, seedState } from '../state';

const NOW = new Date('2026-10-12T10:00:00.000Z');

describe('importes', () => {
  it('lee importes escritos como en España', () => {
    expect(parseEuros('85')).toBe(85);
    expect(parseEuros('85,5')).toBe(85.5);
    expect(parseEuros('120,25 €')).toBe(120.25);
    expect(parseEuros('1.234,56')).toBe(1234.56);
    expect(parseEuros('1.234')).toBe(1234);
    expect(parseEuros('85.50')).toBe(85.5);
    expect(parseEuros('0')).toBe(0);
  });

  it('rechaza lo que no es un importe', () => {
    for (const bad of ['', 'abc', '-5', '1,234,5', '12,345', '1.2.3', '85,555', '2000000']) {
      expect(parseEuros(bad)).toBeNull();
    }
  });

  it('escribe los importes con coma y separador de miles', () => {
    expect(formatEuros(1234.5)).toBe('1.234,50 €');
    expect(formatEuros(0)).toBe('0,00 €');
    expect(formatEuros(0.1 + 0.2)).toBe('0,30 €');
    expect(eurosInput(1234.5)).toBe('1234,50');
  });

  it('suma en céntimos, sin arrastrar decimales', () => {
    expect(sumEuros([0.1, 0.2])).toBe(0.3);
    expect(sumEuros([19.99, 0.01, 100.1])).toBe(120.1);
  });
});

describe('fechas escritas a mano', () => {
  it('entiende dd/mm/aaaa y variantes', () => {
    expect(parseDayInput('26/05/2026')).toBe('2026-05-26');
    expect(parseDayInput('6/5/26')).toBe('2026-05-06');
    expect(parseDayInput(' 01-12-2025 ')).toBe('2025-12-01');
  });

  it('rechaza fechas que no existen', () => {
    for (const bad of ['31/02/2026', '2026-05-26', '26/13/2026', 'ayer', '']) expect(parseDayInput(bad)).toBeNull();
  });
});

describe('gastos', () => {
  const base = seedState();

  it('se agrupan por año con su total, lo más reciente primero', () => {
    let s = addExpense(base, { date: '2025-06-27', amount: 100, concept: 'Accesorio' }, NOW);
    s = addExpense(s, { date: '2026-05-26', amount: 120.5, concept: 'Revisión', place: 'Taller' }, NOW);
    s = addExpense(s, { date: '2026-09-27', amount: 50.25, concept: 'Neumático' }, NOW);
    const years = spendingByYear(s.expenses);
    expect(years.map((y) => [y.year, y.total])).toEqual([
      ['2026', 170.75],
      ['2025', 100],
    ]);
    expect(years[0].items.map((e) => e.concept)).toEqual(['Neumático', 'Revisión']);
    expect(yearTotal(s.expenses, '2026')).toBe(170.75);
    expect(yearTotal(s.expenses, '2024')).toBe(0);
  });

  it('limpia lo escrito: sin espacios de más y sin «dónde» vacío', () => {
    const s = addExpense(base, { date: '2026-01-02', amount: 10, concept: '  Aceite ', place: '  ' }, NOW);
    expect(s.expenses[0]).toMatchObject({ concept: 'Aceite', amount: 10, date: '2026-01-02' });
    expect(s.expenses[0].place).toBeUndefined();
    expect(s.updated).toBe(NOW.toISOString());
  });

  it('cambiar y borrar un gasto', () => {
    const s1 = addExpense(base, { date: '2026-01-02', amount: 10, concept: 'Aceite' }, NOW);
    const id = s1.expenses[0].id;
    const s2 = updateExpense(s1, id, { date: '2026-01-03', amount: 12.5, concept: 'Aceite 10W-40' }, NOW);
    expect(s2.expenses).toEqual([{ id, date: '2026-01-03', amount: 12.5, concept: 'Aceite 10W-40' }]);
    expect(removeExpense(s2, id, NOW).expenses).toEqual([]);
    expect(removeExpense(s2, 'otro', NOW)).toBe(s2);
  });

  it('el coste de un trabajo hecho es lo apuntado para esa tarea ese día', () => {
    let s = addEntry(base, 'aceite', { km: 15500, date: '2027-03-01' }, NOW);
    s = addExpense(s, { date: '2027-03-01', amount: 40, concept: 'Aceite', taskId: 'aceite', km: 15500 }, NOW);
    expect(costOfEntry(s.expenses, 'aceite', '2027-03-01')).toBe(40);
    expect(costOfEntry(s.expenses, 'aceite', '2027-03-02')).toBeNull();
    expect(costOfEntry(s.expenses, 'cadena', '2027-03-01')).toBeNull();
  });

  it('quitar un trabajo hecho quita también su gasto, y no los demás', () => {
    let s = addEntry(base, 'aceite', { km: 15500, date: '2027-03-01' }, NOW);
    s = addExpense(s, { date: '2027-03-01', amount: 40, concept: 'Aceite', taskId: 'aceite' }, NOW);
    s = addExpense(s, { date: '2027-03-01', amount: 9, concept: 'Guantes' }, NOW);
    const after = removeEntry(s, 'aceite', { km: 15500, date: '2027-03-01' }, NOW);
    expect(after.expenses.map((e) => e.concept)).toEqual(['Guantes']);
  });
});

describe('gastos en copias de seguridad', () => {
  it('se exportan y se vuelven a importar igual', () => {
    const s = addExpense(
      seedState(),
      { date: '2026-05-26', amount: 120.5, concept: 'Revisión', place: 'Taller', km: 9531, taskId: 'aceite' },
      NOW,
    );
    expect(parseBackup(serializeBackup(s, NOW)).expenses).toEqual(s.expenses);
  });

  it('las copias de antes de los gastos se leen sin gastos', () => {
    expect(parseBackup(JSON.stringify({ km: 100, log: {} })).expenses).toEqual([]);
  });

  it('un gasto sin importe, concepto o fecha válidos no entra', () => {
    const bad = (e: object) => JSON.stringify({ km: 1, log: {}, expenses: [e] });
    expect(() => parseBackup(bad({ id: 'a', date: '2026-01-01', concept: 'x' }))).toThrow('gasto');
    expect(() => parseBackup(bad({ id: 'a', date: '2026-01-01', amount: 5, concept: ' ' }))).toThrow('gasto');
    expect(() => parseBackup(bad({ id: 'a', date: 'ayer', amount: 5, concept: 'x' }))).toThrow('gasto');
    expect(() => parseBackup(JSON.stringify({ km: 1, log: {}, expenses: {} }))).toThrow('lista');
  });

  it('al fusionar, el mismo gasto cuenta una vez y no se pierde ninguno', () => {
    const a = addExpense(seedState(), { date: '2026-01-01', amount: 5, concept: 'A' }, NOW);
    const b = addExpense(a, { date: '2026-02-01', amount: 7, concept: 'B' }, NOW);
    expect(mergeExpenses(a.expenses, b.expenses).map((e) => e.concept)).toEqual(['A', 'B']);
    expect(mergeStates(b, a).expenses).toHaveLength(2);
  });

  it('si un gasto cambió en el móvil, gana el del móvil', () => {
    const a = addExpense(seedState(), { date: '2026-01-01', amount: 5, concept: 'A' }, NOW);
    const id = a.expenses[0].id;
    const phone = updateExpense(a, id, { date: '2026-01-01', amount: 6, concept: 'A' }, NOW);
    expect(mergeStates(phone, a).expenses[0].amount).toBe(6);
  });
});
