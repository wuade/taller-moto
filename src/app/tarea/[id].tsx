import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TASKS, type LogEntry } from '../../data/eliminator500';
import { formatDate, formatKm } from '../../logic/format';
import { describeInterval, isPendingMount, lastEntry, taskStatus } from '../../logic/status';
import { useStore } from '../../store/StoreProvider';
import { Body, Button, Card, Checkbox, Eyebrow, Pill, Screen, Title, TorqueCard } from '../../ui/components';
import { levelColors, useColors } from '../../ui/theme';

export default function TaskScreen() {
  // La pantalla no se apaga mientras sigues los pasos con las manos sucias.
  useKeepAwake();
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, markDone, deleteEntry } = useStore();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

  const task = TASKS.find((t) => t.id === id);
  if (!task) {
    return (
      <Screen>
        <Title>No encuentro esta tarea</Title>
        <Button label="Volver a Qué toca" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const entries = state.log[task.id] ?? [];
  const status = taskStatus(task, entries, state.km, new Date());
  const pending = isPendingMount(task, entries);
  const lc = levelColors(c, status.level);
  const last = lastEntry(entries);
  const history = [...entries].reverse();
  const doneToday = last?.km === state.km;

  return (
    <Screen>
      <Stack.Screen options={{ title: task.name }} />

      <View style={{ gap: 6 }}>
        <View style={styles.statusRow}>
          {pending ? (
            <Pill label="Sin montar" fg={c.warn} bg={c.warnBg} />
          ) : (
            <Pill label={status.label} fg={lc.fg} bg={lc.bg} />
          )}
          <Text style={{ color: c.muted, flexShrink: 1 }}>{pending ? task.pending : status.detail}</Text>
        </View>
        <Title>{task.name}</Title>
        <Body muted>
          {describeInterval(task)}. Fuente: {task.intervalSource}.
        </Body>
        {task.note ? <Body>{task.note}</Body> : null}
      </View>

      <Card>
        <Eyebrow>Necesitas</Eyebrow>
        <Body>{task.tools}</Body>
      </Card>

      <View style={{ gap: 10 }}>
        {task.steps.map((step, i) => (
          <View
            key={i}
            style={[
              styles.step,
              { backgroundColor: c.surface, borderColor: c.line, opacity: checked[i] ? 0.6 : 1 },
            ]}
          >
            <Checkbox
              checked={Boolean(checked[i])}
              label={`Paso ${i + 1} hecho`}
              onToggle={() => setChecked((s) => ({ ...s, [i]: !s[i] }))}
            />
            <View style={styles.stepBody}>
              <Body>
                <Text style={{ fontWeight: '800' }}>{i + 1}. </Text>
                {step.text}
              </Body>
              {step.torque ? <TorqueCard tkey={step.torque} override={state.overrides[step.torque]} /> : null}
            </View>
          </View>
        ))}
      </View>

      <Button
        label={doneToday ? `Ya registrado a ${formatKm(state.km)}` : `Marcar hecho a ${formatKm(state.km)}`}
        disabled={doneToday}
        onPress={() => {
          markDone(task.id);
          router.back();
        }}
      />
      <Body muted>
        Antes de marcarlo, comprueba que los km de la pantalla principal son los del cuentakilómetros.
      </Body>

      <View style={{ gap: 8 }}>
        <Eyebrow>Historial</Eyebrow>
        {history.length === 0 ? <Body muted>Aún sin registros.</Body> : null}
        {history.map((entry: LogEntry) => {
          const key = `${entry.km}|${entry.date}`;
          return (
            <View key={key} style={[styles.historyRow, { borderColor: c.line }]}>
              <Text style={{ color: c.ink, flex: 1, fontVariant: ['tabular-nums'] }}>
                {formatDate(entry.date)} · {formatKm(entry.km)}
                {entry.km === 0 ? ' (de fábrica)' : ''}
              </Text>
              {confirming === key ? (
                <View style={styles.confirmRow}>
                  <Button
                    small
                    kind="danger"
                    label="Borrar"
                    onPress={() => {
                      deleteEntry(task.id, entry);
                      setConfirming(null);
                    }}
                  />
                  <Button small kind="ghost" label="No" onPress={() => setConfirming(null)} />
                </View>
              ) : (
                <Button small kind="ghost" label="Quitar" onPress={() => setConfirming(key)} />
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  step: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  stepBody: { flex: 1, minWidth: 0 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, paddingVertical: 6 },
  confirmRow: { flexDirection: 'row', gap: 6 },
});
