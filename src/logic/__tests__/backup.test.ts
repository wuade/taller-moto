import { BackupError, parseBackup, serializeBackup } from '../backup';
import { type AppState, addEntry, countEntries, mergeStates, removeEntry, seedState } from '../state';

const NOW = new Date('2026-10-12T10:00:00.000Z');

describe('copia de seguridad', () => {
  it('lo que se exporta se vuelve a importar igual', () => {
    const state: AppState = {
      ...seedState(),
      overrides: { pinzaDel: { nm: 25, source: 'Máquina Motors', date: '2026-10-10T08:00:00.000Z' } },
      lastExport: '2026-10-01T00:00:00.000Z',
    };
    const back = parseBackup(serializeBackup(state, NOW));
    expect(back.km).toBe(state.km);
    expect(back.log).toEqual(state.log);
    expect(back.overrides).toEqual(state.overrides);
  });

  it('acepta el documento de la versión web {km, log, updated}', () => {
    const web = { km: 11818, updated: '2026-10-09T07:21:55Z', log: { cadena: [{ km: 9531, date: '2026-05-26' }] } };
    const s = parseBackup(JSON.stringify(web));
    expect(s.km).toBe(11818);
    expect(s.log.cadena).toEqual([{ km: 9531, date: '2026-05-26' }]);
    expect(s.overrides).toEqual({});
  });

  it('rechaza archivos que no son copias, con un mensaje claro', () => {
    expect(() => parseBackup('hola')).toThrow(BackupError);
    expect(() => parseBackup('{"foo":1}')).toThrow('no es una copia de Taller Moto');
    expect(() => parseBackup('{"km":-5,"log":{}}')).toThrow('kilómetros');
    expect(() => parseBackup('{"km":100,"log":{"aceite":[{"km":"x"}]}}')).toThrow('aceite');
  });

  it('un par guardado sin fuente no entra', () => {
    const bad = { km: 1, log: {}, overrides: { pinzaDel: { nm: 25 } } };
    expect(() => parseBackup(JSON.stringify(bad))).toThrow('sin valor o sin fuente');
  });
});

describe('fusión de datos', () => {
  it('no pierde lo apuntado sin cobertura en ninguno de los dos lados', () => {
    const base = seedState();
    const phone = addEntry({ ...base, km: 11900 }, 'cadena', { km: 11900, date: '2026-10-10' }, NOW);
    const backup = addEntry({ ...base, km: 11950 }, 'bujias', { km: 11950, date: '2026-10-11' }, NOW);
    const merged = mergeStates(phone, backup);
    expect(merged.km).toBe(11950);
    expect(merged.log.cadena).toContainEqual({ km: 11900, date: '2026-10-10' });
    expect(merged.log.bujias).toContainEqual({ km: 11950, date: '2026-10-11' });
    expect(countEntries(merged.log)).toBe(countEntries(base.log) + 2);
  });

  it('el mismo trabajo en los dos lados cuenta una vez', () => {
    const a = addEntry(seedState(), 'aceite', { km: 15500, date: '2027-03-01' }, NOW);
    expect(countEntries(mergeStates(a, a).log)).toBe(countEntries(a.log));
  });

  it('el par confirmado más reciente gana', () => {
    const a: AppState = { ...seedState(), overrides: { bujias: { nm: 13, source: 'A', date: '2026-10-01' } } };
    const b: AppState = { ...seedState(), overrides: { bujias: { nm: 12, source: 'B', date: '2026-10-05' } } };
    expect(mergeStates(a, b).overrides.bujias?.source).toBe('B');
    expect(mergeStates(b, a).overrides.bujias?.source).toBe('B');
  });

  it('quitar un registro borra solo ese', () => {
    const s = addEntry(seedState(), 'cadena', { km: 11900, date: '2026-10-10' }, NOW);
    const r = removeEntry(s, 'cadena', { km: 11900, date: '2026-10-10' }, NOW);
    expect(r.log.cadena).toEqual(seedState().log.cadena);
  });
});
