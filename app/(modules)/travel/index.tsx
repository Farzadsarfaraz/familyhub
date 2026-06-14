import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.travel;
const { width } = Dimensions.get('window');

const TRIPS = [
  {
    id: '1', name: 'Italy Family Trip ✈️', destination: 'Rome & Florence, Italy',
    start: 'Jul 15', end: 'Jul 28', budget: 8000, spent: 3200,
    cover: 'https://picsum.photos/seed/italy/800/400',
    status: 'upcoming', days: 14,
    itinerary: [
      { day: 1, activity: 'Arrive in Rome, hotel check-in',           icon: '🛬' },
      { day: 2, activity: 'Colosseum & Roman Forum tour',             icon: '🏛️' },
      { day: 3, activity: 'Vatican City & Sistine Chapel',            icon: '⛪' },
      { day: 7, activity: 'Train to Florence',                        icon: '🚂' },
    ],
    packing: [
      { item: 'Passports',         packed: true  },
      { item: 'Travel insurance',  packed: true  },
      { item: 'Adapters',          packed: false },
      { item: 'Sunscreen',         packed: false },
      { item: 'Kids backpacks',    packed: false },
    ],
  },
  {
    id: '2', name: 'Beach Weekend 🏖️', destination: 'Malibu, California',
    start: 'Aug 5', end: 'Aug 7', budget: 1200, spent: 0,
    cover: 'https://picsum.photos/seed/beach/800/400',
    status: 'planning', days: 3,
    itinerary: [],
    packing: [],
  },
];

export default function TravelScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [selected, setSelected] = useState(TRIPS[0]);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <View style={{ height: 280 }}>
          <Image source={{ uri: selected.cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroBottom}>
              <Badge label={selected.status === 'upcoming' ? '✈️ Upcoming' : '📋 Planning'} variant={selected.status === 'upcoming' ? 'primary' : 'neutral'} />
              <Text variant="h2" weight="black" color="#fff" style={{ marginTop: 8 }}>{selected.name}</Text>
              <View style={styles.tripMeta}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text variant="bodySmall" color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }}>{selected.destination}</Text>
                <Text variant="bodySmall" color="rgba(255,255,255,0.6)" style={{ marginLeft: 12 }}>
                  {selected.start} – {selected.end}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trip selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 10 }}
          style={{ maxHeight: 72 }}
        >
          {TRIPS.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              onPress={() => setSelected(trip)}
              style={[
                styles.tripChip,
                { backgroundColor: selected.id === trip.id ? C.primary : tokens.card, borderColor: tokens.border },
              ]}
            >
              <Text variant="bodySmall" weight="semibold"
                color={selected.id === trip.id ? '#fff' : tokens.text} numberOfLines={1}>
                {trip.name.split(' ').slice(0, 2).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.tripChip, { borderColor: C.primary, borderStyle: 'dashed' }]}>
            <Ionicons name="add" size={16} color={C.primary} />
            <Text variant="bodySmall" color={C.primary} weight="semibold" style={{ marginLeft: 4 }}>New Trip</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={{ paddingHorizontal: Spacing[4], gap: 20 }}>
          {/* Budget */}
          <Card shadow="sm">
            <Text variant="h4" weight="bold" style={{ marginBottom: 12 }}>Budget 💰</Text>
            <View style={styles.budgetRow}>
              <Text variant="body" secondary>Spent</Text>
              <Text variant="body" weight="bold">${selected.spent.toLocaleString()} / ${selected.budget.toLocaleString()}</Text>
            </View>
            <ProgressBar
              progress={Math.round((selected.spent / selected.budget) * 100)}
              color={C.primary}
              height={8}
              style={{ marginTop: 10 }}
            />
            <Text variant="caption" secondary style={{ marginTop: 6 }}>
              ${(selected.budget - selected.spent).toLocaleString()} remaining
            </Text>
          </Card>

          {/* Itinerary */}
          {selected.itinerary.length > 0 && (
            <View>
              <Text variant="h4" weight="bold" style={{ marginBottom: 12 }}>Itinerary 🗓️</Text>
              <View style={{ gap: 10 }}>
                {selected.itinerary.map((item, i) => (
                  <View key={i} style={styles.itinRow}>
                    <View style={[styles.dayBubble, { backgroundColor: `${C.primary}18` }]}>
                      <Text variant="caption" weight="bold" color={C.primary}>Day</Text>
                      <Text variant="h4" weight="black" color={C.primary}>{item.day}</Text>
                    </View>
                    <View style={styles.itinLine}>
                      {i < selected.itinerary.length - 1 && (
                        <View style={[styles.connector, { backgroundColor: tokens.border }]} />
                      )}
                    </View>
                    <Card style={styles.itinCard} shadow="sm">
                      <Text style={{ fontSize: 20, marginRight: 10 }}>{item.icon}</Text>
                      <Text variant="body" weight="medium" style={{ flex: 1 }}>{item.activity}</Text>
                    </Card>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Packing List */}
          {selected.packing.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <Text variant="h4" weight="bold">Packing List 🧳</Text>
                <Text variant="bodySmall" color={C.primary} weight="semibold">
                  {selected.packing.filter((p) => p.packed).length}/{selected.packing.length} packed
                </Text>
              </View>
              <Card shadow="sm" padding={0}>
                {selected.packing.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.packRow, i < selected.packing.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
                  >
                    <View style={[styles.packCheck, { borderColor: item.packed ? Colors.success[500] : tokens.border, backgroundColor: item.packed ? Colors.success[500] : 'transparent' }]}>
                      {item.packed && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text variant="body" weight="medium" secondary={item.packed}
                      style={{ textDecorationLine: item.packed ? 'line-through' : 'none', marginLeft: 12 }}>
                      {item.item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Card>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  heroContent:   { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 20 },
  heroBottom:    {},
  tripMeta:      { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tripChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  budgetRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  itinRow:       { flexDirection: 'row', alignItems: 'flex-start' },
  dayBubble:     { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itinLine:      { width: 20, alignItems: 'center' },
  connector:     { width: 2, flex: 1, marginVertical: 4 },
  itinCard:      { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  packRow:       { flexDirection: 'row', alignItems: 'center', padding: 14 },
  packCheck:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fab:           { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
