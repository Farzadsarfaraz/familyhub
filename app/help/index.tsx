import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type IoniconName = keyof typeof Ionicons.glyphMap;

const FAQ = [
  {
    q: 'How do I invite family members?',
    a: 'Go to Family Management in the More tab. Tap "Invite Member" and share the invite code or link. They\'ll join your family after signing up.',
  },
  {
    q: 'How do task assignments work?',
    a: 'When creating a task you can assign it to any family member. They\'ll receive a notification. Tasks show up on their home screen and the Tasks module.',
  },
  {
    q: 'Can I set recurring events?',
    a: 'Yes! When creating a calendar event tap the "Repeat" option to set daily, weekly, monthly or custom recurrence.',
  },
  {
    q: 'How does the shopping list sync?',
    a: 'The shopping list is shared across all family members in real-time. When someone checks an item off, everyone sees it immediately.',
  },
  {
    q: 'How do I add a pet?',
    a: 'Open Pet Management from the More tab or home screen. Tap the + button and fill in your pet\'s details including species, breed, and birth date.',
  },
  {
    q: 'Can I track medications for family members?',
    a: 'Yes. Open Health & Medical, select a family member, then tap "Add Medication". Set the name, dose, and schedule.',
  },
  {
    q: 'What does the Emergency SOS button do?',
    a: 'It sends an immediate alert to all family members with your location. Use it only in real emergencies. 911 is always listed for direct calling.',
  },
  {
    q: 'How do I change my notification settings?',
    a: 'Go to Settings → Notification Preferences. You can also manage system notification permissions in your device\'s Settings app.',
  },
];

const CONTACT = [
  { icon: 'mail-outline'      as IoniconName, label: 'Email Support',   sub: 'support@familyhub.app',     color: Colors.primary[500]  },
  { icon: 'chatbubble-outline' as IoniconName, label: 'Live Chat',       sub: 'Available 9am–6pm',         color: '#10B981'             },
  { icon: 'bug-outline'       as IoniconName, label: 'Report a Bug',    sub: 'Help us improve the app',   color: '#F59E0B'             },
  { icon: 'star-outline'      as IoniconName, label: 'Rate the App',    sub: 'Leave us a review',         color: '#6366F1'             },
];

export default function HelpScreen() {
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const { tokens } = useTheme();
  const [openFaq,  setOpenFaq] = useState<number | null>(null);

  function toggleFaq(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq(prev => prev === i ? null : i);
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: Spacing[5] }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: Colors.primary[50] }]}>
          <Text style={{ fontSize: 48 }}>👋</Text>
          <Text variant="h3" weight="bold" style={{ color: tokens.text, marginTop: 12 }}>How can we help?</Text>
          <Text variant="body" secondary center style={{ marginTop: 6 }}>
            Find answers below or reach out to our support team
          </Text>
        </View>

        {/* FAQ */}
        <SectionLabel label="FREQUENTLY ASKED QUESTIONS" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          {FAQ.map((item, i) => (
            <View key={i} style={[i < FAQ.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }]}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFaq(i)}
                activeOpacity={0.75}
              >
                <Text variant="body" weight="semibold" style={{ flex: 1, color: tokens.text }}>{item.q}</Text>
                <Ionicons
                  name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={tokens.textTertiary}
                  style={{ marginLeft: 12 }}
                />
              </TouchableOpacity>
              {openFaq === i && (
                <View style={[styles.faqAnswer, { backgroundColor: tokens.surfaceAlt }]}>
                  <Text variant="body" secondary>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
        </Card>

        {/* Contact */}
        <SectionLabel label="GET IN TOUCH" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          {CONTACT.map((c, i) => (
            <TouchableOpacity
              key={c.label}
              style={[styles.contactRow, i < CONTACT.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }]}
              activeOpacity={0.75}
            >
              <View style={[styles.contactIcon, { backgroundColor: `${c.color}18` }]}>
                <Ionicons name={c.icon} size={20} color={c.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{c.label}</Text>
                <Text variant="caption" secondary>{c.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* App info */}
        <SectionLabel label="APP INFO" tokens={tokens} />
        <Card shadow="sm" padding={0}>
          {[
            { label: 'Version',         value: '1.0.0'       },
            { label: 'Platform',        value: Platform.OS === 'ios' ? 'iOS' : 'Android' },
            { label: 'Expo SDK',        value: '54'          },
            { label: 'Made with',       value: '❤️ by FamilyHub' },
          ].map(({ label, value }, i, arr) => (
            <View
              key={label}
              style={[
                styles.infoRow,
                i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border },
              ]}
            >
              <Text variant="body" weight="medium" style={{ color: tokens.text }}>{label}</Text>
              <Text variant="body" secondary>{value}</Text>
            </View>
          ))}
        </Card>

      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, tokens }: { label: string; tokens: any }) {
  return (
    <Text variant="label" secondary weight="semibold" style={{ letterSpacing: 0.8, marginBottom: -8 }}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  hero:        { borderRadius: BorderRadius['2xl'], padding: 28, alignItems: 'center' },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  faqAnswer:   { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, borderRadius: 8, marginHorizontal: 8, marginBottom: 8 },
  contactRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  contactIcon: { width: 42, height: 42, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  infoRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
});
