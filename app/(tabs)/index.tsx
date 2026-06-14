import React from 'react';
import {
  ScrollView, View, StyleSheet, TouchableOpacity,
  Dimensions, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Avatar, Card, Badge, ProgressBar } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, Spacing, BorderRadius } from '@/constants/theme';
import api from '@/lib/api';

const { width } = Dimensions.get('window');

// ── Constants ───────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: 'calendar-outline',        label: 'Calendar', route: '/(tabs)/calendar',     color: ModuleColors.calendar  },
  { icon: 'checkmark-circle-outline',label: 'Tasks',    route: '/(modules)/tasks/',    color: ModuleColors.tasks     },
  { icon: 'cart-outline',            label: 'Shopping', route: '/(modules)/shopping/', color: ModuleColors.shopping  },
  { icon: 'restaurant-outline',      label: 'Meals',    route: '/(modules)/meals/',    color: ModuleColors.meals     },
  { icon: 'wallet-outline',          label: 'Finance',  route: '/(modules)/finances/', color: ModuleColors.finances  },
  { icon: 'heart-outline',           label: 'Health',   route: '/(modules)/health/',   color: ModuleColors.health    },
  { icon: 'document-outline',        label: 'Docs',     route: '/(modules)/documents/',color: ModuleColors.documents },
  { icon: 'airplane-outline',        label: 'Travel',   route: '/(modules)/travel/',   color: ModuleColors.travel    },
  { icon: 'trophy-outline',          label: 'Goals',    route: '/(modules)/goals/',    color: ModuleColors.goals     },
  { icon: 'paw-outline',             label: 'Pets',     route: '/(modules)/pets/',     color: ModuleColors.pets      },
  { icon: 'gift-outline',            label: 'Gifts',    route: '/(modules)/gifts/',    color: ModuleColors.gifts     },
  { icon: 'warning-outline',         label: 'SOS',      route: '/(modules)/emergency/',color: ModuleColors.emergency },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  FAMILY:   ModuleColors.calendar.primary,
  PERSONAL: Colors.primary[500],
  WORK:     Colors.warning[500],
  SCHOOL:   Colors.success[500],
  HEALTH:   ModuleColors.health.primary,
  SOCIAL:   '#EC4899',
  SPORTS:   '#F97316',
  HOLIDAY:  '#EF4444',
  BIRTHDAY: '#8B5CF6',
  OTHER:    Colors.neutral[500],
};

const PRIORITY_CONFIG: Record<string, { label: string; variant: any }> = {
  LOW:    { label: 'Low',    variant: 'neutral' },
  MEDIUM: { label: 'Medium', variant: 'info'    },
  HIGH:   { label: 'High',   variant: 'warning' },
  URGENT: { label: 'Urgent', variant: 'error'   },
};

