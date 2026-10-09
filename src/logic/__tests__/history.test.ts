import { addExpense } from '../expenses';
import { buildHistory } from '../history';
import { buildHistoryPdf } from '../historyPdf';
import { type AppState, addEntry, seedState } from '../state';

const NOW = new Date('2026-10-12T10:00:00.000Z');
const latin1 = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');

describe('historial', () => {
  it('agrupa los trabajos del mismo día y km, y deja fuera el estado de fábrica', () => {
    const { visits } = buildHistory(seedState(), NOW);
    // La semilla tiene la revisión de los 9.531 km (aceite, cadena y pastillas) y el resto a 0 km.
    expect(visits).toEqual([
      {
        date: '2026-05-26',
        km: 9531,
        jobs: ['Aceite y filtro', 'Cadena: engrasar y revisar holgura', 'Revisar pastillas y discos'],
        place: null,
      },
    ]);
  });

  it('pone dónde se hizo: el gasto de un trabajo de ese día, o uno de ese día con esos km', () => {
    let state = addExpense(seedState(), { date: '2026-05-26', km: 9531, amount: 100, concept: 'Revisión', place: 'Taller de prueba' }, NOW);
    state = addEntry({ ...state, km: 12000 }, 'bujias', { km: 12000, date: '2026-10-10' }, NOW);
    state = addExpense(state, { date: '2026-10-10', amount: 5, concept: 'Bujías', place: 'Garaje', taskId: 'bujias' }, NOW);
    // Otro gasto del mismo día sin trabajo ni km no cuenta como sitio.
    state = addExpense(state, { date: '2026-10-10', amount: 9, concept: 'Gasolina', place: 'Gasolinera' }, NOW);
    expect(buildHistory(state, NOW).visits.map((v) => [v.date, v.place])).toEqual([
      ['2026-05-26', 'Taller de prueba'],
      ['2026-10-10', 'Garaje'],
    ]);
  });

  it('lista los recambios comprados con el día en que se montaron', () => {
    let state: AppState = addExpense(seedState(), { date: '2026-09-27', amount: 10, concept: 'Neumático delantero', partId: 'neumaticoDel' }, NOW);
    state = addExpense(state, { date: '2026-08-06', amount: 10, concept: 'Cadena', partId: 'cadena' }, NOW);
    state = addExpense(state, { date: '2026-10-01', amount: 10, concept: 'Batería', partId: 'bateria' }, NOW);
    state = addExpense(state, { date: '2026-10-02', amount: 10, concept: 'Gasolina' }, NOW);
    state = addEntry({ ...state, km: 12100 }, 'neumaticos', { km: 12100, date: '2026-10-11' }, NOW);
    expect(buildHistory(state, NOW).parts.map((p) => [p.date, p.concept, p.mountedOn, p.hasJob])).toEqual([
      ['2026-08-06', 'Cadena', null, true],
      ['2026-09-27', 'Neumático delantero', '2026-10-11', true],
      ['2026-10-01', 'Batería', null, false],
    ]);
  });

  it('lo próximo empieza por lo que falta montar', () => {
    const { plan } = buildHistory(seedState(), NOW);
    expect(plan[0]).toMatchObject({ status: 'Montar' });
    expect(plan.length).toBeGreaterThan(5);
  });
});

describe('historial en PDF', () => {
  it('lleva la moto, los km, los trabajos y el pie de página, sin importes', () => {
    const state = addExpense(seedState(), { date: '2026-05-26', km: 9531, amount: 123.45, concept: 'Revisión', place: 'Taller de prueba' }, NOW);
    const raw = latin1(buildHistoryPdf(buildHistory(state, NOW)));
    expect(raw).toContain('(Kawasaki Eliminator 500 SE) Tj');
    expect(raw).toContain('(11.818 km, apuntados el 09/10/2026.');
    expect(raw).toContain('(26/05/2026) Tj');
    expect(raw).toContain('(Taller de prueba) Tj');
    expect(raw).toContain('(P\xe1gina 1 de 1) Tj');
    expect(raw).not.toContain('123,45');
  });

  it('con muchos trabajos sigue en más páginas y repite la cabecera de la tabla', () => {
    let state = seedState();
    for (let i = 1; i <= 90; i++) {
      const date = `2027-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`;
      state = addEntry({ ...state, km: 12000 + i * 100 }, 'cadena', { km: 12000 + i * 100, date }, NOW);
    }
    const raw = latin1(buildHistoryPdf(buildHistory(state, NOW)));
    const pages = Number(/\/Count (\d+)/.exec(raw)?.[1]);
    expect(pages).toBeGreaterThan(1);
    expect(raw).toContain(`(P\xe1gina ${pages} de ${pages}) Tj`);
    // La cabecera «Trabajos» se repite en cada página de la tabla.
    expect((raw.match(/\(Trabajos\) Tj/g) ?? []).length).toBeGreaterThan(1);
  });
});
