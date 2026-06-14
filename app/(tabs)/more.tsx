import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Avatar, Card, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ModuleItem {
  icon:     IoniconName;
  label:    string;
  route:    string;
  color:    string;
  badge?:   string;
}

const MODULE_SECTIONS: { title: string; items: ModuleItem[] }[] = [
  {
    title: 'Organization',
    items: [
      { icon: 'checkmark-done-circle-outline', label: 'Tasks & Chores',     route: '/(modules)/tasks/',     color: ModuleColors.tasks.primary    },
      { icon: 'cart-outline',                  label: 'Shopping List',      route: '/(modules)/shopping/',  color: ModuleColors.shopping.primary },
      { icon: 'restaurant-outline',            label: 'Meal Planner',       route: '/(modules)/meals/',     color: ModuleColors.meals.primary    },
      { icon: 'trophy-outline',                label: 'Goals',              route: '/(modules)/goals/',     color: ModuleColors.goals.primary    },
    ],
  },
  {
    title: 'Finance & Health',
    items: [
      { icon: 'wallet-outline',    label: 'Family Finance',    route: '/(modules)/finances/',  color: ModuleColors.finances.primary  },
      { icon: 'heart-outline',     label: 'Health & Medical',  route: '/(modules)/health/',    color: ModuleColors.health.primary    },
      { icon: 'document-outline',  label: 'Document Vault',    route: '/(modules)/documents/', color: ModuleColors.documents.primary },
    ],
  },
  {
    title: 'Lifestyle',
    items: [
      { icon: 'airplane-outline',  label: 'Travel Planner',    route: '/(modules)/travel/',    color: ModuleColors.travel.primary    },
      { icon: 'paw-outline',       label: 'Pet Management',    route: '/(modules)/pets/',      color: ModuleColors.pets.primary      },
      { icon: 'gift-outline',      label: 'Gift Center',       route: '/(modules)/gifts/',     color: ModuleColors.gifts.primary     },
      { icon: 'cube-outline',      label: 'Inventory',         route: '/(modules)/inventory/', color: ModuleColors.inventory.primary },
    ],
  },
  {
    title: 'Stories & Memory',
    items: [
      { icon: 'book-outline',      label: 'Family Journal',    route: '/(modules)/journal/',   color: ModuleColors.journal.primary },
      { icon: 'mic-outline',       label: 'Voice Archive',     route: '/(modules)/voice/',     color: ModuleColors.voice.primary   },
      { icon: 'sparkles-outline' as any, label: 'Family Legacy AI', route: '/(modules)/journal/', color: ModuleColors.ai.primary },
    ],
  },
  {
    title: 'Safety',
    items: [
      { icon: 'warning-outline', label: 'Emergency Center', route: '/(modules)/emergency/', color: ModuleColors.emergency.primary, badge: 'SOS' },
    ],
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome' as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#0A0820', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => router.push('/profile' as any)}
            activeOpacity={0.8}
          >
            <Avatar name={user?.name} size="xl" online />
            <View style={styles.profileInfo}>
              <Text variant="h3" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>{user?.name ?? 'Family Member'}</Text>
              <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
                {user?.email ?? 'member@familyhub.app'}
              </Text>
              <View style={styles.roleBadge}>
                <Badge label={user?.role ?? 'PARENT'} variant="primary" />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : tokens.textTertiary} />
          </TouchableOpacity>

          {/* AI Assistant pill */}
          <TouchableOpacity style={[styles.aiBtn, { backgroundColor: isDark ? 'rgba(59,110,255,0.25)' : Colors.primary[50] }]}>
            <Text style={{ fontSize: 18 }}>🤖</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="body" weight="semibold" color={Colors.primary[500]}>Family AI Assistant</Text>
              <Text variant="caption" secondary>Ask anything about your family</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary[500]} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Modules */}
        {MODULE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text variant="label" secondary weight="semibold" style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
            <Card shadow="sm" padding={0}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.moduleRow,
                    { borderBottomColor: tokens.border },
                    index < section.items.length - 1 && styles.moduleRowBorder,
                  ]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.moduleIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14 }}>{item.label}</Text>
                  {item.badge && <Badge label={item.badge} variant="error" size="sm" style={{ marginRight: 8 }} />}
                  <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Settings & Logout */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text variant="label" secondary weight="semibold" style={styles.sectionTitle}>ACCOUNT</Text>
          <Card shadow="sm" padding={0}>
            {[
              { icon: 'settings-outline' as IoniconName, label: 'Settings',          onPress: () => {} },
              { icon: 'people-outline'  as IoniconName, label: 'Family Management',  onPress: () => router.push('/family' as any) },
              { icon: 'notifications-outline' as IoniconName, label: 'Notifications', onPress: () => {} },
              { icon: 'shield-outline'  as IoniconName, label: 'Privacy & Security',  onPress: () => {} },
              { icon: 'help-circle-outline' as IoniconName, label: 'Help & Support', onPress: () => {} },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.moduleRow, i < arr.length - 1 && styles.moduleRowBorder, { borderBottomColor: tokens.border }]}
                onPress={item.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.moduleIcon, { backgroundColor: tokens.surfaceAlt }]}>
                  <Ionicons name={item.icon} size={20} color={tokens.textSecondary} />
                </View>
                <Text variant="body" weight="medium" style={{ flex: 1, marginLeft: 14 }}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
              </TouchableOpacity>
            ))}
          </Card>

          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: Colors.error[50], borderColor: Colors.error[200] }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error[600]} />
            <Text variant="body" weight="semibold" color={Colors.error[600]} style={{ marginLeft: 10 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  profileCard:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileInfo:     { flex: 1, marginLeft: 14 },
  roleBadge:       { marginTop: 6 },
  aiBtn:           { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.xl, padding: 14 },
  section:         { paddingHorizontal: Spacing[4], marginTop: Spacing[5] },
  sectionTitle:    { marginBottom: 10, letterSpacing: 0.8 },
  moduleRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  moduleRowBorder: { borderBottomWidth: 1 },
  moduleIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: BorderRadius.xl, padding: 16, borderWidth: 1 },
});
