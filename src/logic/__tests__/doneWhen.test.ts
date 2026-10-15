import { parseDoneWhen } from '../doneWhen';

const now = new Date('2026-10-15T10:00:00.000Z');
const current = { taskId: 'bujias', km: 12300, log: { bujias: [{ km: 0, date: '2025-04-08' }] }, now };

describe('trabajo hecho otro día', () => {
  it('acepta la fecha y los km de ese día, escritos a mano', () => {
    expect(parseDoneWhen('09/10/2026', '11.950', current)).toEqual({ date: '2026-10-09', km: 11950 });
    expect(parseDoneWhen('9/10/26', '11950', current)).toEqual({ date: '2026-10-09', km: 11950 });
    // Mismo día y los km actuales también vale.
    expect(parseDoneWhen('15/10/2026', '12300', current)).toEqual({ date: '2026-10-15', km: 12300 });
  });

  it('no acepta fechas futuras, anteriores a la matriculación o mal escritas', () => {
    expect(parseDoneWhen('16/10/2026', '12000', current)).toEqual({ error: expect.stringMatching(/aún no ha llegado/) });
    expect(parseDoneWhen('07/04/2025', '10', current)).toEqual({ error: expect.stringMatching(/08\/04\/2025/) });
    expect(parseDoneWhen('31/02/2026', '12000', current)).toEqual({ error: expect.stringMatching(/09\/10\/2026/) });
  });

  it('no acepta km vacíos, a cero, con decimales o por encima de los actuales', () => {
    expect(parseDoneWhen('09/10/2026', '', current)).toEqual({ error: expect.stringMatching(/sin decimales/) });
    expect(parseDoneWhen('09/10/2026', '0', current)).toEqual({ error: expect.stringMatching(/sin decimales/) });
    expect(parseDoneWhen('09/10/2026', '11950,5', current)).toEqual({ error: expect.stringMatching(/sin decimales/) });
    expect(parseDoneWhen('09/10/2026', '12400', current)).toEqual({ error: expect.stringMatching(/12\.300 km/) });
  });

  it('los km tienen que cuadrar con los de otros trabajos de antes y de después', () => {
    const log = {
      ...current.log,
      aceite: [
        { km: 0, date: '2025-04-08' },
        { km: 9531, date: '2026-05-26' },
        { km: 12100, date: '2026-10-12' },
      ],
    };
    const withLog = { ...current, log };
    // Una cifra de menos: el 26/05 ya tenía 9.531 km.
    expect(parseDoneWhen('09/10/2026', '1.950', withLog)).toEqual({
      error: 'El 26/05/2026 ya tenía 9.531 km: el 09/10/2026 no pudo tener menos. Revisa los km.',
    });
    // Más km que un trabajo de unos días después.
    expect(parseDoneWhen('09/10/2026', '12.200', withLog)).toEqual({
      error: 'El 12/10/2026 tenía 12.100 km: el 09/10/2026 no pudo tener más. Revisa los km.',
    });
    expect(parseDoneWhen('09/10/2026', '11.950', withLog)).toEqual({ date: '2026-10-09', km: 11950 });
    // El mismo día puede tener distintos km: se rueda entre un trabajo y otro.
    expect(parseDoneWhen('12/10/2026', '12.050', withLog)).toEqual({ date: '2026-10-12', km: 12050 });
  });

  it('no deja apuntar dos veces lo mismo, pero otro trabajo del mismo día y km sí', () => {
    const log = { bujias: [...current.log.bujias, { km: 11950, date: '2026-10-09' }] };
    expect(parseDoneWhen('09/10/2026', '11950', { ...current, log })).toEqual({
      error: expect.stringMatching(/ya está apuntado/),
    });
    expect(parseDoneWhen('09/10/2026', '11950', { ...current, taskId: 'aceite', log })).toEqual({
      date: '2026-10-09',
      km: 11950,
    });
  });
});
