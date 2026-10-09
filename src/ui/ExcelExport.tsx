import { useState } from 'react';
import { Text, View } from 'react-native';

import { exportExcel } from '../excel-io';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Notice } from './components';
import { useColors } from './theme';

type Message = { tone: 'ok' | 'error'; text: string };

/** Tarjeta «Exportar a Excel»: una foto de todos los datos para verla en el PC. */
export function ExcelExport() {
  const c = useColors();
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const doExport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportExcel(state);
      if (result === 'shared') {
        setMessage({ tone: 'ok', text: 'Excel listo. Si lo guardaste en Archivos o te lo enviaste, ya puedes abrirlo en el PC.' });
      } else if (result === 'downloaded') {
        setMessage({ tone: 'ok', text: 'Excel descargado.' });
      } else if (result === 'unavailable') {
        setMessage({ tone: 'error', text: 'Este dispositivo no permite compartir archivos.' });
      }
    } catch {
      setMessage({ tone: 'error', text: 'No se pudo crear el Excel. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Eyebrow>Excel</Eyebrow>
      <Body muted>
        Gastos, trabajos hechos, lo que toca, recambios y pares de apriete en un Excel para verlo en el PC. Es una foto
        de este momento: no sirve para recuperar los datos, para eso está la copia de seguridad.
      </Body>
      <Button kind="ghost" label="Exportar a Excel" onPress={doExport} disabled={busy} />
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
