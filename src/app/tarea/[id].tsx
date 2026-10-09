import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { TASKS, type LogEntry } from '../../data/eliminator500';
import { costOfEntry } from '../../logic/expenses';
import { formatDate, formatKm } from '../../logic/format';
import { formatEuros, parseEuros, sumEuros } from '../../logic/money';
import { unmountedPurchases } from '../../logic/parts';
import { describeInterval, isPendingMount, lastEntry, taskStatus } from '../../logic/status';
import { useStore } from '../../store/StoreProvider';
import {
  Body,
  Button,
  Card,
  Checkbox,
  Eyebrow,
  Pill,
  Screen,
  Title,
  TorqueCard,
  makeInputStyle,
} from '../../ui/components';
import { levelColors, useColors } from '../../ui/theme';

export default function TaskScreen() {
  // La pantalla no se apaga mientras sigues los pasos con las manos sucias.
  useKeepAwake();
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, markDone, deleteEntry } = useStore();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cost, setCost] = useState('');
  const [place, setPlace] = useState('');
  const [costError, setCostError] = useState<string | null>(null);

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
  // Lo comprado para este trabajo ya está en Gastos: al marcarlo hecho solo falta lo que cueste hacerlo.
  const bought = sumEuros(unmountedPurchases(state, task.id).map((e) => e.amount));

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

      {doneToday ? null : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.muted, fontSize: 13 }}>
            {bought > 0
              ? `Lo que compraste para esto ya está en Gastos (${formatEuros(bought)}). Apunta aquí solo la mano de obra y dónde se hizo (opcional).`
              : 'Lo que costó y dónde se hizo (opcional)'}
          </Text>
          <View style={styles.costRow}>
            <TextInput
              accessibilityLabel={bought > 0 ? 'Mano de obra, en euros' : 'Lo que costó, en euros'}
              placeholder={bought > 0 ? 'Mano de obra €' : 'Coste €'}
              placeholderTextColor={c.muted}
              keyboardType="decimal-pad"
              value={cost}
              onChangeText={(text) => {
                setCost(text);
                setCostError(null);
              }}
              style={[makeInputStyle(c), styles.costInput]}
            />
            <TextInput
              accessibilityLabel="Dónde se hizo"
              placeholder="Dónde"
              placeholderTextColor={c.muted}
              value={place}
              onChangeText={(text) => {
                setPlace(text);
                setCostError(null);
              }}
              style={[makeInputStyle(c), styles.placeInput]}
            />
          </View>
          {costError ? <Text style={{ color: c.danger }}>{costError}</Text> : null}
        </View>
      )}
      <Button
        label={doneToday ? `Ya registrado a ${formatKm(state.km)}` : `Marcar hecho a ${formatKm(state.km)}`}
        disabled={doneToday}
        onPress={() => {
          const amount = cost.trim() ? parseEuros(cost) : null;
          if (cost.trim() && amount === null) {
            return setCostError('Escribe el coste en euros, por ejemplo 85 o 120,50. Si no lo sabes, déjalo vacío.');
          }
          if (amount === null && place.trim()) {
            return setCostError('Para apuntar dónde se hizo, escribe también lo que costó (puede ser 0).');
          }
          markDone(task.id, amount !== null ? { amount, concept: task.name, place } : undefined);
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
          const paid = costOfEntry(state.expenses, task.id, entry.date);
          return (
            <View key={key} style={[styles.historyRow, { borderColor: c.line }]}>
              <Text style={{ color: c.ink, flex: 1, fontVariant: ['tabular-nums'] }}>
                {formatDate(entry.date)} · {formatKm(entry.km)}
                {entry.km === 0 ? ' (de fábrica)' : ''}
                {paid !== null ? ` · ${formatEuros(paid)}` : ''}
              </Text>
              {confirming === key ? (
                <View style={styles.confirmRow}>
                  <Button
                    small
                    kind="danger"
                    label={paid !== null ? 'Borrar con su gasto' : 'Borrar'}
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
  costRow: { flexDirection: 'row', gap: 8 },
  costInput: { flex: 1, minWidth: 0 },
  placeInput: { flex: 1.4, minWidth: 0 },
});
