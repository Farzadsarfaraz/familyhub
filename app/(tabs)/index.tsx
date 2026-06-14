import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Card, Badge, ProgressBar } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, Spacing, BorderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { icon: 'calendar-outline',   label: 'Calendar',  route: '/(tabs)/calendar',         color: ModuleColors.calendar  },
  { icon: 'checkmark-circle-outline', label: 'Tasks', route: '/(modules)/tasks/',      color: ModuleColors.tasks     },
  { icon: 'cart-outline',       label: 'Shopping',  route: '/(modules)/shopping/',      color: ModuleColors.shopping  },
  { icon: 'restaurant-outline', label: 'Meals',     route: '/(modules)/meals/',         color: ModuleColors.meals     },
  { icon: 'wallet-outline',     label: 'Finance',   route: '/(modules)/finances/',      color: ModuleColors.finances  },
  { icon: 'heart-outline',      label: 'Health',    route: '/(modules)/health/',        color: ModuleColors.health    },
  { icon: 'document-outline',   label: 'Docs',      route: '/(modules)/documents/',     color: ModuleColors.documents },
  { icon: 'airplane-outline',   label: 'Travel',    route: '/(modules)/travel/',        color: ModuleColors.travel    },
  { icon: 'trophy-outline',     label: 'Goals',     route: '/(modules)/goals/',         color: ModuleColors.goals     },
  { icon: 'paw-outline',        label: 'Pets',      route: '/(modules)/pets/',          color: ModuleColors.pets      },
  { icon: 'gift-outline',       label: 'Gifts',     route: '/(modules)/gifts/',         color: ModuleColors.gifts     },
  { icon: 'warning-outline',    label: 'SOS',       route: '/(modules)/emergency/',     color: ModuleColors.emergency },
] as const;

const MOCK_EVENTS = [
  { id: '1', title: 'Family dinner', time: '7:00 PM', color: ModuleColors.calendar.primary },
  { id: '2', title: 'Emma: Piano lesson', time: '4:30 PM', color: ModuleColors.health.primary },
  { id: '3', title: 'Grocery run', time: '10:00 AM', color: ModuleColors.shopping.primary },
];

const MOCK_TASKS = [
  { id: '1', title: 'Clean the living room', assignee: 'Emma', done: false, priority: 'high' },
  { id: '2', title: 'Pay electricity bill', assignee: 'Dad', done: true,  priority: 'urgent' },
  { id: '3', title: 'Book dentist appointment', assignee: 'Mom', done: false, priority: 'medium' },
];

const MOCK_MEMBERS = [
  { id: '1', name: 'Dad',   role: 'PARENT',      avatar: undefined, online: true  },
  { id: '2', name: 'Mom',   role: 'PARENT',      avatar: undefined, online: false },
  { id: '3', name: 'Emma',  role: 'CHILD',       avatar: undefined, online: true  },
  { id: '4', name: 'Grandma', role: 'GRANDPARENT', avatar: undefined, online: false },
];

