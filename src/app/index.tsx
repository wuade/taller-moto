import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BIKE, TASKS } from '../data/eliminator500';
import { yearTotal } from '../logic/expenses';
import { formatDate, formatInt } from '../logic/format';
import { formatEuros } from '../logic/money';
import { unmountedParts } from '../logic/parts';
import { compareStatus, describeInterval, isPendingMount, taskStatus } from '../logic/status';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Heading, Notice, Screen, TaskRow, Title, makeInputStyle } from '../ui/components';
import { mono, useColors } from '../ui/theme';

function KmCard() {
  const c = useColors();
  const { state, setKm } = useStore();
  const [kmText, setKmText] = useState(String(state.km));
  const [kmError, setKmError] = useState<string | null>(null);

  const saveKm = () => {
    const value = Number(kmText.replace(/[.\s]/g, ''));
    if (!Number.isInteger(value) || value < 0 || value > 999999) {
      setKmError('Escribe los km del cuentakilómetros, sin decimales.');
      return;
    }
    setKmError(null);
    setKm(value);
  };

  return (
    <Card>
      <Eyebrow>Kilómetros actuales</Eyebrow>
      <View style={styles.kmRow}>
        <TextInput
          accessibilityLabel="Kilómetros actuales"
          value={kmText}
          onChangeText={setKmText}
          onSubmitEditing={saveKm}
          keyboardType="number-pad"
          returnKeyType="done"
          style={[makeInputStyle(c), styles.kmInput]}
        />
        <Text style={{ color: c.muted, fontSize: 16 }}>km</Text>
        <Button small kind="ghost" label="Guardar" onPress={saveKm} />
      </View>
      {kmError ? <Text style={{ color: c.danger }}>{kmError}</Text> : null}
    </Card>
  );
}

export default function Home() {
  const c = useColors();
  const { state, saveError } = useStore();

  const { pending, rest, counts } = useMemo(() => {
    const now = new Date();
    const rows = TASKS.map((task) => ({ task, status: taskStatus(task, state.log[task.id], state.km, now) }));
    const pending = rows.filter((r) => isPendingMount(r.task, state.log[r.task.id]));
    const rest = rows.filter((r) => !pending.includes(r)).sort((a, b) => compareStatus(a.status, b.status));
    const counts = {
      over: rest.filter((r) => r.status.level === 'over').length,
      soon: rest.filter((r) => r.status.level === 'soon').length,
    };
    return { pending, rest, counts };
  }, [state.log, state.km]);

  const needsBackup = !state.lastExport || state.updated > state.lastExport;
  const year = String(new Date().getFullYear());
  const spent = yearTotal(state.expenses, year);
  const unmounted = unmountedParts(state).length;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Eyebrow>Mantenimiento</Eyebrow>
        <Title>{BIKE.name}</Title>
        <Body muted>{BIKE.detail}</Body>
      </View>

      {/* key: si los km cambian por una copia importada, el campo vuelve a empezar con el valor nuevo. */}
      <KmCard key={state.km} />

      {saveError ? <Notice tone="danger">{saveError}</Notice> : null}

      {pending.length > 0 ? (
        <View style={[styles.pending, { borderColor: c.accent, backgroundColor: c.surface }]}>
          <Eyebrow>Piezas compradas, sin montar</Eyebrow>
          {pending.map(({ task, status }) => (
            <TaskRow
              key={task.id}
              task={task}
              status={{ ...status, label: 'Montar', level: 'soon' }}
              subtitle={task.pending ?? ''}
              onPress={() => router.push(`/tarea/${task.id}`)}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <Heading>Qué toca</Heading>
        <Body muted>
          {counts.over === 0 && counts.soon === 0
            ? 'Todo al día.'
            : [
                counts.over > 0 ? `${counts.over} vencida${counts.over > 1 ? 's' : ''}` : null,
                counts.soon > 0 ? `${counts.soon} pronto` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </Body>
      </View>
      <View style={{ gap: 8 }}>
        {rest.map(({ task, status }) => (
          <TaskRow
            key={task.id}
            task={task}
            status={status}
            subtitle={`${describeInterval(task)} · ${status.detail}`}
            onPress={() => router.push(`/tarea/${task.id}`)}
          />
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <Button kind="ghost" label="Pares de apriete" onPress={() => router.push('/pares')} />
        <Button
          kind="ghost"
          label={unmounted > 0 ? `Recambios · ${unmounted} sin montar` : 'Recambios'}
          onPress={() => router.push('/recambios')}
        />
        <Button kind="ghost" label="Avisos en el Calendario" onPress={() => router.push('/avisos')} />
        <Button
          kind="ghost"
          label={spent > 0 ? `Gastos · ${formatEuros(spent)} en ${year}` : 'Gastos'}
          onPress={() => router.push('/gastos')}
        />
        <Button
          kind="ghost"
          label={needsBackup ? 'Copia de seguridad · cambios sin copia' : 'Copia de seguridad'}
          onPress={() => router.push('/copia')}
        />
      </View>

      <Text style={[styles.foot, { color: c.muted }]}>
        Los datos se guardan en este dispositivo y funcionan sin cobertura.
        {state.lastExport ? ` Última copia: ${formatDate(state.lastExport)}.` : ' Aún no has hecho ninguna copia.'}
        {` ${formatInt(Object.values(state.log).reduce((n, e) => n + e.length, 0))} registros.`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kmInput: { fontFamily: mono, fontSize: 22, width: 150, fontVariant: ['tabular-nums'] },
  pending: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, padding: 12, gap: 8 },
  foot: { fontSize: 12, lineHeight: 17 },
});