// ── Utilities ────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function roleLabel(role: string) {
  if (role === 'PARENT')      return 'Parent';
  if (role === 'CHILD')       return 'Child';
  if (role === 'GRANDPARENT') return 'Grandparent';
  return role;
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const enabled = !!user?.familyId;

  // today window
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: family, isLoading: loadingFamily } = useQuery<any>({
    queryKey: ['family'],
    queryFn:  async () => { const r = await api.get('/families/me'); return r.data.data; },
    enabled,
    retry: false,
  });

  const { data: todayEvents = [], isLoading: loadingEvents } = useQuery<any[]>({
    queryKey: ['todayEvents', todayStart.toDateString()],
    queryFn:  async () => {
      const r = await api.get(`/calendar/events?from=${todayStart.toISOString()}&to=${todayEnd.toISOString()}`);
      return r.data.data;
    },
    enabled,
  });

  const { data: allTasks = [], isLoading: loadingTasks } = useQuery<any[]>({
    queryKey: ['homeTasks'],
    queryFn:  async () => { const r = await api.get('/tasks?status=PENDING'); return r.data.data; },
    enabled,
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery<any[]>({
    queryKey: ['homeGoals'],
    queryFn:  async () => { const r = await api.get('/goals'); return r.data.data; },
    enabled,
  });

  // Derived
  const members      = family?.members ?? [];
  const pendingTasks = allTasks.slice(0, 3);
  const featuredGoal = goals.find((g: any) => g.type === 'FAMILY' && g.status === 'ACTIVE')
                    ?? goals.find((g: any) => g.status === 'ACTIVE')
                    ?? null;

  // AI summary pill text (computed from real data)
  const aiText = (() => {
    const parts: string[] = [];
    if (allTasks.length > 0) parts.push(`${allTasks.length} task${allTasks.length !== 1 ? 's' : ''} pending`);
    if (todayEvents.length > 0) parts.push(`${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''} today`);
    if (featuredGoal)  parts.push(`Goal: ${featuredGoal.progress}% done`);
    return parts.length > 0 ? parts.join(' · ') : "You're all caught up! 🎉";
  })();

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['family'] }),
      qc.invalidateQueries({ queryKey: ['todayEvents'] }),
      qc.invalidateQueries({ queryKey: ['homeTasks'] }),
      qc.invalidateQueries({ queryKey: ['homeGoals'] }),
    ]);
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[500]} />}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={isDark ? ['#0F0A2E', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : Colors.neutral[500] }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text variant="h2" weight="black" style={{ color: isDark ? '#FFF' : tokens.text, marginTop: 2 }}>
                {greeting()},{'\n'}{user?.name?.split(' ')[0] ?? 'Family'} 👋
              </Text>
            </View>
            <View style={styles.heroRight}>
              <TouchableOpacity onPress={() => router.push('/profile' as any)} style={styles.notifBtn}>
                <View style={styles.notifDot} />
                <Ionicons name="notifications-outline" size={24} color={isDark ? '#fff' : tokens.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/profile' as any)} style={{ marginLeft: 12 }}>
                <Avatar name={user?.name} size="md" online />
              </TouchableOpacity>
            </View>
          </View>

          {/* AI summary pill */}
          <View style={[styles.aiPill, { backgroundColor: isDark ? 'rgba(59,110,255,0.2)' : Colors.primary[50] }]}>
            <Text style={{ fontSize: 16 }}>📊</Text>
            <Text variant="bodySmall" style={{ color: Colors.primary[500], flex: 1, marginLeft: 8 }} numberOfLines={1}
              weight="medium">
              {aiText}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
          </View>
        </LinearGradient>

        {/* ── Family Members ── */}
        <View style={styles.section}>
          <SectionTitle title={family?.name ?? 'Family'} onAction={() => router.push('/family' as any)} actionLabel="Manage" />
          {loadingFamily ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginTop: 8 }} />
          ) : members.length === 0 ? (
            <EmptyWidget icon="👨‍👩‍👧" text="No family members yet — invite someone!" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
              {members.map((m: any) => (
                <TouchableOpacity key={m.id} style={styles.memberItem} activeOpacity={0.8}>
                  <Avatar name={m.name} size="lg" src={m.avatar} />
                  <Text variant="caption" weight="medium" style={{ marginTop: 6 }} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                  <Text variant="caption" style={{ fontSize: 9, color: tokens.textTertiary }}>{roleLabel(m.role)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.memberItem} activeOpacity={0.8} onPress={() => router.push('/family' as any)}>
                <View style={[styles.addMember, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                  <Ionicons name="add" size={28} color={Colors.primary[500]} />
                </View>
                <Text variant="caption" weight="medium" style={{ marginTop: 6, color: Colors.primary[500] }}>Invite</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* ── Today's Events ── */}
        <View style={styles.section}>
          <SectionTitle title="Today's Events" onAction={() => router.push('/(tabs)/calendar' as any)} actionLabel="View all" />
          {loadingEvents ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginTop: 8 }} />
          ) : todayEvents.length === 0 ? (
            <EmptyWidget icon="🗓️" text="No events today — enjoy a quiet day!" />
          ) : (
            <View style={styles.eventsList}>
              {todayEvents.slice(0, 4).map((ev: any) => (
                <Card key={ev.id} style={styles.eventCard} shadow="sm" onPress={() => router.push('/(tabs)/calendar' as any)}>
                  <View style={[styles.eventDot, { backgroundColor: CATEGORY_COLORS[ev.category] ?? Colors.primary[500] }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="semibold" numberOfLines={1} style={{ color: tokens.text }}>{ev.title}</Text>
                    <Text variant="caption" secondary>
                      {ev.allDay ? 'All day' : fmtTime(ev.startDate)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* ── Quick Access ── */}
        <View style={styles.section}>
          <SectionTitle title="Quick Access" />
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(qa => (
              <TouchableOpacity
                key={qa.label}
                style={[styles.quickItem, { backgroundColor: tokens.card }]}
                onPress={() => router.push(qa.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${qa.color.primary}18` }]}>
                  <Ionicons name={qa.icon as any} size={22} color={qa.color.primary} />
                </View>
                <Text variant="caption" weight="semibold" center numberOfLines={1} style={{ color: tokens.text }}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Pending Tasks ── */}
        <View style={styles.section}>
          <SectionTitle title="Tasks" onAction={() => router.push('/(modules)/tasks/' as any)} actionLabel="See all" />
          {loadingTasks ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginTop: 8 }} />
          ) : pendingTasks.length === 0 ? (
            <EmptyWidget icon="✅" text="No pending tasks — great work!" />
          ) : (
            <View style={styles.tasksList}>
              {pendingTasks.map((task: any) => {
                const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
                return (
                  <Card key={task.id} style={styles.taskCard} shadow="sm"
                    onPress={() => router.push('/(modules)/tasks/' as any)}>
                    <View style={[styles.taskCheck, {
                      borderColor:     task.status === 'COMPLETED' ? Colors.success[500] : tokens.border,
                      backgroundColor: task.status === 'COMPLETED' ? Colors.success[500] : 'transparent',
                    }]}>
                      {task.status === 'COMPLETED' && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="medium" numberOfLines={1} style={{ color: tokens.text,
                        textDecorationLine: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                        {task.title}
                      </Text>
                      <Text variant="caption" secondary>
                        {task.assignee?.name ?? 'Unassigned'}
                      </Text>
                    </View>
                    <Badge label={pc.label} variant={pc.variant} size="sm" />
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Family Goal ── */}
        <View style={styles.section}>
          <SectionTitle title="Family Goal" onAction={() => router.push('/(modules)/goals/' as any)} actionLabel="View all" />
          {loadingGoals ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginTop: 8 }} />
          ) : !featuredGoal ? (
            <TouchableOpacity onPress={() => router.push('/(modules)/goals/' as any)}>
              <EmptyWidget icon="🎯" text="No active goals yet — set your first family goal!" />
            </TouchableOpacity>
          ) : (
            <Card style={styles.goalCard} shadow="md">
              <LinearGradient
                colors={isDark ? ['#1A1A00', '#0D0D00'] : ['#FFFBEB', '#FFF9DB']}
                style={styles.goalGradient}
              >
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{featuredGoal.emoji ?? '🎯'}</Text>
                <Text variant="h4" weight="bold" numberOfLines={1} style={{ color: tokens.text }}>{featuredGoal.title}</Text>
                {featuredGoal.description && (
                  <Text variant="bodySmall" secondary style={{ marginTop: 4, marginBottom: 12 }} numberOfLines={2}>
                    {featuredGoal.description}
                  </Text>
                )}
                <View style={{ marginTop: featuredGoal.description ? 0 : 12, marginBottom: 8 }}>
                  <ProgressBar progress={featuredGoal.progress} color={Colors.warning[500]} height={8} />
                </View>
                <View style={styles.goalFooter}>
                  <Text variant="bodySmall" weight="semibold" style={{ color: Colors.warning[600] }}>
                    {featuredGoal.progress}% complete
                  </Text>
                  {featuredGoal.targetDate && (
                    <Text variant="bodySmall" secondary>
                      {featuredGoal.milestones?.filter((m: any) => m.completed).length ?? 0}/
                      {featuredGoal.milestones?.length ?? 0} milestones
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ title, onAction, actionLabel }: { title: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <View style={sectionStyles.row}>
      <Text variant="h4" weight="bold">{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text variant="bodySmall" style={{ color: Colors.primary[500] }} weight="semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyWidget({ icon, text }: { icon: string; text: string }) {
  const { tokens } = useTheme();
  return (
    <View style={[emptyStyles.container, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <Text variant="bodySmall" secondary center style={{ marginTop: 8 }}>{text}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:      { flex: 1 },
  hero:      { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  heroTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroLeft:  { flex: 1 },
  heroRight: { flexDirection: 'row', alignItems: 'center' },
  notifBtn:  { position: 'relative' },
  notifDot:  { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error[500], zIndex: 1 },
  aiPill:    { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.full, paddingVertical: 10, paddingHorizontal: 14 },
  section:   { paddingHorizontal: Spacing[4], marginTop: Spacing[6] },
  membersRow:{ paddingBottom: 4, gap: 20 },
  memberItem:{ alignItems: 'center', width: 60 },
  addMember: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  eventsList:{ gap: 10 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  eventDot:  { width: 10, height: 10, borderRadius: 5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickItem: { width: (width - Spacing[4] * 2 - 12 * 3) / 4, alignItems: 'center', paddingVertical: 14, borderRadius: BorderRadius.xl, gap: 8 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tasksList: { gap: 10 },
  taskCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  goalCard:      { overflow: 'hidden', padding: 0 },
  goalGradient:  { padding: Spacing[5], borderRadius: BorderRadius.xl },
  goalFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
});

const emptyStyles = StyleSheet.create({
  container: { borderRadius: BorderRadius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
});
