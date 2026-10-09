import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { openInCalendar, saveCalendarFile } from '../calendar-io';
import { type DueForecast, forecastAll } from '../logic/forecast';
import { formatDate, formatInt, todayIso } from '../logic/format';
import { buildIcs, icsFileName } from '../logic/ics';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Heading, Notice, Screen } from '../ui/components';
import { mono, useColors } from '../ui/theme';

type Message = { tone: 'ok' | 'error'; text: string };

function basisText(item: DueForecast): string {
  if (item.basis === 'km' && item.atKm !== null) return `Hacia los ${formatInt(item.atKm)} km (fecha estimada)`;
  if (item.atKm !== null) return `Por fecha, salvo que llegues antes a ${formatInt(item.atKm)} km`;
  return 'Por fecha';
}

export default function RemindersScreen() {
  const c = useColors();
  const { state } = useStore();
  const [message, setMessage] = useState<Message | null>(null);
  const today = todayIso(new Date());
  const { rate, items, undated } = useMemo(() => forecastAll(state, today), [state, today]);

  // Sin esperas antes de abrir: el navegador solo deja abrir ventanas justo al pulsar.
  const open = () => {
    const now = new Date();
    openInCalendar(icsFileName(now), buildIcs(items, rate, now))
      .then((result) =>
        setMessage(
          result === 'blocked'
            ? { tone: 'error', text: 'El navegador no ha dejado abrir el Calendario. Usa «Guardar archivo».' }
            : {
                tone: 'ok',
                text: 'Si no se ha abierto el Calendario con los avisos, usa «Guardar archivo», ábrelo desde Archivos y pulsa «Añadir todo».',
              },
        ),
      )
      .catch(() => setMessage({ tone: 'error', text: 'No se pudo crear el calendario. Inténtalo de nuevo.' }));
  };

  const save = async () => {
    setMessage(null);
    try {
      const now = new Date();
      const result = await saveCalendarFile(icsFileName(now), buildIcs(items, rate, now));
      if (result === 'shared' || result === 'downloaded') {
        setMessage({
          tone: 'ok',
          text: 'Guárdalo en Archivos, ábrelo desde allí y pulsa «Añadir todo» para pasarlo al Calendario.',
        });
      } else if (result === 'unavailable') {
        setMessage({ tone: 'error', text: 'Este dispositivo no permite compartir archivos.' });
      }
    } catch {
      setMessage({ tone: 'error', text: 'No se pudo crear el archivo. Inténtalo de nuevo.' });
    }
  };

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Heading>Avisos en el Calendario</Heading>
        <Body>
          Pasa al Calendario del móvil cuándo toca cada trabajo, con aviso una semana antes y el mismo día a las 9:00.
        </Body>
        <Body muted>
          {rate
            ? `Las fechas por km son estimadas con tu media: unos ${formatInt(rate)} km al día. Si ruedas más, llegarán antes.`
            : 'Aún no hay historial suficiente para estimar fechas por km: solo salen los trabajos con fecha.'}
        </Body>
      </View>

      {items.length > 0 ? (
        <Card>
          <Eyebrow>Próximas fechas</Eyebrow>
          {items.map((item) => (
            <View key={item.task.id} style={[styles.row, { borderTopColor: c.line }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>{item.task.name}</Text>
                <Text style={{ color: c.muted, fontSize: 13 }}>{basisText(item)}</Text>
              </View>
              <Text style={[styles.date, { color: item.late ? c.danger : c.ink }]}>
                {item.late ? 'Ya toca' : formatDate(item.date)}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Notice>No hay trabajos con fecha todavía. Marca alguno como hecho o apunta los km.</Notice>
      )}

      {undated.length > 0 ? (
        <Body muted>Sin fecha por ahora: {undated.map((t) => t.name).join(', ')}.</Body>
      ) : null}

      <View style={{ gap: 8 }}>
        <Button label="Añadir al Calendario" onPress={open} disabled={items.length === 0} />
        <Button kind="ghost" label="Guardar archivo" onPress={save} disabled={items.length === 0} />
      </View>

      {message ? (
        message.tone === 'error' ? (
          <Notice tone="danger">{message.text}</Notice>
        ) : (
          <View style={{ backgroundColor: c.okBg, borderRadius: 10, padding: 12 }}>
            <Text style={{ color: c.ink, fontSize: 15 }}>{message.text}</Text>
          </View>
        )
      ) : null}

      <Body muted>
        El Calendario no se actualiza solo. Cuando hagas un trabajo o cambien mucho los km, vuelve a añadirlos; si salen
        repetidos, borra los antiguos.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  date: { fontFamily: mono, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
