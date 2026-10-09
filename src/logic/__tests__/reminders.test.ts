import { addExpense } from '../expenses';
import { BACKUP_EVERY_DAYS, KM_STALE_DAYS, backupReminder, daysBetween, kmAge } from '../reminders';
import { importInto, seedState } from '../state';

const at = (day: string) => new Date(`${day}T12:00:00.000Z`);

describe('días entre fechas', () => {
  it('cuenta días de calendario, también entre meses', () => {
    expect(daysBetween('2026-10-09', '2026-10-09')).toBe(0);
    expect(daysBetween('2026-09-30', '2026-10-02')).toBe(2);
    expect(daysBetween('2026-10-09T12:00:00.000Z', '2026-10-16')).toBe(7);
  });
});

describe('aviso de copia', () => {
  it('no avisa si no has apuntado nada', () => {
    expect(backupReminder(seedState(), at('2026-12-01'))).toBeNull();
  });

  it('avisa si hay datos y nunca has hecho copia', () => {
    const state = addExpense(seedState(), { date: '2026-10-09', amount: 10, concept: 'Aceite' }, at('2026-10-09'));
    expect(backupReminder(state, at('2026-10-09'))).toEqual({ lastDays: null });
  });

  it('con copia reciente o sin cambios desde la copia, no avisa', () => {
    const updated = '2026-10-10T12:00:00.000Z';
    expect(backupReminder({ updated, lastExport: '2026-10-09T12:00:00.000Z' }, at('2026-10-11'))).toBeNull();
    expect(backupReminder({ updated, lastExport: '2026-10-10T13:00:00.000Z' }, at('2026-12-01'))).toBeNull();
  });

  it(`avisa con cambios sin copia si la última copia tiene ${BACKUP_EVERY_DAYS} días o más`, () => {
    const state = { updated: '2026-10-15T12:00:00.000Z', lastExport: '2026-10-09T12:00:00.000Z' };
    expect(backupReminder(state, at('2026-10-15'))).toBeNull();
    expect(backupReminder(state, at('2026-10-16'))).toEqual({ lastDays: 7 });
  });

  it('lo importado con algo nuevo queda como cambio sin copia', () => {
    const local = { ...seedState(), lastExport: '2026-10-09T18:00:00.000Z', updated: '2026-10-09T17:50:00.000Z' };
    // El archivo es anterior a la copia, pero lo que trae no está en ella.
    const incoming = addExpense(seedState(), { date: '2026-08-06', amount: 30, concept: 'Corona' }, at('2026-10-09'));
    const result = importInto(local, { ...incoming, updated: '2026-10-09T17:25:00.000Z' }, at('2026-10-20'));
    expect(result.addedExpenses).toBe(1);
    expect(result.state.updated).toBe('2026-10-20T12:00:00.000Z');
    expect(backupReminder(result.state, at('2026-10-20'))).toEqual({ lastDays: 11 });
  });

  it('importar algo que no trae nada nuevo no cuenta como cambio', () => {
    const local = { ...seedState(), lastExport: '2026-10-09T18:00:00.000Z' };
    const result = importInto(local, { ...seedState(), updated: '2026-10-19T09:00:00.000Z' }, at('2026-10-20'));
    expect(result.added).toBe(0);
    expect(result.state.updated).toBe(local.updated);
    expect(backupReminder(result.state, at('2026-10-20'))).toBeNull();
  });
});

describe('km sin actualizar', () => {
  it(`cuenta los días y avisa a partir de ${KM_STALE_DAYS}`, () => {
    expect(kmAge('2026-10-09', at('2026-10-09'))).toEqual({ days: 0, stale: false });
    expect(kmAge('2026-10-09', at('2026-10-22'))).toEqual({ days: 13, stale: false });
    expect(kmAge('2026-10-09', at('2026-10-23'))).toEqual({ days: 14, stale: true });
  });

  it('sin día de lectura no dice nada, y una fecha futura cuenta como hoy', () => {
    expect(kmAge(undefined, at('2026-10-09'))).toBeNull();
    expect(kmAge('2026-10-12', at('2026-10-09'))).toEqual({ days: 0, stale: false });
  });
});
