import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

const LAST_UPDATED = 'June 14, 2026';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By downloading, installing, or using FamilyHub ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.

These Terms apply to all users of FamilyHub, including adults, parents, guardians, and children using the App under adult supervision.`,
  },
  {
    title: '2. Description of Service',
    body: `FamilyHub is a family organisation and coordination platform that provides:

• Shared calendar and event management
• Task and chore assignment and tracking
• Shopping list synchronisation
• Meal planning
• Goal setting and tracking
• Travel planning
• Pet management
• Gift tracking
• Health and medical record storage
• Emergency contact management
• Family messaging and memories
• Document storage
• Family finance overview

Features are provided "as is" and may change over time. We reserve the right to add, modify, or remove features at any time.`,
  },
  {
    title: '3. Account Registration',
    body: `To use FamilyHub you must create an account with a valid email address and password. You agree to:

• Provide accurate and truthful information when registering.
• Keep your password secure and not share it with others outside your family.
• Notify us immediately if you suspect unauthorised access to your account.
• Be responsible for all activity that occurs under your account.

You must be at least 13 years old to create an account. Children under 13 may use the App only through a parent or guardian's account under their supervision.`,
  },
  {
    title: '4. Family Groups',
    body: `FamilyHub operates around "family groups". When you create a family, you become the administrator. As administrator you can:

• Invite other members by sharing an invite code.
• Manage member roles (Parent / Child / Guardian).
• Remove members from the family group.

All members of a family group share access to family content. By joining a family group you acknowledge that other members will see the content you create within shared modules.`,
  },
  {
    title: '5. Acceptable Use',
    body: `You agree not to use FamilyHub to:

• Upload or share content that is illegal, harmful, threatening, abusive, or defamatory.
• Impersonate any person or entity.
• Attempt to gain unauthorised access to any part of the App or its servers.
• Use automated tools or bots to access the App.
• Reverse engineer, decompile, or attempt to extract the source code of the App.
• Interfere with or disrupt the integrity or performance of the service.
• Use the App for any commercial purpose without our express written consent.

We reserve the right to suspend or terminate accounts that violate these rules.`,
  },
  {
    title: '6. Your Content',
    body: `You retain ownership of all content you create in FamilyHub (events, tasks, notes, photos, documents, etc.). By using the App, you grant FamilyHub a limited, non-exclusive, royalty-free licence to store, process, and display your content solely for the purpose of providing the service to you and your family.

You are solely responsible for the content you upload. You represent that you have the right to share any content you add to the App.

You may delete your content at any time. When you delete your account, your content will be removed within 30 days.`,
  },
  {
    title: '7. Health & Medical Data',
    body: `The Health & Medical and Emergency Center modules allow you to store sensitive health information. By using these features you acknowledge:

• FamilyHub is not a medical provider and the App does not provide medical advice.
• Health information you enter is stored securely but is visible to all adult members of your family group.
• You should not rely on FamilyHub as your sole record of medical information.
• In a medical emergency, always contact emergency services (911) first.`,
  },
  {
    title: '8. Privacy',
    body: `Your use of FamilyHub is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the App, you consent to the collection and use of your information as described in our Privacy Policy.`,
  },
  {
    title: '9. Availability & Downtime',
    body: `We aim to keep FamilyHub available 24/7 but we do not guarantee uninterrupted service. We may perform maintenance, updates, or experience unexpected outages.

We are not liable for any losses or damages arising from service unavailability.`,
  },
  {
    title: '10. Intellectual Property',
    body: `FamilyHub and all of its original content, features, and functionality are owned by FamilyHub and are protected by applicable intellectual property laws.

The FamilyHub name, logo, and all related marks are trademarks of FamilyHub. You may not use our trademarks without our prior written consent.`,
  },
  {
    title: '11. Disclaimers',
    body: `THE APP IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.

TO THE FULLEST EXTENT PERMITTED BY LAW, FAMILYHUB DISCLAIMS ALL WARRANTIES INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
  },
  {
    title: '12. Limitation of Liability',
    body: `TO THE FULLEST EXTENT PERMITTED BY LAW, FAMILYHUB SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE APP.

OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE APP IN THE 12 MONTHS PRECEDING THE CLAIM.`,
  },
  {
    title: '13. Changes to Terms',
    body: `We may update these Terms at any time. When we make material changes, we will notify you via push notification or in-app message and update the "Last Updated" date.

Your continued use of FamilyHub after changes take effect constitutes acceptance of the revised Terms. If you do not agree to the new Terms, you must stop using the App.`,
  },
  {
    title: '14. Termination',
    body: `You may stop using FamilyHub and delete your account at any time from Profile → Privacy & Security → Delete Account.

We may suspend or terminate your access if you violate these Terms, with or without notice, at our sole discretion.

Upon termination, your right to use the App ceases immediately. Sections 6, 10, 11, 12 survive termination.`,
  },
  {
    title: '15. Contact',
    body: `If you have questions about these Terms, please contact us:

📧 legal@familyhub.app
🌐 familyhub.app/terms

FamilyHub
support@familyhub.app`,
  },
];

export default function TermsScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { tokens } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={tokens.text} />
        </TouchableOpacity>
        <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        <Card shadow="sm" style={{ padding: 16, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>📋</Text>
          <Text variant="h4" weight="bold" center style={{ color: tokens.text, marginTop: 10 }}>
            Terms of Service
          </Text>
          <Text variant="bodySmall" secondary center style={{ marginTop: 6 }}>
            Last updated: {LAST_UPDATED}
          </Text>
        </Card>

        <Card shadow="sm" style={{ padding: 16, marginBottom: 20, backgroundColor: tokens.surfaceAlt }}>
          <Text variant="body" style={{ color: tokens.text, lineHeight: 22 }}>
            Please read these Terms of Service carefully before using FamilyHub. By using the App, you agree to these Terms. If you have questions, contact us at legal@familyhub.app.
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

        <View style={[styles.footer, { borderTopColor: tokens.border }]}>
          <Text variant="caption" secondary center>
            © 2026 FamilyHub · All rights reserved
          </Text>
          <Text variant="caption" secondary center style={{ marginTop: 4 }}>
            legal@familyhub.app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  section: { marginBottom: 24 },
  footer:  { marginTop: 16, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth },
});
