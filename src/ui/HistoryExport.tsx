import { useState } from 'react';
import { Text, View } from 'react-native';

import { exportHistory } from '../history-io';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Notice } from './components';
import { useColors } from './theme';

type Message = { tone: 'ok' | 'error'; text: string };

/** Tarjeta «Historial en PDF»: lo hecho a la moto, para enseñarlo si la vendes. */
export function HistoryExport() {
  const c = useColors();
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const doExport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportHistory(state);
      if (result === 'shared') {
        setMessage({ tone: 'ok', text: 'Historial listo. Si lo guardaste en Archivos o lo enviaste, ya lo tienes.' });
      } else if (result === 'downloaded') {
        setMessage({ tone: 'ok', text: 'Historial descargado.' });
      } else if (result === 'unavailable') {
        setMessage({ tone: 'error', text: 'Este dispositivo no permite compartir archivos.' });
      }
    } catch {
      setMessage({ tone: 'error', text: 'No se pudo crear el historial. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Eyebrow>Historial en PDF</Eyebrow>
      <Body muted>
        Los trabajos hechos con fecha, km y taller, los recambios comprados y lo próximo que toca. Sirve para enseñarlo si
        vendes la moto: no lleva importes.
      </Body>
      <Button kind="ghost" label="Exportar historial en PDF" onPress={doExport} disabled={busy} />
      {message ? (
        message.tone === 'error' ? (
          <Notice tone="danger">{message.text}</Notice>
        ) : (
          <View style={{ backgroundColor: c.okBg, borderRadius: 10, padding: 12 }}>
            <Text style={{ color: c.ink, fontSize: 15 }}>{message.text}</Text>
          </View>
        )
      ) : null}
    </Card>
  );
}
