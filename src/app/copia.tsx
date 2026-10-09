import { useState } from 'react';
import { Text, View } from 'react-native';

import { exportBackup, pickBackupText } from '../backup-io';
import { BackupError, backupFileName, parseBackup, serializeBackup } from '../logic/backup';
import { formatDate } from '../logic/format';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Heading, Notice, Screen } from '../ui/components';
import { useColors } from '../ui/theme';

type Message = { tone: 'ok' | 'error'; text: string };

export default function BackupScreen() {
  const c = useColors();
  const { state, importState, markExported } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const doExport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const now = new Date();
      const result = await exportBackup(backupFileName(now), serializeBackup(state, now));
      if (result === 'shared' || result === 'downloaded') {
        markExported();
        setMessage({
          tone: 'ok',
          text:
            result === 'shared'
              ? 'Copia lista. Si la guardaste en Drive o te la enviaste, ya está a salvo.'
              : 'Copia descargada. Súbela a Drive o guárdala donde no se pierda.',
        });
      } else if (result === 'unavailable') {
        setMessage({ tone: 'error', text: 'Este dispositivo no permite compartir archivos.' });
      }
    } catch {
      setMessage({ tone: 'error', text: 'No se pudo crear la copia. Inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const text = await pickBackupText();
      if (text === null) return;
      const { added } = importState(parseBackup(text));
      setMessage({
        tone: 'ok',
        text:
          added > 0
            ? `Copia importada: ${added} registro${added > 1 ? 's' : ''} nuevo${added > 1 ? 's' : ''}. No se ha borrado nada.`
            : 'Copia importada. No había registros nuevos.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof BackupError ? error.message : 'No se pudo leer el archivo.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Heading>Tus datos van en el móvil</Heading>
        <Body>
          La app funciona sin cobertura: lo que marques se guarda en este dispositivo. Cuando tengas internet, exporta
          una copia y guárdala en Google Drive. Si cambias de móvil, la importas y sigues donde lo dejaste.
        </Body>
      </View>

      <Card>
        <Eyebrow>Exportar</Eyebrow>
        <Body muted>
          {state.lastExport ? `Última copia: ${formatDate(state.lastExport)}.` : 'Aún no has hecho ninguna copia.'}
          {!state.lastExport || state.updated > state.lastExport ? ' Hay cambios sin copia.' : ' Sin cambios desde entonces.'}
        </Body>
        <Button label="Exportar copia" onPress={doExport} disabled={busy} />
      </Card>

      <Card>
        <Eyebrow>Importar</Eyebrow>
        <Body muted>
          Une la copia con lo que ya hay en el móvil. No borra ningún registro; si un trabajo está en los dos, cuenta una
          vez.
        </Body>
        <Button kind="ghost" label="Importar copia" onPress={doImport} disabled={busy} />
      </Card>

      {message ? (
        message.tone === 'error' ? (
          <Notice tone="danger">{message.text}</Notice>
        ) : (
          <View style={{ backgroundColor: c.okBg, borderRadius: 10, padding: 12 }}>
            <Text style={{ color: c.ink, fontSize: 15 }}>{message.text}</Text>
          </View>
        )
      ) : null}
    </Screen>
  );
}
