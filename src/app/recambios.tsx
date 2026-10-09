import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Part, PARTS_SOURCE } from '../data/eliminator500';
import { formatDate } from '../logic/format';
import { formatEuros } from '../logic/money';
import { type Purchase, partGroups, purchasesOf } from '../logic/parts';
import { useStore } from '../store/StoreProvider';
import { Body, Button, Card, Eyebrow, Pill, Screen } from '../ui/components';
import { ExpenseForm } from '../ui/ExpenseForm';
import { type Colors, mono, useColors } from '../ui/theme';

function statusOf(purchase: Purchase | undefined, c: Colors): { label: string; fg: string; bg: string } | null {
  if (!purchase || purchase.mounted === true) return null;
  if (purchase.mounted === false) return { label: 'Sin montar', fg: c.warn, bg: c.warnBg };
  return { label: 'Comprado', fg: c.ok, bg: c.okBg };
}

function PurchaseLine({ purchase }: { purchase: Purchase }) {
  const c = useColors();
  const { expense, mounted } = purchase;
  const detail = [formatDate(expense.date), expense.place, mounted === null ? null : mounted ? 'montado' : 'sin montar']
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.purchase, { borderTopColor: c.line }]}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: c.ink, fontSize: 14 }}>{expense.concept}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>{detail}</Text>
      </View>
      <Text style={[styles.amount, { color: c.ink }]}>{formatEuros(expense.amount)}</Text>
    </View>
  );
}

function PartRow({ part, open, onToggle }: { part: Part; open: boolean; onToggle: () => void }) {
  const c = useColors();
  const { state, addExpense } = useStore();
  const [buying, setBuying] = useState(false);
  const purchases = purchasesOf(state, part);
  const status = statusOf(purchases[0], c);

  return (
    <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${part.name}${part.oem ? `, referencia ${part.oem}` : ''}${status ? `, ${status.label}` : ''}`}
        onPress={onToggle}
        style={{ gap: 4 }}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>{part.name}</Text>
            {part.oem ? (
              <Text style={[styles.ref, { color: c.ink }]} selectable>
                Ref. {part.oem}
              </Text>
            ) : (
              <Text style={{ color: c.muted, fontSize: 13 }}>Sin referencia Kawasaki</Text>
            )}
          </View>
          {status ? <Pill label={status.label} fg={status.fg} bg={status.bg} /> : null}
        </View>
        <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={open ? undefined : 1}>
          {part.alternatives}
        </Text>
      </Pressable>

      {open ? (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={{ color: c.ink, fontSize: 14 }}>
            {part.spec} · {part.amount}
          </Text>
          {part.note ? <Text style={{ color: c.muted, fontSize: 13 }}>{part.note}</Text> : null}
          {purchases.length > 0 ? (
            <View>
              <Eyebrow>Tus compras</Eyebrow>
              {purchases.map((p) => (
                <PurchaseLine key={p.expense.id} purchase={p} />
              ))}
            </View>
          ) : null}
          {buying ? (
            <ExpenseForm
              defaults={{ concept: part.name, partId: part.id }}
              saveLabel="Guardar compra"
              onSave={(input) => {
                addExpense(input);
                setBuying(false);
              }}
              onCancel={() => setBuying(false)}
            />
          ) : (
            <View style={{ alignSelf: 'flex-start' }}>
              <Button small kind="ghost" label="Apuntar compra" onPress={() => setBuying(true)} />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function PartsScreen() {
  const c = useColors();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Screen>
      <Body muted>
        Referencias para pedir recambios. Lo que compres, apúntalo en su recambio: sale también en Gastos, y queda «sin
        montar» hasta que marques el trabajo como hecho.
      </Body>

      {partGroups().map((group) => (
        <View key={group.title} style={{ gap: 8 }}>
          <Eyebrow>{group.title}</Eyebrow>
          {group.parts.map((part) => (
            <PartRow
              key={part.id}
              part={part}
              open={open === part.id}
              onToggle={() => setOpen(open === part.id ? null : part.id)}
            />
          ))}
        </View>
      ))}

      <Card>
        <Body muted>¿Algo que no está en la lista? Apúntalo en Gastos.</Body>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button small kind="ghost" label="Ir a Gastos" onPress={() => router.push('/gastos')} />
        </View>
      </Card>

      <Text style={{ color: c.muted, fontSize: 12 }}>
        Referencias: {PARTS_SOURCE}. Compruébalas con el despiece antes de pedir.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  ref: { fontFamily: mono, fontSize: 14, fontWeight: '600' },
  purchase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  amount: { fontFamily: mono, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
