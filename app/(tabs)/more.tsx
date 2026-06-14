import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Text, Avatar, Card, Badge } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import api from '@/lib/api';

type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Live-count fetchers ───────────────────────────────────────────────────────

function useCounts(familyId?: string | null, userId?: string) {
  const enabled = !!familyId;

  const { data: tasks }       = useQuery({ queryKey: ['pendingTasks'],    queryFn: async () => { const r = await api.get('/tasks?status=PENDING'); return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: shopping }    = useQuery({ queryKey: ['shoppingList'],    queryFn: async () => { const r = await api.get('/shopping/list');         return r.data.data;         }, enabled, staleTime: 60_000 });
  const { data: goals }       = useQuery({ queryKey: ['homeGoals'],       queryFn: async () => { const r = await api.get('/goals');                 return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: appointments} = useQuery({ queryKey: ['appointments'],    queryFn: async () => { const r = await api.get('/health/appointments');   return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: trips }       = useQuery({ queryKey: ['trips'],           queryFn: async () => { const r = await api.get('/travel/trips');           return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: pets }        = useQuery({ queryKey: ['pets'],            queryFn: async () => { const r = await api.get('/pets');                   return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: occasions }   = useQuery({ queryKey: ['giftOccasions'],   queryFn: async () => { const r = await api.get('/gifts/occasions');        return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: docs }        = useQuery({ queryKey: ['documents'],       queryFn: async () => { const r = await api.get('/documents');              return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: memories }    = useQuery({ queryKey: ['memories'],        queryFn: async () => { const r = await api.get('/memories');               return r.data.data as any[]; }, enabled, staleTime: 60_000 });
  const { data: family }      = useQuery({ queryKey: ['family'],          queryFn: async () => { const r = await api.get('/families/me');            return r.data.data;          }, enabled, staleTime: 60_000, retry: false });

  const now = new Date();

  const pendingTasks    = tasks?.length ?? 0;
  const uncheckedItems  = shopping?.items?.filter((i: any) => !i.checked).length ?? 0;
  const activeGoals     = goals?.filter((g: any) => g.status !== 'COMPLETED').length ?? 0;
  const upcomingAppts   = appointments?.filter((a: any) => new Date(a.date) >= now).length ?? 0;
  const upcomingTrips   = trips?.filter((t: any) => new Date(t.endDate) >= now).length ?? 0;
  const petCount        = pets?.length ?? 0;
  const occasionCount   = occasions?.length ?? 0;
  const docCount        = docs?.length ?? 0;
  const memoryCount     = memories?.length ?? 0;
  const memberCount     = family?.members?.length ?? 0;

  return { pendingTasks, uncheckedItems, activeGoals, upcomingAppts, upcomingTrips, petCount, occasionCount, docCount, memoryCount, memberCount };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const counts = useCounts(user?.familyId, user?.id);

  const MODULE_SECTIONS: { title: string; items: { icon: IoniconName; label: string; route: string; color: string; badge?: string }[] }[] = [
    {
      title: 'Organization',
      items: [
        { icon: 'checkmark-done-circle-outline', label: 'Tasks & Chores',  route: '/(modules)/tasks/',    color: ModuleColors.tasks.primary,    badge: counts.pendingTasks   > 0 ? String(counts.pendingTasks)   : undefined },
        { icon: 'cart-outline',                  label: 'Shopping List',   route: '/(modules)/shopping/', color: ModuleColors.shopping.primary, badge: counts.uncheckedItems > 0 ? String(counts.uncheckedItems) : undefined },
        { icon: 'restaurant-outline',            label: 'Meal Planner',    route: '/(modules)/meals/',    color: ModuleColors.meals.primary },
        { icon: 'trophy-outline',                label: 'Goals',           route: '/(modules)/goals/',    color: ModuleColors.goals.primary,    badge: counts.activeGoals    > 0 ? String(counts.activeGoals)    : undefined },
      ],
    },
    {
      title: 'Finance & Health',
      items: [
        { icon: 'wallet-outline',   label: 'Family Finance',   route: '/(modules)/finances/',  color: ModuleColors.finances.primary  },
        { icon: 'heart-outline',    label: 'Health & Medical', route: '/(modules)/health/',    color: ModuleColors.health.primary,    badge: counts.upcomingAppts > 0 ? String(counts.upcomingAppts) : undefined },
        { icon: 'document-outline', label: 'Document Vault',   route: '/(modules)/documents/', color: ModuleColors.documents.primary, badge: counts.docCount      > 0 ? String(counts.docCount)      : undefined },
      ],
    },
    {
      title: 'Lifestyle',
      items: [
        { icon: 'airplane-outline', label: 'Travel Planner', route: '/(modules)/travel/',    color: ModuleColors.travel.primary,    badge: counts.upcomingTrips   > 0 ? String(counts.upcomingTrips)   : undefined },
        { icon: 'paw-outline',      label: 'Pet Management', route: '/(modules)/pets/',      color: ModuleColors.pets.primary,      badge: counts.petCount         > 0 ? String(counts.petCount)         : undefined },
        { icon: 'gift-outline',     label: 'Gift Center',    route: '/(modules)/gifts/',     color: ModuleColors.gifts.primary,     badge: counts.occasionCount    > 0 ? String(counts.occasionCount)    : undefined },
        { icon: 'cube-outline',     label: 'Inventory',      route: '/(modules)/inventory/', color: ModuleColors.inventory.primary },
      ],
    },
    {
      title: 'Stories & Memory',
      items: [
        { icon: 'book-outline', label: 'Family Journal',    route: '/(modules)/journal/', color: ModuleColors.journal.primary },
        { icon: 'mic-outline',  label: 'Voice Archive',     route: '/(modules)/voice/',   color: ModuleColors.voice.primary   },
        { icon: 'images-outline', label: 'Memories',        route: '/(tabs)/memories',    color: ModuleColors.ai.primary,    badge: counts.memoryCount > 0 ? String(counts.memoryCount) : undefined },
      ],
    },
    {
      title: 'Safety',
      items: [
        { icon: 'warning-outline', label: 'Emergency Center', route: '/(modules)/emergency/', color: ModuleColors.emergency.primary, badge: 'SOS' },
      ],
    },
  ];

  const QUICK_STATS = [
    { emoji: '✅', label: 'Pending',   value: counts.pendingTasks,  color: ModuleColors.tasks.primary    },
    { emoji: '🛒', label: 'To Buy',    value: counts.uncheckedItems, color: ModuleColors.shopping.primary },
    { emoji: '🎯', label: 'Goals',     value: counts.activeGoals,    color: ModuleColors.goals.primary    },
    { emoji: '👨‍👩‍👧', label: 'Members',  value: counts.memberCount,    color: Colors.primary[500]           },
  ];

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
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
              <Text variant="h3" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>
                {user?.name ?? 'Family Member'}
              </Text>
              <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
                {user?.email ?? ''}
              </Text>
              <View style={{ marginTop: 6 }}>
                <Badge label={user?.role ?? 'PARENT'} variant="primary" />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : tokens.textTertiary} />
          </TouchableOpacity>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            {QUICK_STATS.map(s => (
              <View key={s.label} style={[styles.statChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)' }]}>
                <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
                <Text variant="h4" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 2 }}>
                  {s.value}
                </Text>
                <Text variant="caption" secondary numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* AI Assistant pill */}
          <TouchableOpacity
            style={[styles.aiBtn, { backgroundColor: isDark ? 'rgba(59,110,255,0.25)' : Colors.primary[50] }]}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>🤖</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text variant="body" weight="semibold" color={Colors.primary[500]}>Family AI Assistant</Text>
              <Text variant="caption" secondary>Ask anything about your family</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary[500]} />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Module sections ── */}
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
                  {item.badge && (
                    <Badge
                      label={item.badge}
                      variant={item.badge === 'SOS' ? 'error' : 'primary'}
                      size="sm"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* ── Account ── */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text variant="label" secondary weight="semibold" style={styles.sectionTitle}>ACCOUNT</Text>
          <Card shadow="sm" padding={0}>
            {([
              { icon: 'person-outline'        as IoniconName, label: 'Profile',           onPress: () => router.push('/profile'       as any) },
              { icon: 'people-outline'        as IoniconName, label: 'Family Management', onPress: () => router.push('/family'        as any) },
              { icon: 'settings-outline'      as IoniconName, label: 'Settings',          onPress: () => router.push('/settings'      as any) },
              { icon: 'notifications-outline' as IoniconName, label: 'Notifications',     onPress: () => router.push('/notifications' as any) },
              { icon: 'shield-outline'        as IoniconName, label: 'Privacy & Security',onPress: () => router.push('/privacy'       as any) },
              { icon: 'help-circle-outline'   as IoniconName, label: 'Help & Support',    onPress: () => router.push('/help'          as any) },
            ] as const).map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.moduleRow,
                  { borderBottomColor: tokens.border },
                  i < arr.length - 1 && styles.moduleRowBorder,
                ]}
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
            onPress={() => logout()}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error[600]} />
            <Text variant="body" weight="semibold" color={Colors.error[600]} style={{ marginLeft: 10 }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  profileCard:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileInfo:     { flex: 1, marginLeft: 14 },
  statsRow:        { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statChip:        { flex: 1, borderRadius: BorderRadius.xl, padding: 10, alignItems: 'center' },
  aiBtn:           { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.xl, padding: 14 },
  section:         { paddingHorizontal: Spacing[4], marginTop: Spacing[5] },
  sectionTitle:    { marginBottom: 10, letterSpacing: 0.8 },
  moduleRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  moduleRowBorder: { borderBottomWidth: 1 },
  moduleIcon:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: BorderRadius.xl, padding: 16, borderWidth: 1 },
});
