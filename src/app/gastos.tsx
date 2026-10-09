import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Expense, spendingByYear } from '../logic/expenses';
import { formatDate, formatKm } from '../logic/format';
import { formatEuros, sumEuros } from '../logic/money';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Screen, Title } from '../ui/components';
import { ExcelExport } from '../ui/ExcelExport';
import { ExpenseForm } from '../ui/ExpenseForm';
import { mono, useColors } from '../ui/theme';

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
