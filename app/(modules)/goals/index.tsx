import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, ProgressBar, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.goals;

const GOALS = [
  {
    id: '1', emoji: '🏋️', title: 'Family Fitness Challenge', type: 'family',
    progress: 45, target: 'Exercise 3x/week for 3 months', deadline: 'Aug 31',
    milestones: [
      { label: 'Week 1 complete',  done: true  },
      { label: 'Week 4 complete',  done: true  },
      { label: 'Month 1 complete', done: false },
      { label: 'Month 3 complete', done: false },
    ],
  },
  {
    id: '2', emoji: '📚', title: "Emma's Reading Goal", type: 'personal',
    progress: 70, target: 'Read 20 books this year', deadline: 'Dec 31',
    milestones: [
      { label: '5 books read',  done: true  },
      { label: '10 books read', done: true  },
      { label: '15 books read', done: false },
      { label: '20 books read', done: false },
    ],
  },
  {
    id: '3', emoji: '🌱', title: 'Zero Waste Family', type: 'family',
    progress: 30, target: 'Reduce waste by 50% by year end', deadline: 'Dec 31',
    milestones: [
      { label: 'Start composting',    done: true  },
      { label: 'Switch to reusables', done: false },
      { label: '25% reduction',       done: false },
    ],
  },
];

export default function GoalsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [filter, setFilter] = useState<'all' | 'family' | 'personal'>('all');

  const filtered = GOALS.filter((g) => filter === 'all' || g.type === filter);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? ['#2D1200', '#0A0A1A'] : ['#FFF7ED', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Family Goals</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          Achieve great things together 🏆
        </Text>

        {/* Achievement strip */}
        <View style={styles.achieveRow}>
          {['🥇', '🏅', '⭐', '🎯', '💪'].map((badge, i) => (
            <View key={i} style={[styles.achieveBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(249,115,22,0.12)' }]}>
              <Text style={{ fontSize: 22 }}>{badge}</Text>
            </View>
          ))}
          <View style={[styles.achieveBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Text variant="caption" color={C.primary} weight="bold">+3</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.filterRow]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {(['all', 'family', 'personal'] as const).map((f) => (
            <Chip key={f} label={f === 'all' ? 'All Goals' : f.charAt(0).toUpperCase() + f.slice(1)}
              selected={filter === f} onPress={() => setFilter(f)} color={C.primary} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 16 }}>
        {filtered.map((goal) => (
          <Card key={goal.id} style={styles.goalCard} shadow="md" onPress={() => {}}>
            <View style={styles.goalTop}>
              <Text style={{ fontSize: 36 }}>{goal.emoji}</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text variant="h4" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{goal.title}</Text>
                  <Badge label={goal.type} variant={goal.type === 'family' ? 'primary' : 'info'} size="sm" />
                </View>
                <Text variant="caption" secondary style={{ marginTop: 3 }}>{goal.target}</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text variant="bodySmall" weight="semibold" color={C.primary}>{goal.progress}% complete</Text>
                <Text variant="caption" secondary>Due {goal.deadline}</Text>
              </View>
              <ProgressBar progress={goal.progress} color={C.primary} height={8} />
            </View>

            {/* Milestones */}
            <View style={styles.milestones}>
              {goal.milestones.map((m, i) => (
                <View key={i} style={styles.milestone}>
                  <View style={[styles.milestoneCheck, {
                    backgroundColor: m.done ? C.primary : 'transparent',
                    borderColor:     m.done ? C.primary : tokens.border,
                  }]}>
                    {m.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>
                  <Text variant="caption" secondary={!m.done} weight={m.done ? 'medium' : 'regular'} style={{ flex: 1 }}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  header:           { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  achieveRow:       { flexDirection: 'row', gap: 8, marginTop: 16 },
  achieveBadge:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  filterRow:        { paddingVertical: 12 },
  goalCard:         { padding: 18, gap: 16 },
  goalTop:          { flexDirection: 'row', alignItems: 'flex-start' },
  progressSection:  { gap: 8 },
  progressHeader:   { flexDirection: 'row', justifyContent: 'space-between' },
  milestones:       { gap: 8 },
  milestone:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneCheck:   { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  fab:              { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
