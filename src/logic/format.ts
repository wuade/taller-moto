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

/** "26/05/2026", "26/5/26" o "26-05-2026" -> "2026-05-26". null si no es una fecha que exista. */
export function parseDayInput(text: string): string | null {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text.trim());
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
