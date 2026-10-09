import type { LogEntry } from '../data/eliminator500';
import { type AppState, type TorqueOverride, isTorqueKey } from './state';

const APP_ID = 'taller-moto';
const FORMAT = 1;

export class BackupError extends Error {}

export function serializeBackup(state: AppState, now: Date): string {
  const { lastExport: _lastExport, ...data } = state;
  return JSON.stringify(
    { app: APP_ID, format: FORMAT, bike: 'kawasaki-eliminator-500-se', exported: now.toISOString(), state: data },
    null,
    2,
  );
}

export function backupFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `taller-moto-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const isKm = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 10_000_000;

function parseLog(raw: unknown): Record<string, LogEntry[]> {
  if (!isRecord(raw)) throw new BackupError('La copia no tiene historial de mantenimiento.');
  const log: Record<string, LogEntry[]> = {};
  for (const [id, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) throw new BackupError(`El historial de «${id}» no es una lista.`);
    log[id] = entries.map((e) => {
      if (!isRecord(e) || !isKm(e.km) || !isDay(e.date)) {
        throw new BackupError(`Hay un registro de «${id}» sin km o sin fecha válidos.`);
      }
      return { km: Math.round(e.km), date: e.date.slice(0, 10) };
    });
  }
  return log;
}

function parseOverrides(raw: unknown): AppState['overrides'] {
  if (raw === undefined) return {};
  if (!isRecord(raw)) throw new BackupError('Los pares guardados de la copia no son válidos.');
  const out: AppState['overrides'] = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isTorqueKey(key)) continue;
    if (!isRecord(value) || typeof value.nm !== 'number' || !(value.nm > 0) || typeof value.source !== 'string') {
      throw new BackupError('Hay un par de apriete guardado sin valor o sin fuente.');
    }
    const override: TorqueOverride = {
      nm: value.nm,
      source: value.source,
      date: typeof value.date === 'string' ? value.date : '',
    };
    out[key] = override;
  }
  return out;
}

/**
 * Lee una copia de seguridad. Acepta el formato de esta app y también el documento
 * `{km, log, updated}` de la versión web (artifact).
 */
export function parseBackup(text: string): AppState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es una copia de seguridad válida (no es JSON).');
  }
  if (!isRecord(raw)) throw new BackupError('El archivo no es una copia de seguridad válida.');

  let data: Record<string, unknown>;
  if (raw.app === APP_ID) {
    if (raw.format !== FORMAT) throw new BackupError('Esta copia es de otra versión de la app.');
    if (!isRecord(raw.state)) throw new BackupError('La copia está vacía.');
    data = raw.state;
  } else if ('km' in raw && 'log' in raw) {
    data = raw;
  } else {
    throw new BackupError('Este archivo no es una copia de Taller Moto.');
  }

  if (!isKm(data.km)) throw new BackupError('La copia no tiene unos kilómetros válidos.');
  return {
    km: Math.round(data.km),
    kmDate: isDay(data.kmDate) ? data.kmDate.slice(0, 10) : undefined,
    log: parseLog(data.log),
    overrides: parseOverrides(data.overrides),
    updated: typeof data.updated === 'string' ? data.updated : new Date(0).toISOString(),
  };
}
