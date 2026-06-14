import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Card, Badge, ProgressBar, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { ModuleColors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.goals;

// ── Types ──────────────────────────────────────────────────────────────────
interface Milestone { id: string; title: string; completed: boolean; goalId: string; }
interface Goal {
  id: string; title: string; description?: string; emoji?: string;
  type: 'FAMILY' | 'PERSONAL'; status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  progress: number; targetDate?: string;
  milestones: Milestone[];
}

interface GoalForm {
  title: string; description: string; emoji: string;
  type: 'FAMILY' | 'PERSONAL'; targetDate: string;
}

const DEFAULT_GOAL: GoalForm = {
  title: '', description: '', emoji: '🎯', type: 'FAMILY', targetDate: '',
};

const EMOJI_OPTIONS = ['🎯','🏋️','📚','🌱','💰','🏡','✈️','❤️','🎓','🏆','💪','🌟','🎨','🎵','🍎','🤝'];
const MONTH_SHORT   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function GoalsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [filter, setFilter] = useState<'ALL' | 'FAMILY' | 'PERSONAL' | 'COMPLETED'>('ALL');

  // Goal CRUD modal
  const [goalModal,  setGoalModal]  = useState(false);
  const [editGoal,   setEditGoal]   = useState<Goal | null>(null);
  const [goalForm,   setGoalForm]   = useState<GoalForm>(DEFAULT_GOAL);
  const [savingGoal, setSavingGoal] = useState(false);

  // Milestone add
  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, string>>({});
  const [addingMilestone,  setAddingMilestone]  = useState<Record<string, boolean>>({});
  const [togglingMilestone, setTogglingMilestone] = useState<Set<string>>(new Set());

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn:  async () => { const r = await api.get('/goals'); return r.data.data; },
    enabled:  !!user?.familyId,
  });

  const filtered = goals.filter(g => {
    if (filter === 'COMPLETED') return g.status === 'COMPLETED';
    if (filter === 'FAMILY')    return g.type === 'FAMILY'   && g.status !== 'COMPLETED';
    if (filter === 'PERSONAL')  return g.type === 'PERSONAL' && g.status !== 'COMPLETED';
    return g.status !== 'COMPLETED';
  });

  const completedCount = goals.filter(g => g.status === 'COMPLETED').length;

  // ── Goal CRUD ──────────────────────────────────────────────────────────────
  function openCreateGoal() { setEditGoal(null); setGoalForm(DEFAULT_GOAL); setGoalModal(true); }
  function openEditGoal(g: Goal) {
    setEditGoal(g);
    setGoalForm({
      title:       g.title,
      description: g.description ?? '',
      emoji:       g.emoji ?? '🎯',
      type:        g.type,
      targetDate:  g.targetDate ? g.targetDate.slice(0, 10) : '',
    });
    setGoalModal(true);
  }
  function closeGoalModal() { if (savingGoal) return; setGoalModal(false); }

  async function saveGoal() {
    if (!goalForm.title.trim()) { Alert.alert('Required', 'Enter a goal title.'); return; }
    setSavingGoal(true);
    try {
      const body = {
        title:       goalForm.title.trim(),
        description: goalForm.description.trim() || undefined,
        emoji:       goalForm.emoji || undefined,
        type:        goalForm.type,
        targetDate:  goalForm.targetDate || undefined,
      };
      if (editGoal) {
        await api.patch(`/goals/${editGoal.id}`, body);
        toast.success('Goal updated');
      } else {
        await api.post('/goals', body);
        toast.success('Goal created!');
      }
      qc.invalidateQueries({ queryKey: ['goals'] });
      closeGoalModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingGoal(false); }
  }

  function confirmDeleteGoal(g: Goal) {
    Alert.alert('Delete Goal', `Delete "${g.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/goals/${g.id}`);
          qc.invalidateQueries({ queryKey: ['goals'] });
          toast.success('Goal deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  async function markComplete(g: Goal) {
    try {
      await api.patch(`/goals/${g.id}`, { status: g.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED' });
      qc.invalidateQueries({ queryKey: ['goals'] });
    } catch (err) { toast.error(parseApiError(err)); }
  }

  // ── Milestones ─────────────────────────────────────────────────────────────
  async function toggleMilestone(m: Milestone) {
    if (togglingMilestone.has(m.id)) return;
    setTogglingMilestone(prev => new Set(prev).add(m.id));
    try {
      await api.patch(`/goals/milestones/${m.id}/toggle`);
      qc.invalidateQueries({ queryKey: ['goals'] });
    } catch (err) { toast.error(parseApiError(err)); }
    finally { setTogglingMilestone(prev => { const s = new Set(prev); s.delete(m.id); return s; }); }
  }

  async function addMilestone(goalId: string) {
    const title = (milestoneInputs[goalId] ?? '').trim();
    if (!title) return;
    setAddingMilestone(prev => ({ ...prev, [goalId]: true }));
    try {
      await api.post(`/goals/${goalId}/milestones`, { title });
      qc.invalidateQueries({ queryKey: ['goals'] });
      setMilestoneInputs(prev => ({ ...prev, [goalId]: '' }));
    } catch (err) { toast.error(parseApiError(err)); }
    finally { setAddingMilestone(prev => ({ ...prev, [goalId]: false })); }
  }

  // ── No family guard ────────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Text style={{ fontSize: 64 }}>🏆</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to set shared goals.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ GOAL MODAL ══════ */}
      <Modal visible={goalModal} animationType="slide" onRequestClose={closeGoalModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingGoal && { opacity: 0.35 }]} onPress={closeGoalModal} disabled={savingGoal}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editGoal ? 'Edit Goal' : 'New Goal'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveGoal} disabled={savingGoal}>
              {savingGoal ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              {/* Emoji picker */}
              <Text variant="bodySmall" weight="semibold" secondary style={styles.sectionLabel}>EMOJI</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {EMOJI_OPTIONS.map(e => (
                  <TouchableOpacity key={e}
                    onPress={() => setGoalForm(f => ({ ...f, emoji: e }))}
                    style={[styles.emojiBtn, {
                      backgroundColor: goalForm.emoji === e ? C.primary + '22' : tokens.surfaceAlt,
                      borderColor:     goalForm.emoji === e ? C.primary : 'transparent',
                    }]}>
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                value={goalForm.title}
                onChangeText={t => setGoalForm(f => ({ ...f, title: t }))}
                placeholder="Goal title"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
              />

              <TextInput
                value={goalForm.description}
                onChangeText={t => setGoalForm(f => ({ ...f, description: t }))}
                placeholder="Description or target (e.g. Read 20 books)"
                placeholderTextColor={tokens.textTertiary}
                multiline
                style={[styles.descInput, { color: tokens.text, borderBottomColor: tokens.border, borderColor: tokens.border }]}
              />

              {/* Type */}
              <Text variant="bodySmall" weight="semibold" secondary style={styles.sectionLabel}>TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {(['FAMILY', 'PERSONAL'] as const).map(t => {
                  const active = goalForm.type === t;
                  return (
                    <TouchableOpacity key={t}
                      onPress={() => setGoalForm(f => ({ ...f, type: t }))}
                      style={[styles.typeChip, { backgroundColor: active ? C.primary : tokens.surfaceAlt, borderColor: active ? C.primary : tokens.border }]}>
                      <Text variant="body" weight="semibold" style={{ color: active ? '#fff' : tokens.text }}>
                        {t === 'FAMILY' ? '👨‍👩‍👧 Family' : '👤 Personal'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Deadline */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Deadline</Text>
                </View>
                <TextInput
                  value={goalForm.targetDate}
                  onChangeText={t => setGoalForm(f => ({ ...f, targetDate: t }))}
                  placeholder="YYYY-MM-DD (optional)"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.inlineInput, { color: tokens.text }]}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
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
          {completedCount > 0 && Array.from({ length: Math.min(completedCount, 5) }).map((_, i) => (
            <View key={i} style={[styles.achieveBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(249,115,22,0.12)' }]}>
              <Text style={{ fontSize: 22 }}>🏅</Text>
            </View>
          ))}
          {completedCount === 0 && (
            <View style={[styles.achieveBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
              <Text variant="caption" style={{ color: C.primary }} weight="bold">No badges yet</Text>
            </View>
          )}
          {completedCount > 5 && (
            <View style={[styles.achieveBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <Text variant="caption" style={{ color: C.primary }} weight="bold">+{completedCount - 5}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {([
            { key: 'ALL',       label: 'All Goals'  },
            { key: 'FAMILY',    label: 'Family'     },
            { key: 'PERSONAL',  label: 'Personal'   },
            { key: 'COMPLETED', label: `Completed${completedCount > 0 ? ` (${completedCount})` : ''}` },
          ] as const).map(({ key, label }) => (
            <Chip key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} color={C.primary} />
          ))}
        </ScrollView>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={[styles.center, { paddingTop: 60 }]}>
          <Text style={{ fontSize: 56 }}>🎯</Text>
          <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No goals yet</Text>
          <Text variant="body" secondary style={{ marginTop: 8 }}>Tap the + button to set your first goal</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 16 }}>
          {filtered.map(goal => (
            <TouchableOpacity key={goal.id} activeOpacity={0.9}
              onLongPress={() => Alert.alert(goal.title, 'What would you like to do?', [
                { text: goal.status === 'COMPLETED' ? 'Mark Active' : 'Mark Complete', onPress: () => markComplete(goal) },
                { text: 'Edit',   onPress: () => openEditGoal(goal) },
                { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteGoal(goal) },
                { text: 'Cancel', style: 'cancel' },
              ])}>
              <Card style={styles.goalCard} shadow="md">
                {/* Top row */}
                <View style={styles.goalTop}>
                  <Text style={{ fontSize: 36 }}>{goal.emoji ?? '🎯'}</Text>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="h4" weight="bold" numberOfLines={1} style={{ flex: 1, color: tokens.text }}>{goal.title}</Text>
                      <Badge
                        label={goal.status === 'COMPLETED' ? 'Done ✓' : goal.type.toLowerCase()}
                        variant={goal.status === 'COMPLETED' ? 'success' : goal.type === 'FAMILY' ? 'primary' : 'info'}
                        size="sm"
                      />
                    </View>
                    {goal.description && (
                      <Text variant="caption" secondary style={{ marginTop: 3 }}>{goal.description}</Text>
                    )}
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>{goal.progress}% complete</Text>
                    {goal.targetDate && (
                      <Text variant="caption" secondary>Due {fmtDate(goal.targetDate)}</Text>
                    )}
                  </View>
                  <ProgressBar progress={goal.progress} color={goal.status === 'COMPLETED' ? '#10B981' : C.primary} height={8} />
                </View>

                {/* Milestones */}
                {goal.milestones.length > 0 && (
                  <View style={styles.milestones}>
                    {goal.milestones.map(m => {
                      const busy = togglingMilestone.has(m.id);
                      return (
                        <TouchableOpacity key={m.id} style={styles.milestone}
                          onPress={() => toggleMilestone(m)} activeOpacity={0.7}>
                          <View style={[styles.milestoneCheck, {
                            backgroundColor: m.completed ? C.primary : 'transparent',
                            borderColor:     m.completed ? C.primary : tokens.border,
                          }]}>
                            {busy
                              ? <ActivityIndicator size="small" color={m.completed ? '#fff' : tokens.textTertiary} />
                              : m.completed && <Ionicons name="checkmark" size={10} color="#fff" />
                            }
                          </View>
                          <Text variant="caption"
                            secondary={!m.completed}
                            weight={m.completed ? 'medium' : 'regular'}
                            style={{ flex: 1, textDecorationLine: m.completed ? 'line-through' : 'none', color: tokens.text }}>
                            {m.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Add milestone row */}
                <View style={[styles.addMilestoneRow, { borderTopColor: tokens.border }]}>
                  <TextInput
                    value={milestoneInputs[goal.id] ?? ''}
                    onChangeText={t => setMilestoneInputs(p => ({ ...p, [goal.id]: t }))}
                    placeholder="Add milestone…"
                    placeholderTextColor={tokens.textTertiary}
                    style={[styles.milestoneInput, { color: tokens.text }]}
                    onSubmitEditing={() => addMilestone(goal.id)}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={() => addMilestone(goal.id)}
                    disabled={addingMilestone[goal.id] || !(milestoneInputs[goal.id] ?? '').trim()}
                    style={{ padding: 6 }}>
                    {addingMilestone[goal.id]
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : <Ionicons name="add-circle" size={22} color={(milestoneInputs[goal.id] ?? '').trim() ? C.primary : tokens.border} />
                    }
                  </TouchableOpacity>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]} onPress={openCreateGoal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:            { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:          { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  achieveRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  achieveBadge:    { minWidth: 44, height: 44, borderRadius: 22, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  filterRow:       { paddingVertical: 12 },
  goalCard:        { padding: 18, gap: 16 },
  goalTop:         { flexDirection: 'row', alignItems: 'flex-start' },
  progressSection: { gap: 8 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between' },
  milestones:      { gap: 8 },
  milestone:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneCheck:  { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  addMilestoneRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  milestoneInput:  { flex: 1, fontSize: 13, paddingVertical: 4, paddingHorizontal: 2 },
  fab:             { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  // Modal
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:     { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:     { padding: 20, paddingBottom: 60 },
  sectionLabel: { marginBottom: 8 },
  emojiBtn:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  titleInput:   { fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 16 },
  descInput:    { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  typeChip:     { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.xl, borderWidth: 1.5, alignItems: 'center' },
  formRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:      { flexDirection: 'row', alignItems: 'center' },
  rowLabel:     { marginLeft: 12, fontSize: 15 },
  inlineInput:  { flex: 1, textAlign: 'right', fontSize: 15 },
});
