import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.pets;

const PETS = [
  {
    id: '1', name: 'Max', species: 'Dog', breed: 'Golden Retriever', age: '3 years', emoji: '🐕',
    weight: '32 kg', color: '#F59E0B',
    health: { vaccinations: 100, dental: 60, heartworm: 100 },
    nextVet: 'Jul 20, 2025',
    medications: [
      { name: 'Heartworm prevention', dose: '1 tablet', schedule: 'Monthly', due: 'Jul 1' },
      { name: 'Flea & tick',          dose: '1 tablet', schedule: 'Monthly', due: 'Jul 1' },
    ],
    activities: [
      { label: 'Morning walk', time: '7:00 AM', done: true  },
      { label: 'Feeding',      time: '8:00 AM', done: true  },
      { label: 'Evening walk', time: '6:00 PM', done: false },
      { label: 'Feeding',      time: '7:00 PM', done: false },
    ],
  },
  {
    id: '2', name: 'Whiskers', species: 'Cat', breed: 'British Shorthair', age: '5 years', emoji: '🐈',
    weight: '5.2 kg', color: '#8B5CF6',
    health: { vaccinations: 100, dental: 80, hairball: 100 },
    nextVet: 'Sep 3, 2025',
    medications: [
      { name: 'Hairball remedy', dose: '1 tsp', schedule: 'Weekly', due: 'Jun 16' },
    ],
    activities: [
      { label: 'Feeding AM', time: '7:30 AM', done: true  },
      { label: 'Feeding PM', time: '6:30 PM', done: false },
      { label: 'Playtime',   time: '8:00 PM', done: false },
    ],
  },
];

export default function PetsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [selected, setSelected] = useState(PETS[0]);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerTop}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🐾 Pets</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {PETS.length} pets · All healthy
            </Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#fff' }]}>
            <Ionicons name="add" size={20} color={C.primary} />
            <Text variant="bodySmall" weight="semibold" color={C.primary} style={{ marginLeft: 4 }}>Add Pet</Text>
          </TouchableOpacity>
        </View>

        {/* Pet selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, gap: 12 }}
        >
          {PETS.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              onPress={() => setSelected(pet)}
              style={[styles.petChip, {
                backgroundColor: selected.id === pet.id ? pet.color : isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                borderColor: pet.color,
              }]}
            >
              <Text style={{ fontSize: 24 }}>{pet.emoji}</Text>
              <View style={{ marginLeft: 8 }}>
                <Text variant="body" weight="bold" color={selected.id === pet.id ? '#fff' : tokens.text}>{pet.name}</Text>
                <Text variant="caption" color={selected.id === pet.id ? 'rgba(255,255,255,0.75)' : tokens.textSecondary}>{pet.breed}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.petChip, { borderColor: C.primary, borderStyle: 'dashed' }]}>
            <Ionicons name="add-circle-outline" size={24} color={C.primary} />
            <Text variant="body" weight="semibold" color={C.primary} style={{ marginLeft: 8 }}>New</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 16, paddingBottom: 100 }}>
        {/* Profile card */}
        <Card shadow="md" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: selected.color + '22' }]}>
              <Text style={{ fontSize: 40 }}>{selected.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text variant="h3" weight="black">{selected.name}</Text>
              <Text variant="body" secondary>{selected.breed}</Text>
              <View style={styles.metaRow}>
                <InfoPill icon="calendar-outline" label={selected.age} tokens={tokens} />
                <InfoPill icon="scale-outline"   label={selected.weight} tokens={tokens} />
              </View>
            </View>
          </View>
          <View style={[styles.vetRow, { backgroundColor: Colors.primary[50], borderRadius: BorderRadius.lg }]}>
            <Ionicons name="medical-outline" size={16} color={Colors.primary[500]} />
            <Text variant="bodySmall" color={Colors.primary[600]} style={{ marginLeft: 8 }}>
              Next vet appointment: <Text variant="bodySmall" weight="bold" color={Colors.primary[600]}>{selected.nextVet}</Text>
            </Text>
          </View>
        </Card>

        {/* Health */}
        <Text variant="h4" weight="bold">Health Status</Text>
        <Card shadow="sm" style={{ padding: 16, gap: 12 }}>
          {Object.entries(selected.health).map(([key, val]) => (
            <View key={key}>
              <View style={styles.healthRow}>
                <Text variant="body" weight="medium" style={{ textTransform: 'capitalize' }}>{key}</Text>
                <Text variant="bodySmall" weight="bold" color={val === 100 ? Colors.success[500] : Colors.warning[500]}>{val}%</Text>
              </View>
              <ProgressBar progress={val} color={val === 100 ? Colors.success[500] : Colors.warning[500]} height={6} style={{ marginTop: 6 }} />
            </View>
          ))}
        </Card>

        {/* Today's activities */}
        <Text variant="h4" weight="bold">Today's Schedule</Text>
        <Card shadow="sm" padding={0}>
          {selected.activities.map((act, i) => (
            <View
              key={i}
              style={[styles.actRow, i < selected.activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
            >
              <View style={[styles.actCheck, {
                backgroundColor: act.done ? Colors.success[500] : 'transparent',
                borderColor: act.done ? Colors.success[500] : tokens.border,
              }]}>
                {act.done && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="body" weight="medium" style={{ textDecorationLine: act.done ? 'line-through' : 'none' }} secondary={act.done}>
                  {act.label}
                </Text>
              </View>
              <Text variant="bodySmall" secondary>{act.time}</Text>
            </View>
          ))}
        </Card>

        {/* Medications */}
        <Text variant="h4" weight="bold">Medications</Text>
        {selected.medications.map((med, i) => (
          <Card key={i} shadow="sm" style={styles.medCard}>
            <View style={[styles.medIcon, { backgroundColor: C.primary + '18' }]}>
              <Ionicons name="medkit-outline" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="body" weight="semibold">{med.name}</Text>
              <Text variant="caption" secondary>{med.dose} · {med.schedule}</Text>
            </View>
            <Badge label={`Due ${med.due}`} variant="warning" />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function InfoPill({ icon, label, tokens }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12, marginTop: 6 }}>
      <Ionicons name={icon} size={13} color={tokens.textSecondary} />
      <Text variant="caption" secondary>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  petChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.xl, borderWidth: 1.5 },
  profileCard: { padding: 16 },
  profileRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle:{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap' },
  vetRow:      { flexDirection: 'row', alignItems: 'center', padding: 10 },
  healthRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  actRow:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  actCheck:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  medCard:     { flexDirection: 'row', alignItems: 'center', padding: 14 },
  medIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
