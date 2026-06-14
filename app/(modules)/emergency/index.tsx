import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.emergency;

const EMERGENCY_CONTACTS = [
  { name: 'Dr. Sarah Chen',   relation: 'Family Doctor',      phone: '+1 (555) 123-4567', emoji: '👩‍⚕️', color: Colors.primary[500] },
  { name: 'Emergency (911)', relation: 'Emergency Services',  phone: '911',               emoji: '🚨', color: Colors.error[500]   },
  { name: 'Poison Control',  relation: 'Poison Help Line',    phone: '1-800-222-1222',    emoji: '☠️', color: Colors.warning[500] },
  { name: 'Grandma Helen',   relation: 'Emergency Guardian',  phone: '+1 (555) 987-6543', emoji: '👵', color: '#8B5CF6'           },
  { name: 'City Hospital',   relation: 'Nearest Hospital',    phone: '+1 (555) 456-7890', emoji: '🏥', color: Colors.success[500] },
];

const MEDICAL_PROFILES = [
  {
    name: 'Dad', emoji: '👨',
    bloodType: 'O+', allergies: ['Penicillin', 'Shellfish'],
    conditions: ['Mild hypertension'],
    medications: ['Lisinopril 10mg'],
  },
  {
    name: 'Mom', emoji: '👩',
    bloodType: 'A-', allergies: ['None known'],
    conditions: [],
    medications: ['Vitamin D3'],
  },
  {
    name: 'Emma', emoji: '👧',
    bloodType: 'A+', allergies: ['Peanuts'],
    conditions: [],
    medications: ['EpiPen (carry at all times)'],
  },
];

const NEARBY = [
  { name: 'City General Hospital', distance: '1.2 km', open: true,  emoji: '🏥' },
  { name: 'CVS Pharmacy',          distance: '0.4 km', open: true,  emoji: '💊' },
  { name: 'Urgent Care Center',    distance: '2.1 km', open: false, emoji: '🏨' },
];

export default function EmergencyScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [profileIdx, setProfileIdx] = useState(0);

  const handleCall = (phone: string, name: string) => {
    if (phone === '911') {
      Alert.alert('Call Emergency?', 'This will call 911.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
      ]);
    } else {
      Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
    }
  };

  const profile = MEDICAL_PROFILES[profileIdx];

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🚨 Emergency</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          Critical contacts & medical info
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 20, paddingBottom: 100 }}>
        {/* SOS Button */}
        <TouchableOpacity
          onPress={() => Alert.alert('SOS Alert', 'This will send your location and an SOS message to all emergency contacts.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send SOS', style: 'destructive' },
          ])}
          activeOpacity={0.8}
        >
          <LinearGradient colors={[Colors.error[600], Colors.error[400]]} style={styles.sosBtn}>
            <Ionicons name="alert-circle" size={36} color="#fff" />
            <Text variant="h3" weight="black" color="#fff" style={{ marginTop: 8 }}>SEND SOS</Text>
            <Text variant="caption" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>
              Alerts all contacts with your location
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Emergency Contacts */}
        <Text variant="h4" weight="bold">Emergency Contacts</Text>
        {EMERGENCY_CONTACTS.map((c, i) => (
          <Card key={i} shadow="sm" style={styles.contactCard}>
            <View style={[styles.contactAvatar, { backgroundColor: c.color + '18' }]}>
              <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="body" weight="bold">{c.name}</Text>
              <Text variant="caption" secondary>{c.relation}</Text>
              <Text variant="caption" color={Colors.primary[500]}>{c.phone}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCall(c.phone, c.name)}
              style={[styles.callBtn, { backgroundColor: Colors.success[500] }]}
            >
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
          </Card>
        ))}

        {/* Medical Profiles */}
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="bold">Medical Profiles</Text>
          <Badge label={`${MEDICAL_PROFILES.length} members`} variant="primary" />
        </View>

        {/* Profile selector */}
        <View style={styles.profileTabs}>
          {MEDICAL_PROFILES.map((p, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setProfileIdx(i)}
              style={[styles.profileTab, {
                backgroundColor: profileIdx === i ? C.primary : tokens.card,
                borderColor: profileIdx === i ? C.primary : tokens.border,
              }]}
            >
              <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
              <Text variant="bodySmall" weight="semibold" color={profileIdx === i ? '#fff' : tokens.text} style={{ marginTop: 4 }}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card shadow="md" style={{ padding: 16, gap: 14 }}>
          <View style={styles.medRow}>
            <View style={[styles.medIcon, { backgroundColor: Colors.error[50] }]}>
              <Text style={{ fontSize: 18 }}>🩸</Text>
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text variant="caption" secondary>Blood Type</Text>
              <Text variant="h3" weight="black" color={Colors.error[500]}>{profile.bloodType}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.border }]} />

          <View>
            <Text variant="bodySmall" weight="bold" secondary style={{ marginBottom: 6 }}>ALLERGIES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.allergies.map((a, i) => (
                <View key={i} style={[styles.pill, { backgroundColor: Colors.error[50], borderColor: Colors.error[200] }]}>
                  <Text variant="caption" color={Colors.error[600]}>⚠️ {a}</Text>
                </View>
              ))}
            </View>
          </View>

          {profile.conditions.length > 0 && (
            <View>
              <Text variant="bodySmall" weight="bold" secondary style={{ marginBottom: 6 }}>CONDITIONS</Text>
              {profile.conditions.map((cond, i) => (
                <Text key={i} variant="body" secondary>• {cond}</Text>
              ))}
            </View>
          )}

          <View>
            <Text variant="bodySmall" weight="bold" secondary style={{ marginBottom: 6 }}>MEDICATIONS</Text>
            {profile.medications.map((med, i) => (
              <View key={i} style={[styles.pill, { backgroundColor: Colors.primary[50], borderColor: Colors.primary[200] }]}>
                <Text variant="caption" color={Colors.primary[600]}>💊 {med}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Nearby */}
        <Text variant="h4" weight="bold">Nearby Resources</Text>
        {NEARBY.map((n, i) => (
          <Card key={i} shadow="sm" style={styles.nearbyCard}>
            <Text style={{ fontSize: 22 }}>{n.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="body" weight="semibold">{n.name}</Text>
              <Text variant="caption" secondary>{n.distance} away</Text>
            </View>
            <Badge label={n.open ? 'Open' : 'Closed'} variant={n.open ? 'success' : 'neutral'} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  sosBtn:       { borderRadius: BorderRadius['2xl'], padding: 28, alignItems: 'center', shadowColor: Colors.error[500], shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  contactCard:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  contactAvatar:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  callBtn:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileTabs:  { flexDirection: 'row', gap: 10 },
  profileTab:   { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: BorderRadius.xl, borderWidth: 1.5 },
  medRow:       { flexDirection: 'row', alignItems: 'center' },
  medIcon:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  divider:      { height: 1 },
  pill:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: 4 },
  nearbyCard:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
});
