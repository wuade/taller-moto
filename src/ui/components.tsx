import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONFIDENCE, TORQUES, type Task, type TorqueKey } from '../data/eliminator500';
import { formatDecimal, nmToFtLb } from '../logic/format';
import type { TorqueOverride } from '../logic/state';
import type { TaskStatus } from '../logic/status';
import { type Colors, confidenceColors, levelColors, mono, useColors } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.screen, { paddingBottom: 32 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.eyebrow, { color: c.muted }]}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.ink }]}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.heading, { color: c.ink }]}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  const c = useColors();
  return <Text style={[styles.body, { color: muted ? c.muted : c.ink }]}>{children}</Text>;
}

type ButtonKind = 'primary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  small,
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  small?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  const palette: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.accent, fg: c.accentInk, border: c.accent },
    ghost: { bg: c.surface, fg: c.ink, border: c.line },
    danger: { bg: c.dangerBg, fg: c.danger, border: c.danger },
  };
  const p = palette[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        small ? styles.buttonSmall : styles.button,
        { backgroundColor: p.bg, borderColor: p.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[small ? styles.buttonSmallText : styles.buttonText, { color: p.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function TaskRow({
  task,
  status,
  subtitle,
  onPress,
}: {
  task: Task;
  status: TaskStatus;
  subtitle: string;
  onPress: () => void;
}) {
  const c = useColors();
  const lc = levelColors(c, status.level);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.name}. ${status.label}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.taskRow,
        { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: status.level === 'none' ? c.muted : lc.fg }]} />
      <View style={styles.taskText}>
        <Text style={[styles.taskName, { color: c.ink }]}>{task.name}</Text>
        <Text style={[styles.small, { color: c.muted }]}>{subtitle}</Text>
      </View>
      <Pill label={status.label} fg={lc.fg} bg={lc.bg} />
    </Pressable>
  );
}

export function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onToggle}
      style={[
        styles.checkbox,
        { borderColor: checked ? c.accent : c.muted, backgroundColor: checked ? c.accent : 'transparent' },
      ]}
    >
      {checked ? <Text style={[styles.checkMark, { color: c.accentInk }]}>✓</Text> : null}
    </Pressable>
  );
}

function TorqueValue({ nm, color }: { nm: number; color: string }) {
  return (
    <Text style={[styles.torqueValue, { color }]}>
      {formatDecimal(nm)} N·m
      <Text style={styles.torqueAlt}>{`  ≈ ${nmToFtLb(nm)} ft·lb`}</Text>
    </Text>
  );
}

/** Par de apriete de un paso: valor grande, nivel de confianza y fuente. */
export function TorqueCard({ tkey, override }: { tkey: TorqueKey; override?: TorqueOverride }) {
  const c = useColors();
  const t = TORQUES[tkey];

  if (override) {
    const cc = confidenceColors(c, 'user');
    return (
      <View style={[styles.torque, { backgroundColor: cc.bg }]}>
        <Text style={[styles.torqueTag, { color: cc.fg }]}>Verificado por ti · {t.part}</Text>
        <TorqueValue nm={override.nm} color={cc.fg} />
        <Text style={[styles.small, { color: cc.fg }]}>Fuente: {override.source}</Text>
      </View>
    );
  }

  const info = CONFIDENCE[t.conf];
  const cc = confidenceColors(c, t.conf);

  if (t.nm === null) {
    return (
      <View style={[styles.torque, styles.torqueMissing, { backgroundColor: cc.bg, borderColor: c.danger }]}>
        <Text style={[styles.torqueTag, { color: cc.fg }]}>⚠ Sin dato · {t.part}</Text>
        <Text style={[styles.small, { color: cc.fg }]}>{t.src}</Text>
        <Text style={[styles.small, { color: cc.fg, fontWeight: '600' }]}>{info.note}</Text>
      </View>
    );
  }

  const outlined = t.conf === 'cita' || t.conf === 'probable';
  return (
    <View
      style={[
        styles.torque,
        { backgroundColor: cc.bg },
        outlined && { borderWidth: 1, borderColor: c.warn },
      ]}
    >
      <Text style={[styles.torqueTag, { color: outlined ? c.warn : cc.fg }]}>
        {info.tag} · {t.part}
      </Text>
      <TorqueValue nm={t.nm} color={outlined ? c.ink : cc.fg} />
      <Text style={[styles.small, { color: outlined ? c.ink : cc.fg }]}>{t.src}</Text>
      {t.conf !== 'doc' ? (
        <Text style={[styles.small, { color: outlined ? c.muted : cc.fg }]}>{info.note}</Text>
      ) : null}
    </View>
  );
}

export function Notice({ children, tone = 'warn' }: { children: ReactNode; tone?: 'warn' | 'danger' }) {
  const c = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'danger' ? c.dangerBg : c.warnBg }]}>
      <Text style={[styles.body, { color: c.ink }]}>{children}</Text>
    </View>
  );
}

export function makeInputStyle(c: Colors) {
  return [styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.bg }];
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  heading: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonSmall: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  buttonSmallText: { fontSize: 14, fontWeight: '700' },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '700' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingRight: 12,
    overflow: 'hidden',
    minHeight: 64,
  },
  stripe: { width: 6, alignSelf: 'stretch', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  taskText: { flex: 1, minWidth: 0, gap: 2 },
  taskName: { fontSize: 16, fontWeight: '700' },
  checkbox: { width: 28, height: 28, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  torque: { borderRadius: 8, padding: 10, gap: 2, marginTop: 8 },
  torqueMissing: { borderWidth: 1, borderStyle: 'dashed' },
  torqueTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  torqueValue: { fontFamily: mono, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  torqueAlt: { fontSize: 13, fontWeight: '500' },
  notice: { borderRadius: 10, padding: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16 },
});
