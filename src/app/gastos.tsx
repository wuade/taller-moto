import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Expense, type ExpenseInput, spendingByYear } from '../logic/expenses';
import { formatDate, formatKm, parseDayInput, todayIso } from '../logic/format';
import { eurosInput, formatEuros, parseEuros, sumEuros } from '../logic/money';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Screen, Title, makeInputStyle } from '../ui/components';
import { ExcelExport } from '../ui/ExcelExport';
import { mono, useColors } from '../ui/theme';

function Field({ label, children, half }: { label: string; children: ReactNode; half?: boolean }) {
  const c = useColors();
  return (
    <View style={[{ gap: 4 }, half ? styles.half : null]}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      {children}
    </View>
  );
}

function ExpenseForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Expense;
  onSave: (input: ExpenseInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const c = useColors();
  const [concept, setConcept] = useState(initial?.concept ?? '');
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
    onSave({ concept, amount: euros, date: day, place, km: initial?.km, taskId: initial?.taskId });
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
        <Button small label={initial ? 'Guardar cambios' : 'Guardar gasto'} onPress={save} />
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

function ExpenseRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const c = useColors();
  const detail = [formatDate(expense.date), expense.place, expense.km !== undefined ? formatKm(expense.km) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.concept}, ${formatEuros(expense.amount)}, ${detail}. Toca para cambiarlo.`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderTopColor: c.line, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>{expense.concept}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>{detail}</Text>
      </View>
      <Text style={[styles.amount, { color: c.ink }]}>{formatEuros(expense.amount)}</Text>
    </Pressable>
  );
}

export default function ExpensesScreen() {
  const c = useColors();
  const { state, addExpense, updateExpense, removeExpense } = useStore();
  // 'nuevo' o el id del gasto que se está cambiando.
  const [editing, setEditing] = useState<string | null>(null);
  const years = useMemo(() => spendingByYear(state.expenses), [state.expenses]);
  const thisYear = String(new Date().getFullYear());
  const current = years.find((y) => y.year === thisYear)?.total ?? 0;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Eyebrow>Gastado en {thisYear}</Eyebrow>
        <Title>{formatEuros(current)}</Title>
        {years.length > 1 || (years.length === 1 && years[0].year !== thisYear) ? (
          <Body muted>En total: {formatEuros(sumEuros(years.map((y) => y.total)))}.</Body>
        ) : null}
      </View>

      {editing === 'nuevo' ? (
        <Card>
          <Eyebrow>Nuevo gasto</Eyebrow>
          <ExpenseForm
            onSave={(input) => {
              addExpense(input);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </Card>
      ) : (
        <Button label="Añadir gasto" onPress={() => setEditing('nuevo')} />
      )}

      {years.length === 0 ? (
        <Body muted>
          Aún no hay gastos. Apúntalos aquí o, al marcar un trabajo como hecho, escribe lo que costó.
        </Body>
      ) : null}

      {years.map((y) => (
        <Card key={y.year}>
          <View style={styles.yearRow}>
            <Eyebrow>{y.year}</Eyebrow>
            <Text style={[styles.amount, { color: c.ink }]}>{formatEuros(y.total)}</Text>
          </View>
          {y.items.map((expense) =>
            editing === expense.id ? (
              <ExpenseForm
                key={expense.id}
                initial={expense}
                onSave={(input) => {
                  updateExpense(expense.id, input);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                onDelete={() => {
                  removeExpense(expense.id);
                  setEditing(null);
                }}
              />
            ) : (
              <ExpenseRow key={expense.id} expense={expense} onPress={() => setEditing(expense.id)} />
            ),
          )}
        </Card>
      ))}

      <ExcelExport />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, minWidth: 0 },
  formButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontFamily: mono, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
