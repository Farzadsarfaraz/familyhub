import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Chip, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.shopping;

const CATEGORIES = ['All', 'Produce', 'Dairy', 'Meat', 'Bakery', 'Snacks', 'Beverages', 'Household'];

interface Item {
  id: string; name: string; qty: number; unit?: string; category: string; checked: boolean; emoji: string;
}

const INITIAL_ITEMS: Item[] = [
  { id: '1', name: 'Organic Milk',    qty: 2, unit: 'gallons', category: 'Dairy',     checked: false, emoji: '🥛' },
  { id: '2', name: 'Sourdough Bread', qty: 1, unit: 'loaf',    category: 'Bakery',    checked: false, emoji: '🍞' },
  { id: '3', name: 'Chicken Breast',  qty: 2, unit: 'lbs',     category: 'Meat',      checked: true,  emoji: '🍗' },
  { id: '4', name: 'Bananas',         qty: 6, unit: '',        category: 'Produce',   checked: false, emoji: '🍌' },
  { id: '5', name: 'Greek Yogurt',    qty: 4, unit: 'cups',    category: 'Dairy',     checked: false, emoji: '🫙' },
  { id: '6', name: 'Pasta',           qty: 2, unit: 'boxes',   category: 'Snacks',    checked: true,  emoji: '🍝' },
  { id: '7', name: 'Laundry Detergent', qty: 1, unit: '',      category: 'Household', checked: false, emoji: '🧺' },
  { id: '8', name: 'Orange Juice',    qty: 1, unit: 'bottle',  category: 'Beverages', checked: false, emoji: '🍊' },
];

export default function ShoppingScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [items,  setItems]  = useState(INITIAL_ITEMS);
  const [filter, setFilter] = useState('All');
  const [input,  setInput]  = useState('');

  const toggle = (id: string) =>
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, checked: !it.checked } : it));

  const addItem = () => {
    if (!input.trim()) return;
    setItems((prev) => [...prev, {
      id: Date.now().toString(), name: input.trim(),
      qty: 1, category: 'All', checked: false, emoji: '🛒',
    }]);
    setInput('');
  };

  const filtered = filter === 'All' ? items : items.filter((i) => i.category === filter);
  const checked  = items.filter((i) => i.checked).length;

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? ['#003320', '#0A0A1A'] : ['#ECFDF5', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Shopping List</Text>
            <Text variant="caption" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {checked}/{items.length} items checked
            </Text>
          </View>
          <TouchableOpacity style={[styles.scanBtn, { backgroundColor: C.primary }]}>
            <Ionicons name="barcode-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Add Item Row */}
        <View style={[styles.addRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: tokens.border }]}>
          <TextInput
            style={[styles.addInput, { color: tokens.text }]}
            placeholder="Add item..."
            placeholderTextColor={tokens.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={addItem} style={[styles.addBtn, { backgroundColor: C.primary }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}
        style={{ maxHeight: 52 }}
      >
        {CATEGORIES.map((cat) => (
          <Chip key={cat} label={cat} selected={filter === cat} onPress={() => setFilter(cat)} color={C.primary} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 8 }}>
        {/* Unchecked */}
        {filtered.filter((i) => !i.checked).map((item) => (
          <ItemRow key={item.id} item={item} onToggle={toggle} tokens={tokens} accent={C.primary} />
        ))}

        {/* Checked */}
        {filtered.some((i) => i.checked) && (
          <>
            <Text variant="label" secondary weight="semibold" style={{ marginTop: 16, marginBottom: 4 }}>
              IN CART ({filtered.filter((i) => i.checked).length})
            </Text>
            {filtered.filter((i) => i.checked).map((item) => (
              <ItemRow key={item.id} item={item} onToggle={toggle} tokens={tokens} accent={C.primary} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ItemRow({ item, onToggle, tokens, accent }: { item: Item; onToggle: (id: string) => void; tokens: any; accent: string }) {
  return (
    <Card style={styles.itemCard} shadow="sm" onPress={() => onToggle(item.id)}>
      <View style={[styles.check, { borderColor: item.checked ? Colors.success[500] : tokens.border, backgroundColor: item.checked ? Colors.success[500] : 'transparent' }]}>
        {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={{ fontSize: 22, marginHorizontal: 10 }}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="medium" style={{ textDecorationLine: item.checked ? 'line-through' : 'none' }} secondary={item.checked}>{item.name}</Text>
        <Text variant="caption" secondary>{item.qty}{item.unit ? ` ${item.unit}` : ''} · {item.category}</Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity style={[styles.qtyBtn, { borderColor: tokens.border }]}><Text>−</Text></TouchableOpacity>
        <Text variant="body" weight="semibold" style={{ marginHorizontal: 8 }}>{item.qty}</Text>
        <TouchableOpacity style={[styles.qtyBtn, { borderColor: tokens.border }]}><Text>+</Text></TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scanBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.xl, borderWidth: 1.5, overflow: 'hidden' },
  addInput: { flex: 1, height: 48, paddingHorizontal: 16, fontSize: 15 },
  addBtn:  { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  check:   { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  qtyRow:  { flexDirection: 'row', alignItems: 'center' },
  qtyBtn:  { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
