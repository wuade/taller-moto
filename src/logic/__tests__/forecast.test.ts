import { TASKS, type Task } from '../../data/eliminator500';
import { BackupError, parseBackup, serializeBackup } from '../backup';
import { forecastAll, forecastDue, kmPerDay } from '../forecast';
import { buildIcs, foldLine } from '../ics';
import { type AppState, mergeStates, seedState } from '../state';

const task = (id: string): Task => {
  const t = TASKS.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

// Datos del Excel: 11.818 km el 09/10/2026, matriculada el 08/04/2025 con 0 km.
const TODAY = '2026-10-09';
const octets = (text: string) => new TextEncoder().encode(text).length;
const seed = seedState();
const rate = kmPerDay(seed);

describe('fechas de cada trabajo', () => {
  it('la media sale de 0 km el 08/04/2025 a 11.818 km el 09/10/2026 (549 días)', () => {
    expect(rate).toBeCloseTo(11818 / 549, 6);
  });

  it('aceite: los 3.713 km que faltan llegan antes que el año (31/03/2027)', () => {
    const f = forecastDue(task('aceite'), seed.log.aceite, seed, rate, TODAY);
    expect(f).toMatchObject({ date: '2027-03-31', basis: 'km', atKm: 15531, late: false });
  });

  it('líquido de frenos: manda la fecha, a los 2 años (08/04/2027)', () => {
    const f = forecastDue(task('liquido'), seed.log.liquido, seed, rate, TODAY);
    expect(f).toMatchObject({ date: '2027-04-08', basis: 'fecha', atKm: 24000, late: false });
  });

  it('latiguillos: solo por tiempo, 4 años', () => {
    const f = forecastDue(task('latiguillos'), seed.log.latiguillos, seed, rate, TODAY);
    expect(f).toMatchObject({ date: '2029-04-08', basis: 'fecha', atKm: null });
  });

  it('cadena: ya tocaba, así que el aviso es hoy', () => {
    const f = forecastDue(task('cadena'), seed.log.cadena, seed, rate, TODAY);
    expect(f).toMatchObject({ date: TODAY, late: true });
  });

  it('las piezas sin montar no tienen fecha', () => {
    const { items } = forecastAll(seed, TODAY);
    expect(items.map((i) => i.task.id)).not.toContain('neumaticos');
    expect(items.map((i) => i.task.id)).not.toContain('arrastre');
    expect(items[0].task.id).toBe('cadena');
  });

  it('sin historial suficiente no estima por km: solo quedan los trabajos con fecha', () => {
    const fresh: AppState = { ...seed, km: 300, kmDate: '2025-04-20' };
    expect(kmPerDay(fresh)).toBeNull();
    const { items, undated } = forecastAll(fresh, '2025-04-20');
    expect(items.every((i) => i.basis === 'fecha')).toBe(true);
    expect(undated.map((t) => t.id)).toContain('bujias');
  });

  it('sin fecha de lectura de km usa el último cambio de datos', () => {
    const { kmDate: _kmDate, ...old } = seed;
    expect(kmPerDay(old)).toBeCloseTo(rate ?? 0, 6);
  });
});

describe('archivo de calendario', () => {
  const now = new Date('2026-10-09T10:00:00Z');
  const { items } = forecastAll(seed, TODAY);
  const ics = buildIcs(items, rate, now);
  const lines = ics.split('\r\n');

  it('tiene un evento de día completo por trabajo, con dos avisos', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(items.length);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(items.length * 2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20270331\r\nDTEND;VALUE=DATE:20270401');
    expect(ics).toContain('TRIGGER:-P6DT15H');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('ninguna línea pasa de 75 octetos y el texto va escapado', () => {
    for (const line of lines) expect(octets(line)).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('SUMMARY:Moto: Aceite y filtro');
    expect(unfolded).toContain('Cada 6.000 km o 1 año.');
    expect(unfolded).toContain('tocará hacia los 15.531 km si sigues a unos 22 km al día');
    expect(unfolded).toContain('\\n');
  });

  it('partir y volver a unir una línea larga con acentos deja el mismo texto', () => {
    const long = `DESCRIPTION:${'Líquido de frenos y pastillas: revisión completa. '.repeat(4)}`;
    const folded = foldLine(long);
    for (const part of folded.split('\r\n')) expect(octets(part)).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(long);
  });
});

describe('fecha de la lectura de km en copias y fusiones', () => {
  it('la copia guarda y recupera la fecha de los km', () => {
    const back = parseBackup(serializeBackup({ ...seed, km: 12000, kmDate: '2026-10-20' }, new Date()));
    expect(back).toMatchObject({ km: 12000, kmDate: '2026-10-20' });
    expect(() => parseBackup('{"km":1,"log":{},"kmDate":5}')).not.toThrow(BackupError);
  });

  it('al fusionar gana la lectura con más km, con su fecha', () => {
    const phone: AppState = { ...seed, km: 12100, kmDate: '2026-10-15' };
    const backup: AppState = { ...seed, km: 12050, kmDate: '2026-10-20' };
    expect(mergeStates(phone, backup)).toMatchObject({ km: 12100, kmDate: '2026-10-15' });
    expect(mergeStates(backup, phone)).toMatchObject({ km: 12100, kmDate: '2026-10-15' });
  });
});
