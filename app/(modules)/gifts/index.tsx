import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.gifts;

const OCCASIONS = [
  { id: 'emma-bday',   label: "Emma's Birthday 🎂",  date: 'Jul 4',  daysLeft: 20, budget: 150, spent: 0  },
  { id: 'christmas',   label: 'Christmas 🎄',          date: 'Dec 25', daysLeft: 194, budget: 800, spent: 0 },
  { id: 'mom-bday',    label: "Mom's Birthday 🌸",     date: 'Aug 12', daysLeft: 59, budget: 200, spent: 80 },
  { id: 'anniversary', label: 'Anniversary 💍',         date: 'Sep 1',  daysLeft: 79, budget: 300, spent: 0 },
];

const GIFTS: Record<string, Array<{ name: string; price: number; store: string; emoji: string; status: 'idea' | 'bought' | 'wrapped' }>> = {
  'emma-bday': [
    { name: 'LEGO Hogwarts Castle',       price: 129.99, store: 'Amazon',       emoji: '🏰', status: 'idea'   },
    { name: 'Art Supply Kit',             price: 34.99,  store: 'Michaels',     emoji: '🎨', status: 'idea'   },
    { name: 'Kindle Paperwhite Kids',     price: 119.99, store: 'Amazon',       emoji: '📚', status: 'bought' },
  ],
  'mom-bday': [
    { name: 'Silk robe',                  price: 79.99,  store: 'Nordstrom',    emoji: '👘', status: 'bought' },
    { name: 'Spa day voucher',            price: 150.00, store: 'Local Spa',    emoji: '🧖', status: 'idea'   },
  ],
  'christmas': [
    { name: 'Nintendo Switch (Dad)',      price: 299.99, store: 'Best Buy',     emoji: '🎮', status: 'idea'   },
    { name: 'Cookbook set (Mom)',         price: 45.00,  store: 'Barnes&Noble', emoji: '📖', status: 'idea'   },
    { name: 'Bluetooth headphones',      price: 79.99,  store: 'Amazon',       emoji: '🎧', status: 'idea'   },
  ],
  'anniversary': [
    { name: 'Weekend getaway booking',   price: 250.00, store: 'Airbnb',       emoji: '🏡', status: 'idea'   },
  ],
};

const STATUS_CONFIG = {
  idea:    { label: 'Idea',    color: Colors.primary[500],  bg: Colors.primary[50]  },
  bought:  { label: 'Bought',  color: Colors.success[600],  bg: Colors.success[50]  },
  wrapped: { label: 'Wrapped', color: '#8B5CF6',            bg: '#EDE9FE'           },
};

export default function GiftsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [selected, setSelected] = useState(OCCASIONS[0].id);

  const occasion = OCCASIONS.find((o) => o.id === selected)!;
  const gifts    = GIFTS[selected] ?? [];
  const bought   = gifts.filter((g) => g.status !== 'idea');
  const totalPrice = gifts.reduce((s, g) => s + g.price, 0);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🎁 Gifts</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          {OCCASIONS.length} upcoming occasions
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatPill emoji="🎁" label={`${gifts.length} gifts`} isDark={isDark} />
          <StatPill emoji="✅" label={`${bought.length} bought`} isDark={isDark} />
          <StatPill emoji="💰" label={`$${totalPrice.toFixed(0)} total`} isDark={isDark} />
        </View>
      </LinearGradient>

      {/* Occasion selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 100, borderBottomWidth: 1, borderBottomColor: tokens.border }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
      >
        {OCCASIONS.map((o) => (
          <TouchableOpacity
            key={o.id}
            onPress={() => setSelected(o.id)}
            style={[styles.occasionChip, {
              backgroundColor: selected === o.id ? C.primary : tokens.card,
              borderColor: selected === o.id ? C.primary : tokens.border,
            }]}
          >
            <Text variant="bodySmall" weight="bold" color={selected === o.id ? '#fff' : tokens.text} numberOfLines={1}>
              {o.label}
            </Text>
            <Text variant="caption" color={selected === o.id ? 'rgba(255,255,255,0.75)' : tokens.textSecondary}>
              {o.date} · {o.daysLeft}d
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 16, paddingBottom: 100 }}>
        {/* Budget card */}
        <Card shadow="sm" style={{ padding: 16 }}>
          <View style={styles.budgetHeader}>
            <Text variant="h4" weight="bold">{occasion.label}</Text>
            <Badge label={`${occasion.daysLeft} days`} variant={occasion.daysLeft < 30 ? 'warning' : 'primary'} />
          </View>
          <View style={styles.budgetRow}>
            <Text variant="body" secondary>Budget</Text>
            <Text variant="body" weight="bold">${occasion.spent} / ${occasion.budget}</Text>
          </View>
          <ProgressBar
            progress={Math.round((occasion.spent / occasion.budget) * 100)}
            color={C.primary}
            height={6}
            style={{ marginTop: 8 }}
          />
          <Text variant="caption" secondary style={{ marginTop: 4 }}>
            ${occasion.budget - occasion.spent} remaining
          </Text>
        </Card>

        {/* Gift list */}
        <View style={styles.listHeader}>
          <Text variant="h4" weight="bold">Gift Ideas</Text>
          <TouchableOpacity style={[styles.addBtn, { borderColor: C.primary }]}>
            <Ionicons name="add" size={16} color={C.primary} />
            <Text variant="bodySmall" weight="semibold" color={C.primary} style={{ marginLeft: 4 }}>Add Gift</Text>
          </TouchableOpacity>
        </View>

        {gifts.length === 0 ? (
          <Card shadow="sm" style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🎁</Text>
            <Text variant="body" secondary>No gift ideas yet for this occasion</Text>
          </Card>
        ) : (
          gifts.map((gift, i) => {
            const sc = STATUS_CONFIG[gift.status];
            return (
              <Card key={i} shadow="sm" style={styles.giftCard}>
                <View style={[styles.giftEmoji, { backgroundColor: sc.bg }]}>
                  <Text style={{ fontSize: 22 }}>{gift.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>{gift.name}</Text>
                  <Text variant="caption" secondary>{gift.store}</Text>
                  <Text variant="body" weight="bold" color={C.primary} style={{ marginTop: 2 }}>${gift.price.toFixed(2)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text variant="caption" weight="bold" color={sc.color}>{sc.label}</Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function StatPill({ emoji, label, isDark }: any) {
  return (
    <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text variant="bodySmall" weight="semibold" style={{ marginLeft: 6, color: isDark ? '#fff' : '#111' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  statsRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  statPill:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full },
  occasionChip:  { paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.xl, borderWidth: 1.5, minWidth: 120 },
  budgetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  listHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  giftCard:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  giftEmoji:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  fab:           { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
