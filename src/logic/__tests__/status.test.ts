import { SEED, TASKS, type Task } from '../../data/eliminator500';
import { addMonths, compareStatus, describeInterval, isPendingMount, lastEntry, taskStatus } from '../status';

const task = (id: string): Task => {
  const t = TASKS.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

// Mismo día que la foto del Excel: 09/10/2026 con 11.818 km.
const NOW = new Date(2026, 9, 9, 12, 0, 0);

describe('taskStatus con los datos de tu Excel', () => {
  it('bujías: quedan 182 km y avisa (aviso a 1.000 km)', () => {
    const s = taskStatus(task('bujias'), SEED.log.bujias, SEED.km, NOW);
    expect(s.kmLeft).toBe(182);
    expect(s.level).toBe('soon');
    expect(s.detail).toBe('faltan 182 km');
  });

  it('cadena: 1.287 km pasada desde la revisión de mayo', () => {
    const s = taskStatus(task('cadena'), SEED.log.cadena, SEED.km, NOW);
    expect(s.kmLeft).toBe(-1287);
    expect(s.level).toBe('over');
    expect(s.detail).toBe('1.287 km pasado');
  });

  it('aceite: faltan 3.713 km y 229 días, como en el Excel', () => {
    const s = taskStatus(task('aceite'), SEED.log.aceite, SEED.km, NOW);
    expect(s.kmLeft).toBe(3713);
    expect(s.daysLeft).toBe(229);
    expect(s.level).toBe('ok');
  });

  it('líquido de frenos: vence el 08/04/2027, faltan 181 días', () => {
    const s = taskStatus(task('liquido'), SEED.log.liquido, SEED.km, NOW);
    expect(s.daysLeft).toBe(181);
    expect(s.level).toBe('ok');
  });

  it('sin registros: "Sin registro"', () => {
    expect(taskStatus(task('aire'), [], 5000, NOW).level).toBe('none');
  });

  it('vence por tiempo aunque sobren km', () => {
    const s = taskStatus(task('aceite'), [{ km: 11000, date: '2025-09-01' }], 11818, NOW);
    expect(s.level).toBe('over');
    expect(s.detail).toContain('vencido hace');
  });

  it('avisa 30 días antes de una fecha', () => {
    const s = taskStatus(task('liquido'), [{ km: 0, date: '2024-11-01' }], 11818, NOW);
    expect(s.daysLeft).toBe(23);
    expect(s.level).toBe('soon');
  });
});

describe('utilidades', () => {
  it('addMonths respeta el fin de mes', () => {
    expect(new Date(addMonths('2025-01-31', 1)).toISOString().slice(0, 10)).toBe('2025-02-28');
    expect(new Date(addMonths('2025-04-08', 24)).toISOString().slice(0, 10)).toBe('2027-04-08');
  });

  it('lastEntry elige la de más km', () => {
    expect(
      lastEntry([
        { km: 9531, date: '2026-05-26' },
        { km: 1000, date: '2026-09-01' },
      ]),
    ).toEqual({ km: 9531, date: '2026-05-26' });
  });

  it('neumáticos y kit de arrastre están pendientes de montar hasta que se registran con km', () => {
    expect(isPendingMount(task('neumaticos'), SEED.log.neumaticos)).toBe(true);
    expect(isPendingMount(task('neumaticos'), [...SEED.log.neumaticos, { km: 11900, date: '2026-10-12' }])).toBe(false);
    expect(isPendingMount(task('aceite'), SEED.log.aceite)).toBe(false);
  });

  it('ordena primero lo vencido', () => {
    const rows = TASKS.map((t) => taskStatus(t, SEED.log[t.id], SEED.km, NOW)).sort(compareStatus);
    expect(rows[0].level).toBe('over');
  });

  it('describe el intervalo en palabras', () => {
    expect(describeInterval(task('aceite'))).toBe('Cada 6.000 km o 1 año');
    expect(describeInterval(task('liquido'))).toBe('Cada 24.000 km o 2 años');
    expect(describeInterval(task('latiguillos'))).toBe('Cada 4 años');
  });
});
