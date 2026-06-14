import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.inventory;

type Item = {
  id: string; name: string; room: string; emoji: string;
  quantity: number; minQuantity: number; category: string;
  purchaseDate?: string; warranty?: string; lastChecked: string;
};

const ITEMS: Item[] = [
  { id: '1',  name: 'Paper Towels',     room: 'Kitchen',    emoji: '🧻', quantity: 2,  minQuantity: 3,  category: 'consumable', lastChecked: 'Today'    },
  { id: '2',  name: 'Dish Soap',        room: 'Kitchen',    emoji: '🧴', quantity: 1,  minQuantity: 2,  category: 'consumable', lastChecked: 'Today'    },
  { id: '3',  name: 'Coffee Filters',   room: 'Kitchen',    emoji: '☕', quantity: 80, minQuantity: 20, category: 'consumable', lastChecked: 'Jun 10'   },
  { id: '4',  name: 'Dishwasher Tabs',  room: 'Kitchen',    emoji: '🍽️', quantity: 12, minQuantity: 10, category: 'consumable', lastChecked: 'Jun 11'   },
  { id: '5',  name: 'Shampoo',          room: 'Bathroom',   emoji: '🚿', quantity: 1,  minQuantity: 2,  category: 'consumable', lastChecked: 'Jun 12'   },
  { id: '6',  name: 'Toilet Paper',     room: 'Bathroom',   emoji: '🧻', quantity: 4,  minQuantity: 6,  category: 'consumable', lastChecked: 'Today'    },
  { id: '7',  name: 'Washing Machine',  room: 'Laundry',    emoji: '🫧', quantity: 1,  minQuantity: 1,  category: 'appliance',  purchaseDate: 'Mar 2022', warranty: 'Mar 2027', lastChecked: 'Jun 1' },
  { id: '8',  name: 'Refrigerator',     room: 'Kitchen',    emoji: '🧊', quantity: 1,  minQuantity: 1,  category: 'appliance',  purchaseDate: 'Jan 2021', warranty: 'Jan 2026', lastChecked: 'Jun 1' },
  { id: '9',  name: 'Fire Extinguisher',room: 'Kitchen',    emoji: '🧯', quantity: 1,  minQuantity: 1,  category: 'safety',     purchaseDate: 'Jun 2023', warranty: 'Jun 2028', lastChecked: 'Jun 1' },
  { id: '10', name: 'AA Batteries',     room: 'Storage',    emoji: '🔋', quantity: 3,  minQuantity: 8,  category: 'consumable', lastChecked: 'Jun 8'    },
  { id: '11', name: 'Light Bulbs (E27)',room: 'Storage',    emoji: '💡', quantity: 2,  minQuantity: 4,  category: 'consumable', lastChecked: 'Jun 8'    },
  { id: '12', name: 'First Aid Kit',    room: 'Bathroom',   emoji: '🩹', quantity: 1,  minQuantity: 1,  category: 'safety',     lastChecked: 'Jun 1'    },
  { id: '13', name: 'Laundry Detergent',room: 'Laundry',    emoji: '🧺', quantity: 1,  minQuantity: 1,  category: 'consumable', lastChecked: 'Today'    },
  { id: '14', name: 'Router (WiFi)',    room: 'Living Room', emoji: '📡', quantity: 1,  minQuantity: 1,  category: 'electronics', purchaseDate: 'Aug 2023', warranty: 'Aug 2026', lastChecked: 'Jun 1' },
];

const ROOMS = ['All', 'Kitchen', 'Bathroom', 'Laundry', 'Storage', 'Living Room'];

export default function InventoryScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [room, setRoom] = useState('All');

  const filtered  = ITEMS.filter((i) => room === 'All' || i.room === room);
  const lowStock  = ITEMS.filter((i) => i.quantity < i.minQuantity);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🏠 Inventory</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {ITEMS.length} items tracked
            </Text>
          </View>
          {lowStock.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: Colors.error[500] }]}>
              <Ionicons name="alert" size={14} color="#fff" />
              <Text variant="caption" weight="bold" color="#fff" style={{ marginLeft: 4 }}>{lowStock.length} low</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatPill label={`${ITEMS.filter(i => i.category === 'appliance').length} Appliances`} emoji="🔧" isDark={isDark} />
          <StatPill label={`${lowStock.length} Restock`}                                          emoji="⚠️"  isDark={isDark} />
          <StatPill label={`${ITEMS.filter(i => i.category === 'safety').length} Safety`}         emoji="🧯"  isDark={isDark} />
        </View>
      </LinearGradient>

      {/* Room filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, borderBottomWidth: 1, borderBottomColor: tokens.border }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {ROOMS.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRoom(r)}
            style={[styles.roomChip, { backgroundColor: room === r ? C.primary : tokens.card, borderColor: room === r ? C.primary : tokens.border }]}
          >
            <Text variant="caption" weight="semibold" color={room === r ? '#fff' : tokens.text}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 10, paddingBottom: 100 }}>
        {/* Low stock alert */}
        {lowStock.length > 0 && room === 'All' && (
          <View style={[styles.lowStockBanner, { backgroundColor: Colors.error[50], borderColor: Colors.error[200] }]}>
            <Ionicons name="alert-circle" size={18} color={Colors.error[500]} />
            <Text variant="bodySmall" color={Colors.error[700]} style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="bodySmall" weight="bold" color={Colors.error[700]}>{lowStock.length} items</Text> need restocking: {lowStock.map(i => i.name).join(', ')}
            </Text>
          </View>
        )}

        {filtered.map((item) => {
          const isLow = item.quantity < item.minQuantity;
          return (
            <Card key={item.id} shadow="sm" style={styles.itemCard}>
              <View style={[styles.itemEmoji, { backgroundColor: isLow ? Colors.error[50] : tokens.surface }]}>
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.itemTop}>
                  <Text variant="body" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{item.name}</Text>
                  {isLow && <Badge label="Low" variant="error" />}
                </View>
                <Text variant="caption" secondary>{item.room} · {item.category}</Text>
                {item.warranty && (
                  <Text variant="caption" color={Colors.primary[500]}>Warranty until {item.warranty}</Text>
                )}
              </View>
              <View style={styles.qtyBox}>
                <Text variant="h4" weight="black" color={isLow ? Colors.error[500] : tokens.text}>{item.quantity}</Text>
                <Text variant="caption" secondary>/{item.minQuantity}</Text>
              </View>
            </Card>
          );
        })}
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
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
      <Text variant="caption" weight="semibold" style={{ marginLeft: 5, color: isDark ? '#fff' : '#111' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  header:         { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full },
  statsRow:       { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  statPill:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full },
  roomChip:       { paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  lowStockBanner: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: BorderRadius.lg, borderWidth: 1 },
  itemCard:       { flexDirection: 'row', alignItems: 'center', padding: 12 },
  itemEmoji:      { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTop:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBox:         { alignItems: 'center', minWidth: 36 },
  fab:            { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
