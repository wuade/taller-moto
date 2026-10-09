import { formatInt } from './format';

// Importes en euros: se guardan con 2 decimales y se suman en céntimos para no arrastrar decimales.

const MAX_EUROS = 1_000_000;

/**
 * Lee un importe escrito a mano: "85", "85,5", "1.234,56", "85.50" o "85 €".
 * Devuelve null si no es un importe válido.
 */
export function parseEuros(text: string): number | null {
  const t = text.replace(/\s|€|eur/gi, '');
  let plain: string;
  if (t.includes(',')) {
    // Con coma decimal, los puntos son de miles.
    plain = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    plain = t.replace(/\./g, '');
  } else {
    plain = t;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) return null;
  const value = Number(plain);
  return value <= MAX_EUROS ? roundCents(value) : null;
}

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function sumEuros(amounts: number[]): number {
  return amounts.reduce((cents, a) => cents + Math.round(a * 100), 0) / 100;
}

/** 1234.5 -> "1.234,50 €" */
export function formatEuros(n: number): string {
  const cents = Math.round(Math.abs(n) * 100);
  const sign = n < 0 && cents > 0 ? '-' : '';
  return `${sign}${formatInt(Math.floor(cents / 100))},${String(cents % 100).padStart(2, '0')} €`;
}

/** 85.5 -> "85,50", para rellenar un campo de texto. */
export function eurosInput(n: number): string {
  return formatEuros(n).replace(/\./g, '').replace(' €', '');
}
