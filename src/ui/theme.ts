import { Platform, useColorScheme } from 'react-native';

import type { Confidence } from '../data/eliminator500';
import type { Level } from '../logic/status';

// Paleta de taller: grafito y el amarillo de una llave dinamométrica.
const light = {
  bg: '#eef0f2',
  surface: '#ffffff',
  ink: '#1c2228',
  muted: '#5c6670',
  line: '#d5dade',
  accent: '#e0a100',
  accentInk: '#1c2228',
  danger: '#c62e24',
  dangerBg: '#fbe9e7',
  warn: '#8a5700',
  warnBg: '#fff4d6',
  ok: '#2e7d4f',
  okBg: '#e5f3ea',
};

const dark: typeof light = {
  bg: '#14181c',
  surface: '#1d2329',
  ink: '#e7eaed',
  muted: '#9aa4ad',
  line: '#2f373f',
  accent: '#f2b51c',
  accentInk: '#14181c',
  danger: '#ff7a6e',
  dangerBg: '#3a1d1a',
  warn: '#f2c14e',
  warnBg: '#3a2f12',
  ok: '#6fcf97',
  okBg: '#16301f',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
});

export function levelColors(c: Colors, level: Level): { fg: string; bg: string } {
  switch (level) {
    case 'over':
      return { fg: c.danger, bg: c.dangerBg };
    case 'soon':
      return { fg: c.warn, bg: c.warnBg };
    case 'ok':
      return { fg: c.ok, bg: c.okBg };
    default:
      return { fg: c.muted, bg: c.bg };
  }
}

export function confidenceColors(c: Colors, conf: Confidence | 'user'): { fg: string; bg: string } {
  switch (conf) {
    case 'doc':
    case 'foto':
    case 'user':
      return { fg: c.accentInk, bg: c.accent };
    case 'cita':
    case 'probable':
      return { fg: c.warn, bg: c.warnBg };
    default:
      return { fg: c.danger, bg: c.dangerBg };
  }
}