export default function HomeScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user     = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary[500]} />}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={isDark ? ['#0F0A2E', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text variant="bodySmall" color={isDark ? 'rgba(255,255,255,0.5)' : Colors.neutral[500]}>
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

          {/* AI Summary pill */}
          <TouchableOpacity
            style={[styles.aiPill, { backgroundColor: isDark ? 'rgba(59,110,255,0.2)' : Colors.primary[50] }]}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>🤖</Text>
            <Text variant="bodySmall" color={Colors.primary[500]} weight="medium" style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>
              AI: You have 3 tasks due today and Emma's birthday is in 5 days!
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Family Members */}
        <View style={styles.section}>
          <SectionTitle title="Family" onAction={() => router.push('/family' as any)} actionLabel="Manage" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
            {MOCK_MEMBERS.map((m) => (
              <TouchableOpacity key={m.id} style={styles.memberItem} activeOpacity={0.8}>
                <Avatar name={m.name} size="lg" online={m.online} />
                <Text variant="caption" weight="medium" style={{ marginTop: 6 }} numberOfLines={1}>
                  {m.name}
                </Text>
                <Text variant="caption" muted style={{ fontSize: 9 }}>
                  {m.role === 'PARENT' ? 'Parent' : m.role === 'CHILD' ? 'Child' : 'Grandparent'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.memberItem} activeOpacity={0.8} onPress={() => router.push('/family' as any)}>
              <View style={[styles.addMember, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                <Ionicons name="add" size={28} color={Colors.primary[500]} />
              </View>
              <Text variant="caption" weight="medium" style={{ marginTop: 6 }} color={Colors.primary[500]}>Invite</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Today's Events */}
        <View style={styles.section}>
          <SectionTitle title="Today's Events" onAction={() => router.push('/(tabs)/calendar' as any)} actionLabel="View all" />
          {MOCK_EVENTS.length === 0 ? (
            <EmptyWidget icon="🗓️" text="No events today — enjoy a quiet day!" />
          ) : (
            <View style={styles.eventsList}>
              {MOCK_EVENTS.map((ev) => (
                <Card key={ev.id} style={styles.eventCard} shadow="sm" onPress={() => {}}>
                  <View style={[styles.eventDot, { backgroundColor: ev.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="semibold" numberOfLines={1}>{ev.title}</Text>
                    <Text variant="caption" secondary>{ev.time}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions grid */}
        <View style={styles.section}>
          <SectionTitle title="Quick Access" />
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((qa) => (
              <TouchableOpacity
                key={qa.label}
                style={[styles.quickItem, { backgroundColor: tokens.card }]}
                onPress={() => router.push(qa.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${qa.color.primary}18` }]}>
                  <Ionicons name={qa.icon as any} size={22} color={qa.color.primary} />
                </View>
                <Text variant="caption" weight="semibold" center numberOfLines={1}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pending Tasks */}
        <View style={styles.section}>
          <SectionTitle title="Tasks" onAction={() => router.push('/(modules)/tasks/' as any)} actionLabel="See all" />
          <View style={styles.tasksList}>
            {MOCK_TASKS.map((task) => (
              <Card key={task.id} style={styles.taskCard} shadow="sm" onPress={() => {}}>
                <View style={[styles.taskCheck, { borderColor: task.done ? Colors.success[500] : tokens.border, backgroundColor: task.done ? Colors.success[500] : 'transparent' }]}>
                  {task.done && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="medium" style={{ textDecorationLine: task.done ? 'line-through' : 'none' }} secondary={task.done} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text variant="caption" secondary>{task.assignee}</Text>
                </View>
                <PriorityBadge priority={task.priority} />
              </Card>
            ))}
          </View>
        </View>

        {/* Family Goal */}
        <View style={styles.section}>
          <SectionTitle title="Family Goal" onAction={() => router.push('/(modules)/goals/' as any)} actionLabel="View" />
          <Card style={styles.goalCard} shadow="md">
            <LinearGradient
              colors={isDark ? ['#1A1A00', '#0D0D00'] : ['#FFFBEB', '#FFF9DB']}
              style={styles.goalGradient}
            >
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🏖️</Text>
              <Text variant="h4" weight="bold" numberOfLines={1}>Summer Family Vacation</Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 4, marginBottom: 16 }}>Saving $3,000 • June 2025</Text>
              <ProgressBar progress={62} color={Colors.warning[500]} height={8} />
              <View style={styles.goalFooter}>
                <Text variant="bodySmall" weight="semibold" color={Colors.warning[600]}>$1,860 saved</Text>
                <Text variant="bodySmall" secondary>of $3,000</Text>
              </View>
            </LinearGradient>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, onAction, actionLabel }: { title: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <View style={sectionStyles.row}>
      <Text variant="h4" weight="bold">{title}</Text>
      {onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text variant="bodySmall" color={Colors.primary[500]} weight="semibold">{actionLabel}</Text>
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

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    low:    { label: 'Low',    variant: 'neutral' },
    medium: { label: 'Medium', variant: 'info'    },
    high:   { label: 'High',   variant: 'warning' },
    urgent: { label: 'Urgent', variant: 'error'   },
  };
  const { label, variant } = map[priority] ?? map.low;
  return <Badge label={label} variant={variant} size="sm" />;
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  hero:       { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  heroTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroLeft:   { flex: 1 },
  heroRight:  { flexDirection: 'row', alignItems: 'center' },
  notifBtn:   { position: 'relative' },
  notifDot:   { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error[500], zIndex: 1 },
  aiPill:     { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.full, paddingVertical: 10, paddingHorizontal: 14 },
  section:    { paddingHorizontal: Spacing[4], marginTop: Spacing[6] },
  membersRow: { paddingBottom: 4, gap: 20 },
  memberItem: { alignItems: 'center', width: 60 },
  addMember:  { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  eventsList: { gap: 10 },
  eventCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  eventDot:   { width: 10, height: 10, borderRadius: 5 },
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickItem:  { width: (width - Spacing[4] * 2 - 12 * 3) / 4, alignItems: 'center', paddingVertical: 14, borderRadius: BorderRadius.xl, gap: 8 },
  quickIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tasksList:  { gap: 10 },
  taskCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  taskCheck:  { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  goalCard:   { overflow: 'hidden', padding: 0 },
  goalGradient: { padding: Spacing[5], borderRadius: BorderRadius.xl },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
});

const emptyStyles = StyleSheet.create({
  container: { borderRadius: BorderRadius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
});
