import { applyUpdateNow } from '../update';

describe('versión nueva de la web', () => {
  it('se pone sola al volver a la app, antes de tocar nada', () => {
    expect(applyUpdateNow({ hidden: false, touched: false, editing: false })).toBe(true);
  });

  it('se pone sola con la app en segundo plano', () => {
    expect(applyUpdateNow({ hidden: true, touched: true, editing: false })).toBe(true);
  });

  it('espera si estás usando la app', () => {
    expect(applyUpdateNow({ hidden: false, touched: true, editing: false })).toBe(false);
  });

  it('nunca recarga con un campo de texto abierto', () => {
    expect(applyUpdateNow({ hidden: false, touched: false, editing: true })).toBe(false);
    expect(applyUpdateNow({ hidden: true, touched: false, editing: true })).toBe(false);
  });
});
