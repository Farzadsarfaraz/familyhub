import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, Avatar, ProgressBar, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.tasks;

type Filter = 'all' | 'pending' | 'completed' | 'mine';

interface Task {
  id: string; title: string; assignee: string; priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed'; due?: string; points: number; recurring?: boolean;
}

const TASKS: Task[] = [
  { id: '1', title: 'Clean living room',         assignee: 'Emma',  priority: 'high',   status: 'pending',   due: 'Today',    points: 10 },
  { id: '2', title: 'Pay electricity bill',      assignee: 'Dad',   priority: 'urgent', status: 'pending',   due: 'Today',    points: 15 },
  { id: '3', title: 'Mow the lawn',              assignee: 'Dad',   priority: 'medium', status: 'pending',   due: 'Tomorrow', points: 20, recurring: true },
  { id: '4', title: 'Do laundry',                assignee: 'Mom',   priority: 'medium', status: 'completed', due: 'Yesterday',points: 10 },
  { id: '5', title: 'Grocery run',               assignee: 'Mom',   priority: 'high',   status: 'pending',   due: 'Today',    points: 12 },
  { id: '6', title: 'Empty dishwasher',          assignee: 'Emma',  priority: 'low',    status: 'completed', due: 'Today',    points: 5,  recurring: true },
  { id: '7', title: 'Book dentist appointment',  assignee: 'Mom',   priority: 'medium', status: 'pending',   due: 'This week',points: 8 },
];

const LEADERBOARD = [
  { name: 'Mom',   points: 120, avatar: undefined },
  { name: 'Dad',   points: 95,  avatar: undefined },
  { name: 'Emma',  points: 75,  avatar: undefined },
];

export default function TasksScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const [tasks,  setTasks]  = useState(TASKS);

  const toggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t)
    );
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'pending')   return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'mine')      return t.assignee === 'Dad';
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progress       = Math.round((completedCount / tasks.length) * 100);

  const priorityColor: Record<string, string> = {
    low: Colors.neutral[400], medium: Colors.primary[500],
    high: Colors.warning[500], urgent: Colors.error[500],
  };

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? ['#2D2200', '#0A0A1A'] : ['#FFFBEB', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Tasks & Chores</Text>
          <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
            {completedCount}/{tasks.length} completed today
          </Text>
          <ProgressBar progress={progress} color={C.primary} height={6} style={{ marginTop: 12 }} />
        </View>

        {/* Gamification */}
        <View style={styles.leaderboard}>
          {LEADERBOARD.map((m, i) => (
            <View key={m.name} style={styles.leaderItem}>
              <View style={[styles.medal, { backgroundColor: ['#FFD700', '#C0C0C0', '#CD7F32'][i] + '33' }]}>
                <Text style={{ fontSize: 14 }}>{['🥇', '🥈', '🥉'][i]}</Text>
              </View>
              <Avatar name={m.name} size="sm" />
              <Text variant="caption" weight="semibold" style={{ marginTop: 4 }} numberOfLines={1}>{m.name}</Text>
              <Text variant="caption" color={C.primary} weight="bold">{m.points}⭐</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={[styles.filtersRow, { backgroundColor: tokens.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(['all', 'pending', 'completed', 'mine'] as Filter[]).map((f) => (
            <Chip key={f} label={f === 'all' ? 'All' : f === 'mine' ? 'My Tasks' : f.charAt(0).toUpperCase() + f.slice(1)}
              selected={filter === f} onPress={() => setFilter(f)} color={C.primary} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 10 }}>
        {filtered.map((task) => (
          <TouchableOpacity key={task.id} activeOpacity={0.85}>
            <Card style={styles.taskCard} shadow="sm">
              <TouchableOpacity
                onPress={() => toggle(task.id)}
                style={[
                  styles.checkbox,
                  {
                    borderColor:     task.status === 'completed' ? Colors.success[500] : tokens.border,
                    backgroundColor: task.status === 'completed' ? Colors.success[500] : 'transparent',
                  },
                ]}
              >
                {task.status === 'completed' && <Ionicons name="checkmark" size={14} color="#fff" />}
              </TouchableOpacity>

              <View style={styles.taskBody}>
                <View style={styles.taskTop}>
                  <Text
                    variant="body"
                    weight="semibold"
                    style={{ textDecorationLine: task.status === 'completed' ? 'line-through' : 'none', flex: 1 }}
                    secondary={task.status === 'completed'}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  {task.recurring && (
                    <Ionicons name="repeat-outline" size={14} color={tokens.textTertiary} style={{ marginLeft: 6 }} />
                  )}
                </View>

                <View style={styles.taskMeta}>
                  <Avatar name={task.assignee} size="xs" />
                  <Text variant="caption" secondary style={{ marginLeft: 5 }}>{task.assignee}</Text>
                  {task.due && (
                    <>
                      <Text variant="caption" muted style={{ marginHorizontal: 6 }}>·</Text>
                      <Ionicons name="time-outline" size={12} color={tokens.textTertiary} />
                      <Text variant="caption" secondary style={{ marginLeft: 3 }}>{task.due}</Text>
                    </>
                  )}
                  <Text variant="caption" color={C.primary} weight="semibold" style={{ marginLeft: 'auto' }}>+{task.points}⭐</Text>
                </View>
              </View>

              <View style={[styles.priorityBar, { backgroundColor: priorityColor[task.priority] }]} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: C.primary }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  backBtn:     { marginBottom: 12 },
  headerContent: {},
  leaderboard: { flexDirection: 'row', gap: 12, marginTop: 20 },
  leaderItem:  { flex: 1, alignItems: 'center', gap: 4 },
  medal:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  filtersRow:  { paddingVertical: 12 },
  taskCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, overflow: 'visible' },
  checkbox:    { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  taskBody:    { flex: 1, gap: 6 },
  taskTop:     { flexDirection: 'row', alignItems: 'center' },
  taskMeta:    { flexDirection: 'row', alignItems: 'center' },
  priorityBar: { width: 4, height: '100%', borderRadius: 4, position: 'absolute', right: 0, top: 0, bottom: 0 },
  fab:         { position: 'absolute', bottom: 96, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
