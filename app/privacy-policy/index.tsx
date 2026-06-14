import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing } from '@/constants/theme';

const LAST_UPDATED = 'June 14, 2026';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly when you use FamilyHub:

• Account information: name, email address, and password when you register.
• Profile information: avatar photos, role (parent/child/guardian), and family name.
• Family data: events, tasks, shopping lists, meal plans, goals, travel plans, pet profiles, gift lists, and any other content you create inside the app.
• Medical information: health profiles, medications, and appointments you choose to enter in the Health & Medical module.
• Emergency contacts: names, phone numbers, and relationships you add to the Emergency Center.
• Device information: device type, operating system version, and push notification token (to deliver alerts).
• Usage data: which features you use and how often, to improve the product.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information we collect to:

• Provide, maintain, and improve FamilyHub's features.
• Synchronise your family's data across all members' devices in real time.
• Send push notifications for reminders, events, and tasks you have configured.
• Authenticate your identity and keep your account secure.
• Respond to your support requests.
• Analyse aggregate, anonymised usage patterns to improve performance and reliability.

We do not sell, rent, or share your personal information with third parties for advertising or marketing purposes.`,
  },
  {
    title: '3. Data Sharing Within Your Family',
    body: `FamilyHub is a shared family platform. Content you create — including tasks, events, shopping items, goals, and messages — is visible to all members of your family group by design.

Medical profiles and emergency contacts are visible only to family members. You control what health information you enter.

You may leave a family group at any time from Family Management settings.`,
  },
  {
    title: '4. Data Storage & Security',
    body: `Your data is stored on secure servers hosted by Neon (PostgreSQL cloud database). Data is encrypted in transit using TLS 1.2 or higher and at rest using AES-256 encryption.

We implement industry-standard security practices including:
• JWT-based authentication with short-lived access tokens and rotating refresh tokens.
• Bcrypt password hashing (cost factor 12).
• Rate limiting on all API endpoints.
• Regular security reviews.

No method of transmission over the Internet is 100% secure. We cannot guarantee absolute security, but we work to protect your data using the best available practices.`,
  },
  {
    title: '5. Data Retention',
    body: `We retain your personal data for as long as your account is active. If you delete your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain it by law.

Family content (events, tasks, etc.) created by other family members may persist in their accounts after you leave the family group.`,
  },
  {
    title: '6. Children\'s Privacy',
    body: `FamilyHub is designed for family use and may be used by children under the supervision of a parent or guardian. We do not knowingly collect personal information from children under 13 without verified parental consent.

If you believe a child has provided us personal information without parental consent, please contact us at privacy@familyhub.app and we will delete it promptly.`,
  },
  {
    title: '7. Your Rights',
    body: `Depending on your location, you may have the following rights regarding your personal data:

• Access: request a copy of the data we hold about you.
• Correction: request that we correct inaccurate or incomplete data.
• Deletion: request that we delete your personal data ("right to be forgotten").
• Portability: request your data in a machine-readable format.
• Objection: object to certain types of processing.

To exercise any of these rights, contact us at privacy@familyhub.app. We will respond within 30 days.`,
  },
  {
    title: '8. Push Notifications',
    body: `With your permission, we send push notifications for:
• Upcoming calendar events and reminders.
• Task assignments and completions.
• New chat messages.
• Birthday and anniversary reminders.

You can disable push notifications at any time from your device's Settings app, or manage notification preferences within FamilyHub under Settings → Notification Preferences.`,
  },
  {
    title: '9. Third-Party Services',
    body: `FamilyHub uses the following third-party services:

• Neon (neon.tech): Database hosting. Your data is stored on their servers under their privacy policy.
• Expo (expo.dev): Mobile app framework and push notification delivery.
• Resend: Email delivery for account verification and password reset emails.

We do not use advertising networks, tracking pixels, or sell data to data brokers.`,
  },
  {
    title: '10. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we make significant changes, we will notify you via a push notification or in-app message, and update the "Last Updated" date at the top of this page.

Your continued use of FamilyHub after changes become effective constitutes your acceptance of the revised policy.`,
  },
  {
    title: '11. Contact Us',
    body: `If you have questions or concerns about this Privacy Policy or your data, please contact us:

📧 privacy@familyhub.app
🌐 familyhub.app/privacy

FamilyHub
support@familyhub.app`,
  },
];

export default function PrivacyPolicyScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { tokens } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        <Card shadow="sm" style={{ padding: 16, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text variant="h4" weight="bold" center style={{ color: tokens.text, marginTop: 10 }}>
            Your Privacy Matters
          </Text>
          <Text variant="bodySmall" secondary center style={{ marginTop: 6 }}>
            Last updated: {LAST_UPDATED}
          </Text>
        </Card>

        <Card shadow="sm" style={{ padding: 16, marginBottom: 20, backgroundColor: tokens.surfaceAlt }}>
          <Text variant="body" style={{ color: tokens.text, lineHeight: 22 }}>
            FamilyHub is built for families. We collect only the data needed to run the app, we never sell it, and you remain in control at all times. This policy explains what we collect, why, and how.
          </Text>
        </Card>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text variant="body" weight="bold" style={{ color: tokens.text, marginBottom: 8 }}>
              {section.title}
            </Text>
            <Text variant="body" style={{ color: tokens.textSecondary, lineHeight: 22 }}>
              {section.body}
            </Text>
          </View>
        ))}

        {/* Tappable contact actions */}
        <Card shadow="sm" padding={0} style={{ marginBottom: 20 }}>
          {[
            { icon: 'mail-outline',   label: 'Email Us',          sub: 'privacy@familyhub.app', url: 'mailto:privacy@familyhub.app?subject=Privacy%20Question' },
            { icon: 'globe-outline',  label: 'Privacy Web Page',  sub: 'familyhub.app/privacy',  url: 'https://familyhub.app/privacy' },
            { icon: 'shield-outline', label: 'Report an Issue',   sub: 'privacy@familyhub.app', url: 'mailto:privacy@familyhub.app?subject=Privacy%20Issue' },
          ].map(({ icon, label, sub, url }, i, arr) => (
            <TouchableOpacity
              key={label}
              style={[styles.contactRow, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border }]}
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.75}
            >
              <View style={[styles.contactIcon, { backgroundColor: Colors.primary[50] }]}>
                <Text style={{ fontSize: 18 }}>{icon === 'mail-outline' ? '📧' : icon === 'globe-outline' ? '🌐' : '🔒'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{label}</Text>
                <Text variant="caption" secondary>{sub}</Text>
              </View>
              <Text style={{ fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <View style={[styles.footer, { borderTopColor: tokens.border }]}>
          <Text variant="caption" secondary center>
            © 2026 FamilyHub · All rights reserved
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  section:     { marginBottom: 24 },
  footer:      { marginTop: 4, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth },
  contactRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  contactIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
