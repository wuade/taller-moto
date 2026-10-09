// Formateo a mano: Hermes en Android no garantiza Intl completo.

export function formatInt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(n)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatKm(n: number): string {
  return `${formatInt(n)} km`;
}

/** 17.5 -> "17,5" */
export function formatDecimal(n: number): string {
  return String(n).replace('.', ',');
}

/** N·m a ft·lb redondeado, para llaves en libras. */
export function nmToFtLb(nm: number): number {
  return Math.round(nm * 0.7375621);
}

/** "2026-05-26" o ISO completo -> "26/05/2026" */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Fecha local de hoy como "AAAA-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
