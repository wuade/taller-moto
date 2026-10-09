import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CONFIDENCE, TORQUE_GROUPS, TORQUES, type Confidence, type TorqueKey } from '../data/eliminator500';
import { formatDate, formatDecimal } from '../logic/format';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Heading, Screen, TorqueCard, makeInputStyle } from '../ui/components';
import { confidenceColors, mono, useColors } from '../ui/theme';

function Tag({ conf }: { conf: Confidence | 'user' }) {
  const c = useColors();
  const cc = confidenceColors(c, conf);
  const label = conf === 'user' ? 'Verificado por ti' : CONFIDENCE[conf].tag;
  return (
    <View style={[styles.tag, { backgroundColor: cc.bg }]}>
      <Text style={[styles.tagText, { color: cc.fg }]}>{label}</Text>
    </View>
  );
}

function OverrideForm({ tkey, onDone }: { tkey: TorqueKey; onDone: () => void }) {
  const c = useColors();
  const { state, setOverride, clearOverride } = useStore();
  const current = state.overrides[tkey];
  const [value, setValue] = useState(current ? formatDecimal(current.nm) : '');
  const [source, setSource] = useState(current?.source ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const nm = Number(value.replace(',', '.'));
    if (!(nm > 0) || nm > 500) return setError('Escribe el par en N·m, por ejemplo 25 o 17,5.');
    if (source.trim().length < 4) {
      return setError('Indica de dónde sale: taller, manual de servicio y página... Sin fuente no se guarda.');
    }
    setOverride(tkey, nm, source.trim());
    onDone();
  };

  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <TextInput
        accessibilityLabel="Par en N·m"
        placeholder="Par en N·m"
        placeholderTextColor={c.muted}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={setValue}
        style={makeInputStyle(c)}
      />
      <TextInput
        accessibilityLabel="Fuente del dato"
        placeholder="Fuente: p. ej. Máquina Motors, manual de servicio p. 2-15"
        placeholderTextColor={c.muted}
        value={source}
        onChangeText={setSource}
        style={makeInputStyle(c)}
      />
      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      <View style={styles.formButtons}>
        <Button small label="Guardar par" onPress={save} />
        <Button small kind="ghost" label="Cancelar" onPress={onDone} />
        {current ? (
          <Button
            small
            kind="danger"
            label="Quitar mi valor"
            onPress={() => {
              clearOverride(tkey);
              onDone();
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

export default function TorquesScreen() {
  const c = useColors();
  const { state } = useStore();
  const [open, setOpen] = useState<TorqueKey | null>(null);
  const [editing, setEditing] = useState<TorqueKey | null>(null);

  return (
    <Screen>
      <Card>
        <View style={styles.legendRow}>
          <Tag conf="doc" />
          <Body>Manual de propietario (comprobado) o foto del manual de servicio.</Body>
        </View>
        <View style={styles.legendRow}>
          <Tag conf="cita" />
          <Body>Copiado en texto por un usuario del foro con el manual de servicio.</Body>
        </View>
        <View style={styles.legendRow}>
          <Tag conf="probable" />
          <Body>Dato oficial de la Ninja 400, mismas piezas. Verifícalo.</Body>
        </View>
        <View style={styles.legendRow}>
          <Tag conf="nodata" />
          <Body>Sin documento fiable. No apretar a ojo.</Body>
        </View>
        <View style={styles.legendRow}>
          <Tag conf="user" />
          <Body>Valor que has confirmado tú, con su fuente (por ejemplo, el taller).</Body>
        </View>
      </Card>

      {TORQUE_GROUPS.map((group) => (
        <View key={group.title} style={{ gap: 8 }}>
          <Heading>{group.title}</Heading>
          {group.keys.map((key) => {
            const t = TORQUES[key];
            const o = state.overrides[key];
            const nm = o?.nm ?? t.nm;
            const isOpen = open === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => {
                  setOpen(isOpen ? null : key);
                  setEditing(null);
                }}
                style={[styles.row, { backgroundColor: c.surface, borderColor: c.line }]}
              >
                <View style={styles.rowTop}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Tag conf={o ? 'user' : t.conf} />
                    <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>{t.part}</Text>
                  </View>
                  <Text style={[styles.value, { color: nm === null ? c.danger : c.ink }]}>
                    {nm === null ? '—' : `${formatDecimal(nm)} N·m`}
                  </Text>
                </View>
                {isOpen ? (
                  <View>
                    <TorqueCard tkey={key} override={o} />
                    {o ? (
                      <Text style={{ color: c.muted, fontSize: 12, marginTop: 6 }}>
                        Guardado el {formatDate(o.date)}. Dato original: {t.nm === null ? 'sin dato' : `${formatDecimal(t.nm)} N·m`} ({t.src}).
                      </Text>
                    ) : null}
                    {editing === key ? (
                      <OverrideForm tkey={key} onDone={() => setEditing(null)} />
                    ) : (
                      <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                        <Button
                          small
                          kind="ghost"
                          label={o ? 'Corregir mi valor' : 'Añadir valor confirmado'}
                          onPress={() => setEditing(key)}
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>
                    {o ? o.source : t.src}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      <Eyebrow>Tornillería general</Eyebrow>
      <Body muted>
        La tabla estándar Kawasaki para tornillos sin par propio no sirve para ejes, piñón, corona, frenos ni bujías.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tag: { borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start' },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  value: { fontFamily: mono, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  formButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
