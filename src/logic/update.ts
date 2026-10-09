// Cuándo se pone sola una versión nueva de la web, sin pulsar «Actualizar».

export type PageMoment = {
  /** La app no está en pantalla. */
  hidden: boolean;
  /** Has tocado la pantalla desde que volviste a la app. */
  touched: boolean;
  /** Hay un campo de texto abierto: recargar borraría lo que estás escribiendo. */
  editing: boolean;
};

/**
 * Recargar ya si no te quita nada: la app está en segundo plano o acabas de volver a ella y aún no has tocado nada.
 * Si no, la versión nueva espera a la próxima vez que vuelvas a la app.
 */
export function applyUpdateNow(page: PageMoment): boolean {
  if (page.editing) return false;
  return page.hidden || !page.touched;
}
