import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.health;

const MEDICATIONS = [
  { id: '1', name: 'Vitamin D',      dosage: '1000 IU', time: '8:00 AM', member: 'Dad',  taken: true  },
  { id: '2', name: 'Omega-3',        dosage: '1 capsule', time: '8:00 AM', member: 'Mom',  taken: false },
  { id: '3', name: 'Amoxicillin',    dosage: '500mg',   time: '12:00 PM', member: 'Emma', taken: false },
  { id: '4', name: 'Prenatal Vit.',  dosage: '1 tablet', time: '9:00 AM', member: 'Mom',  taken: true  },
];

const APPOINTMENTS = [
  { id: '1', title: "Emma's Dentist", doctor: 'Dr. Smith',   date: 'Jun 18', time: '3:00 PM',  type: 'dental'   },
  { id: '2', title: "Annual Checkup", doctor: 'Dr. Johnson', date: 'Jun 25', time: '10:30 AM', type: 'general'  },
  { id: '3', title: "Eye Exam",       doctor: 'Dr. Lee',     date: 'Jul 2',  time: '2:00 PM',  type: 'vision'   },
];

const MEMBERS = ['All', 'Dad', 'Mom', 'Emma', 'Grandma'];

export default function HealthScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [activeMember, setActiveMember] = useState('All');

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? ['#002D0F', '#0A0A1A'] : ['#F0FDF4', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Health Hub</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          Track medications, appointments & wellness
        </Text>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { icon: '💊', label: 'Medications', value: '4 today',    color: C.primary },
            { icon: '📅', label: 'Upcoming',    value: '3 appts',    color: Colors.primary[500] },
            { icon: '🏃', label: 'Wellness',    value: 'Good',       color: Colors.success[500] },
          ].map((s) => (
            <View key={s.label} style={[styles.statChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text variant="caption" secondary style={{ marginTop: 4 }}>{s.label}</Text>
              <Text variant="bodySmall" weight="bold" color={s.color}>{s.value}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Member Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        style={{ maxHeight: 52 }}
      >
        {MEMBERS.map((m) => (
          <Chip key={m} label={m} selected={activeMember === m} onPress={() => setActiveMember(m)} color={C.primary} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 20 }}>
        {/* Today's Medications */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 12 }}>Today's Medications 💊</Text>
          <View style={{ gap: 10 }}>
            {MEDICATIONS.filter((m) => activeMember === 'All' || m.member === activeMember).map((med) => (
              <Card key={med.id} style={styles.medCard} shadow="sm">
                <View style={[styles.medIcon, { backgroundColor: med.taken ? Colors.success[50] : `${C.primary}18` }]}>
                  <Text style={{ fontSize: 22 }}>💊</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold">{med.name}</Text>
                  <Text variant="caption" secondary>{med.dosage} · {med.time} · {med.member}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.takenBtn,
                    { backgroundColor: med.taken ? Colors.success[500] : 'transparent', borderColor: med.taken ? Colors.success[500] : tokens.border },
                  ]}
                >
                  <Ionicons name={med.taken ? 'checkmark' : 'checkmark-outline'} size={16} color={med.taken ? '#fff' : tokens.textTertiary} />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="bold">Upcoming Appointments 📅</Text>
            <TouchableOpacity>
              <Text variant="bodySmall" color={C.primary} weight="semibold">+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 10 }}>
            {APPOINTMENTS.map((appt) => (
              <Card key={appt.id} style={styles.apptCard} shadow="sm" onPress={() => {}}>
                <View style={[styles.apptDate, { backgroundColor: `${C.primary}18` }]}>
                  <Text variant="caption" weight="bold" color={C.primary}>{appt.date.split(' ')[0]}</Text>
                  <Text variant="h3" weight="black" color={C.primary}>{appt.date.split(' ')[1]}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text variant="body" weight="semibold">{appt.title}</Text>
                  <Text variant="caption" secondary>{appt.doctor}</Text>
                  <Text variant="caption" secondary>{appt.time}</Text>
                </View>
                <Badge label={appt.type} variant="success" size="sm" />
              </Card>
            ))}
          </View>
        </View>

        {/* Emergency Contacts */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 12 }}>Emergency Contacts 🚨</Text>
          <Card style={styles.emergencyCard} shadow="sm">
            {[
              { name: 'Dr. Johnson', role: 'Family Doctor', phone: '555-0101' },
              { name: '911',         role: 'Emergency',     phone: '911'      },
              { name: 'Poison Control', role: 'Poison',    phone: '800-222-1222' },
            ].map((c, i, arr) => (
              <View key={c.name} style={[styles.contactRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}>
                <View style={styles.contactIcon}>
                  <Ionicons name="call-outline" size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold">{c.name}</Text>
                  <Text variant="caption" secondary>{c.role}</Text>
                </View>
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: C.primary }]}>
                  <Text variant="caption" weight="bold" color="#fff">{c.phone}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  statsRow:     { flexDirection: 'row', gap: 10, marginTop: 16 },
  statChip:     { flex: 1, borderRadius: BorderRadius.xl, padding: 14, alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  medCard:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  medIcon:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  takenBtn:     { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  apptCard:     { flexDirection: 'row', alignItems: 'center', padding: 14 },
  apptDate:     { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emergencyCard: { padding: 0 },
  contactRow:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
  contactIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: `${ModuleColors.health.primary}18`, alignItems: 'center', justifyContent: 'center' },
  callBtn:      { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },
});
