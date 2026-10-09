import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { Expense, ExpenseInput } from '../logic/expenses';
import { formatDate, parseDayInput, todayIso } from '../logic/format';
import { eurosInput, parseEuros } from '../logic/money';
import { Button, makeInputStyle } from './components';
import { useColors } from './theme';

export function Field({ label, children, half }: { label: string; children: ReactNode; half?: boolean }) {
  const c = useColors();
  return (
    <View style={[{ gap: 4 }, half ? styles.half : null]}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      {children}
    </View>
  );
}

/** Formulario de un gasto: nuevo, o `initial` para cambiarlo. `defaults` rellena uno nuevo (una compra). */
export function ExpenseForm({
  initial,
  defaults,
  saveLabel,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Expense;
  defaults?: Partial<ExpenseInput>;
  saveLabel?: string;
  onSave: (input: ExpenseInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const c = useColors();
  const [concept, setConcept] = useState(initial?.concept ?? defaults?.concept ?? '');
  const [amount, setAmount] = useState(initial ? eurosInput(initial.amount) : '');
  const [date, setDate] = useState(formatDate(initial?.date ?? todayIso()));
  const [place, setPlace] = useState(initial?.place ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Al corregir un campo, el aviso de error desaparece.
  const edit = (set: (text: string) => void) => (text: string) => {
    set(text);
    setError(null);
  };

  const save = () => {
    const euros = parseEuros(amount);
    const day = parseDayInput(date);
    if (!concept.trim()) return setError('Escribe qué es: por ejemplo «Neumáticos» o «Revisión».');
    if (euros === null) return setError('Escribe el importe en euros, por ejemplo 85 o 120,50.');
    if (!day) return setError('Escribe la fecha como 26/05/2026.');
    onSave({
      concept,
      amount: euros,
      date: day,
      place,
      km: initial?.km ?? defaults?.km,
      taskId: initial?.taskId ?? defaults?.taskId,
      partId: initial?.partId ?? defaults?.partId,
    });
  };

  return (
    <View style={{ gap: 8, paddingVertical: 4 }}>
      <Field label="Concepto">
        <TextInput
          accessibilityLabel="Concepto"
          placeholder="Neumáticos, revisión…"
          placeholderTextColor={c.muted}
          value={concept}
          onChangeText={edit(setConcept)}
          style={makeInputStyle(c)}
        />
      </Field>
      <View style={styles.formRow}>
        <Field label="Importe (€)" half>
          <TextInput
            accessibilityLabel="Importe en euros"
            placeholder="0,00"
            placeholderTextColor={c.muted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={edit(setAmount)}
            style={makeInputStyle(c)}
          />
        </Field>
        <Field label="Fecha" half>
          <TextInput
            accessibilityLabel="Fecha, día barra mes barra año"
            placeholder="dd/mm/aaaa"
            placeholderTextColor={c.muted}
            value={date}
            onChangeText={edit(setDate)}
            style={makeInputStyle(c)}
          />
        </Field>
      </View>
      <Field label="Dónde (opcional)">
        <TextInput
          accessibilityLabel="Dónde"
          placeholder="Taller, tienda…"
          placeholderTextColor={c.muted}
          value={place}
          onChangeText={edit(setPlace)}
          style={makeInputStyle(c)}
        />
      </Field>
      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      <View style={styles.formButtons}>
        <Button small label={saveLabel ?? (initial ? 'Guardar cambios' : 'Guardar gasto')} onPress={save} />
        <Button small kind="ghost" label="Cancelar" onPress={onCancel} />
        {onDelete ? (
          confirmDelete ? (
            <Button small kind="danger" label="Sí, borrar" onPress={onDelete} />
          ) : (
            <Button small kind="ghost" label="Borrar" onPress={() => setConfirmDelete(true)} />
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, minWidth: 0 },
  formButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
