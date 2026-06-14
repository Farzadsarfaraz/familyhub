import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isToday, addMonths, subMonths, getDay, isBefore, startOfDay,
} from 'date-fns';
import { Text, Card, Avatar, ProgressBar, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const { width: SW } = Dimensions.get('window');
const C    = ModuleColors.tasks;
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ── Constants ─────────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'LOW',    label: 'Low',    color: Colors.neutral[400] },
  { value: 'MEDIUM', label: 'Medium', color: Colors.primary[500] },
  { value: 'HIGH',   label: 'High',   color: Colors.warning[500] },
  { value: 'URGENT', label: 'Urgent', color: Colors.error[500] },
] as const;

const RECURRENCE_TYPES = [
  { value: 'DAILY',   label: 'Daily'   },
  { value: 'WEEKLY',  label: 'Weekly'  },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY',  label: 'Yearly'  },
] as const;

type Priority   = typeof PRIORITIES[number]['value'];
type Recurrence = typeof RECURRENCE_TYPES[number]['value'];
type FilterType = 'all' | 'pending' | 'completed' | 'mine';

function priorityColor(p: string) {
  return PRIORITIES.find(x => x.value === p)?.color ?? Colors.neutral[400];
}
function isOverdue(task: ApiTask): boolean {
  return task.status === 'PENDING' && !!task.dueDate &&
    isBefore(new Date(task.dueDate), startOfDay(new Date()));
}

// ── Types ─────────────────────────────────────────────────────────────────
interface ApiTask {
  id: string; title: string; description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: Priority; points: number;
  dueDate?: string; completedAt?: string;
  recurring: boolean; recurrence?: string;
  assignedTo?: string;
  assignee?: { id: string; name: string; avatar?: string };
  creator:    { id: string; name: string; avatar?: string };
  createdAt: string;
}
interface LeaderEntry { id: string; name: string; avatar?: string; points: number; completed: number; }
interface Member      { id: string; name: string; avatar?: string; }

interface TaskForm {
  title: string; description: string;
  priority: Priority; points: string;
  hasDueDate: boolean; dueDate: Date;
  assignedTo: string;
  recurring: boolean; recurrence: Recurrence;
}
const DEFAULT_FORM: TaskForm = {
  title: '', description: '',
  priority: 'MEDIUM', points: '5',
  hasDueDate: false, dueDate: new Date(),
  assignedTo: '',
  recurring: false, recurrence: 'WEEKLY',
};

// ── Screen ────────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const { tokens, isDark } = useTheme();
  const user        = useAuthStore(s => s.user);
  const qc          = useQueryClient();
  const hasFamilyId = !!user?.familyId;

  const [filter,   setFilter]   = useState<FilterType>('all');
  const [modal,    setModal]    = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState<TaskForm>(DEFAULT_FORM);
  const [toggling, setToggling] = useState<string | null>(null);

  // Date picker overlay (inside form modal)
  const [datePicker,  setDatePicker]  = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: tasks = [], isLoading: loadingTasks } = useQuery<ApiTask[]>({
    queryKey: ['tasks'],
    queryFn:  async () => { const r = await api.get('/tasks'); return r.data.data; },
    enabled:  hasFamilyId,
  });

  const { data: leaderboard = [] } = useQuery<LeaderEntry[]>({
    queryKey: ['tasks-leaderboard'],
    queryFn:  async () => { const r = await api.get('/tasks/leaderboard'); return r.data.data; },
    enabled:  hasFamilyId,
  });

  const { data: familyData } = useQuery({
    queryKey: ['family-me'],
    queryFn:  async () => { const r = await api.get('/families/me'); return r.data.data; },
    enabled:  hasFamilyId,
  });
  const members: Member[] = familyData?.members ?? [];

  // ── Derived ───────────────────────────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (filter === 'pending')   return t.status !== 'COMPLETED';
    if (filter === 'completed') return t.status === 'COMPLETED';
    if (filter === 'mine')      return t.assignee?.id === user?.id || t.assignedTo === user?.id;
    return true;
  });
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const progress  = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const top3      = leaderboard.slice(0, 3);

  // ── Toggle ────────────────────────────────────────────────────────────
  async function toggleTask(id: string) {
    if (toggling) return;
    setToggling(id);
    try {
      await api.patch(`/tasks/${id}/toggle`);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-leaderboard'] });
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setToggling(null);
    }
  }

  // ── Open / close modal ────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm({ ...DEFAULT_FORM, dueDate: new Date() });
    setDatePicker(false);
    setModal(true);
  }
  function openEdit(task: ApiTask) {
    setEditId(task.id);
    setForm({
      title:       task.title,
      description: task.description ?? '',
      priority:    task.priority,
      points:      String(task.points),
      hasDueDate:  !!task.dueDate,
      dueDate:     task.dueDate ? new Date(task.dueDate) : new Date(),
      assignedTo:  task.assignedTo ?? '',
      recurring:   task.recurring,
      recurrence:  (task.recurrence as Recurrence) ?? 'WEEKLY',
    });
    setDatePicker(false);
    setModal(true);
  }
  function closeModal() {
    if (saving) return;
    setModal(false);
    setEditId(null);
    setDatePicker(false);
  }

  // ── Save ──────────────────────────────────────────────────────────────
  async function saveTask() {
    setDatePicker(false);
    if (!form.title.trim()) { Alert.alert('Required', 'Please enter a task title.'); return; }
    const pts = parseInt(form.points, 10);
    if (!pts || pts < 1) { Alert.alert('Invalid', 'Points must be at least 1.'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        priority:    form.priority,
        points:      pts,
        dueDate:     form.hasDueDate ? form.dueDate.toISOString() : undefined,
        assignedTo:  form.assignedTo || undefined,
        recurring:   form.recurring,
        recurrence:  form.recurring ? form.recurrence : 'NONE',
      };
      if (editId) {
        await api.patch(`/tasks/${editId}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-leaderboard'] });
      setModal(false);
      setEditId(null);
      toast.success(editId ? 'Task updated' : 'Task created');
    } catch (err) {
      Alert.alert('Could not save task', parseApiError(err), [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────
  function confirmDelete(task: ApiTask) {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/tasks/${task.id}`);
            qc.invalidateQueries({ queryKey: ['tasks'] });
            qc.invalidateQueries({ queryKey: ['tasks-leaderboard'] });
            toast.success('Task deleted');
          } catch (err) { toast.error(parseApiError(err)); }
        },
      },
    ]);
  }

  function handleTaskLongPress(task: ApiTask) {
    Alert.alert(task.title, '', [
      { text: 'Edit',   onPress: () => openEdit(task) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(task) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Date picker overlay (called as function, not component) ───────────
  function DatePickerContent() {
    const pStart = startOfMonth(pickerMonth);
    const pEnd   = endOfMonth(pickerMonth);
    const pDays  = eachDayOfInterval({ start: pStart, end: pEnd });
    const pGap   = getDay(pStart);
    const W      = (SW - 64) / 7;
    return (
      <>
        <View style={[styles.sheetHandle, { backgroundColor: tokens.border }]} />
        <Text variant="h4" weight="bold" style={[styles.sheetTitle, { color: tokens.text }]}>Pick a Date</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setPickerMonth(m => subMonths(m, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={tokens.text} />
          </TouchableOpacity>
          <Text variant="body" weight="bold" style={{ color: tokens.text }}>{format(pickerMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setPickerMonth(m => addMonths(m, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={tokens.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 }}>
          {DAYS.map(d => (
            <View key={d} style={{ width: W, alignItems: 'center' }}>
              <Text variant="caption" weight="semibold" style={{ color: tokens.textSecondary }}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 }}>
          {Array.from({ length: pGap }).map((_, i) => (
            <View key={`g${i}`} style={{ width: W, height: W }} />
          ))}
          {pDays.map(day => {
            const sel   = isSameDay(day, form.dueDate);
            const today = isToday(day);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={{ width: W, height: W, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  setForm(f => ({ ...f, dueDate: day, hasDueDate: true }));
                  setDatePicker(false);
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dateCell,
                  sel   && { backgroundColor: C.primary },
                  today && !sel && { borderWidth: 2, borderColor: C.primary },
                ]}>
                  <Text variant="bodySmall" weight={sel || today ? 'bold' : 'regular'}
                    style={{ color: sel ? '#fff' : today ? C.primary : tokens.text }}>
                    {format(day, 'd')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }

  // ── Task card ─────────────────────────────────────────────────────────
  function TaskCard({ task }: { task: ApiTask }) {
    const done    = task.status === 'COMPLETED';
    const overdue = isOverdue(task);
    const spinning = toggling === task.id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openEdit(task)}
        onLongPress={() => handleTaskLongPress(task)}
        delayLongPress={400}
      >
        <Card style={styles.taskCard} shadow="sm">
          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => toggleTask(task.id)}
            style={[styles.checkbox, {
              borderColor:     done ? Colors.success[500] : tokens.border,
              backgroundColor: done ? Colors.success[500] : 'transparent',
            }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {spinning
              ? <ActivityIndicator size="small" color={done ? '#fff' : tokens.textTertiary} />
              : done && <Ionicons name="checkmark" size={14} color="#fff" />
            }
          </TouchableOpacity>

          {/* Body */}
          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                variant="body" weight="semibold"
                style={[{ flex: 1 }, done && { textDecorationLine: 'line-through' }]}
                secondary={done}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              {task.recurring && (
                <Ionicons name="repeat-outline" size={14} color={tokens.textTertiary} />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {task.assignee && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Avatar name={task.assignee.name} uri={task.assignee.avatar} size="xs" />
                  <Text variant="caption" secondary>{task.assignee.name}</Text>
                </View>
              )}
              {task.dueDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="time-outline" size={12}
                    color={overdue ? Colors.error[500] : tokens.textTertiary} />
                  <Text variant="caption"
                    style={{ color: overdue ? Colors.error[500] : tokens.textSecondary }}>
                    {isToday(new Date(task.dueDate)) ? 'Today'
                      : format(new Date(task.dueDate), 'MMM d')}
                    {overdue ? ' · overdue' : ''}
                  </Text>
                </View>
              )}
              <Text variant="caption" weight="semibold" style={{ marginLeft: 'auto', color: C.primary }}>
                +{task.points}⭐
              </Text>
            </View>
          </View>

          {/* Priority bar */}
          <View style={[styles.priorityBar, { backgroundColor: priorityColor(task.priority) }]} />
        </Card>
      </TouchableOpacity>
    );
  }

  // ── No family guard ───────────────────────────────────────────────────
  if (!hasFamilyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Ionicons name="checkbox-outline" size={64} color={tokens.textTertiary} />
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to manage tasks together.
        </Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ TASK FORM MODAL ══════ */}
      <Modal visible={modal} animationType="slide" onRequestClose={closeModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>

          {/* Modal header */}
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8,
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity
              style={[styles.modalBtn, saving && { opacity: 0.35 }]}
              onPress={closeModal}
              disabled={saving}
            >
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
              {editId ? 'Edit Task' : 'New Task'}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveTask} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.formBody}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <TextInput
                value={form.title}
                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder="Task title"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
              />

              {/* Description */}
              <TextInput
                value={form.description}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                placeholder="Description (optional)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.descInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                multiline
              />

              {/* Priority */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>PRIORITY</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {PRIORITIES.map(p => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.priorityChip, {
                        backgroundColor: form.priority === p.value ? p.color + '22' : tokens.surfaceAlt,
                        borderColor:     form.priority === p.value ? p.color : tokens.border,
                      }]}
                      onPress={() => setForm(f => ({ ...f, priority: p.value }))}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                      <Text variant="bodySmall"
                        weight={form.priority === p.value ? 'bold' : 'regular'}
                        style={{ color: form.priority === p.value ? p.color : tokens.textSecondary }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Points */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="star-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Points</Text>
                </View>
                <TextInput
                  value={form.points}
                  onChangeText={t => setForm(f => ({ ...f, points: t.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  style={[styles.pointsInput, {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surfaceAlt,
                  }]}
                  maxLength={3}
                />
              </View>

              {/* Due Date */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Due Date</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {form.hasDueDate && (
                    <TouchableOpacity onPress={() => { setPickerMonth(form.dueDate); setDatePicker(true); }}>
                      <Text variant="body" weight="semibold" style={{ color: C.primary }}>
                        {isToday(form.dueDate) ? 'Today' : format(form.dueDate, 'MMM d, yyyy')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      if (form.hasDueDate) {
                        setForm(f => ({ ...f, hasDueDate: false }));
                        setDatePicker(false);
                      } else {
                        setPickerMonth(new Date());
                        setForm(f => ({ ...f, dueDate: new Date() }));
                        setDatePicker(true);
                      }
                    }}
                    style={[styles.dueDateBtn, {
                      backgroundColor: form.hasDueDate ? Colors.error[500] + '15' : C.primary + '15',
                      borderColor:     form.hasDueDate ? Colors.error[500] : C.primary,
                    }]}
                  >
                    <Ionicons
                      name={form.hasDueDate ? 'close-circle-outline' : 'add-circle-outline'}
                      size={16}
                      color={form.hasDueDate ? Colors.error[500] : C.primary}
                    />
                    <Text variant="caption" weight="semibold" style={{
                      color: form.hasDueDate ? Colors.error[500] : C.primary, marginLeft: 4,
                    }}>
                      {form.hasDueDate ? 'Remove' : 'Set date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Assignee */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>ASSIGN TO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                  {/* "Anyone" option */}
                  <TouchableOpacity
                    style={[styles.assigneeItem, {
                      borderColor: form.assignedTo === '' ? C.primary : tokens.border,
                      backgroundColor: form.assignedTo === '' ? C.primary + '15' : tokens.surfaceAlt,
                    }]}
                    onPress={() => setForm(f => ({ ...f, assignedTo: '' }))}
                  >
                    <View style={[styles.anyoneCircle, {
                      backgroundColor: form.assignedTo === '' ? C.primary : tokens.border,
                    }]}>
                      <Ionicons name="people-outline" size={18}
                        color={form.assignedTo === '' ? '#fff' : tokens.textTertiary} />
                    </View>
                    <Text variant="caption"
                      style={{ color: form.assignedTo === '' ? C.primary : tokens.textSecondary }}>
                      Anyone
                    </Text>
                  </TouchableOpacity>

                  {members.map(m => {
                    const sel = form.assignedTo === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.assigneeItem, {
                          borderColor:     sel ? C.primary : tokens.border,
                          backgroundColor: sel ? C.primary + '15' : tokens.surfaceAlt,
                        }]}
                        onPress={() => setForm(f => ({ ...f, assignedTo: m.id }))}
                      >
                        <View style={{ position: 'relative' }}>
                          <Avatar name={m.name} uri={m.avatar} size="md" />
                          {sel && (
                            <View style={styles.selBadge}>
                              <Ionicons name="checkmark-circle" size={18} color={C.primary} />
                            </View>
                          )}
                        </View>
                        <Text variant="caption" numberOfLines={1}
                          style={{ color: sel ? C.primary : tokens.textSecondary }}>
                          {m.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Recurring */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="repeat-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Recurring</Text>
                </View>
                <Switch
                  value={form.recurring}
                  onValueChange={v => setForm(f => ({ ...f, recurring: v }))}
                  trackColor={{ true: C.primary }}
                  thumbColor="#fff"
                />
              </View>

              {form.recurring && (
                <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                  <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>REPEAT</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {RECURRENCE_TYPES.map(r => (
                      <TouchableOpacity
                        key={r.value}
                        style={[styles.recurrenceChip, {
                          backgroundColor: form.recurrence === r.value ? C.primary + '22' : tokens.surfaceAlt,
                          borderColor:     form.recurrence === r.value ? C.primary : tokens.border,
                        }]}
                        onPress={() => setForm(f => ({ ...f, recurrence: r.value }))}
                      >
                        <Text variant="bodySmall"
                          weight={form.recurrence === r.value ? 'bold' : 'regular'}
                          style={{ color: form.recurrence === r.value ? C.primary : tokens.textSecondary }}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Date picker overlay — inside modal, keyboard-aware */}
          {datePicker && (
            <KeyboardAvoidingView
              style={[StyleSheet.absoluteFillObject, styles.pickerOverlay]}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDatePicker(false)} />
              <View style={[styles.pickerSheet, { backgroundColor: tokens.surface }]}>
                {DatePickerContent()}
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>

        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>
          Tasks & Chores
        </Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          {completed}/{tasks.length} completed
        </Text>
        <ProgressBar progress={progress} color={C.primary} height={6} style={{ marginTop: 12 }} />

        {/* Leaderboard top 3 */}
        {top3.length > 0 && (
          <View style={styles.leaderboard}>
            {top3.map((m, i) => (
              <View key={m.id} style={styles.leaderItem}>
                <Text style={{ fontSize: 20 }}>{['🥇', '🥈', '🥉'][i]}</Text>
                <Avatar name={m.name} uri={m.avatar} size="sm" />
                <Text variant="caption" weight="semibold" numberOfLines={1}
                  style={{ color: isDark ? '#fff' : tokens.text, marginTop: 4 }}>
                  {m.name.split(' ')[0]}
                </Text>
                <Text variant="caption" weight="bold" style={{ color: C.primary }}>
                  {m.points}⭐
                </Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* ══════ FILTERS ══════ */}
      <View style={[styles.filtersRow, { backgroundColor: tokens.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {(['all', 'pending', 'completed', 'mine'] as FilterType[]).map(f => (
            <Chip
              key={f}
              label={f === 'all' ? 'All' : f === 'mine' ? 'My Tasks' : f === 'pending' ? 'Pending' : 'Completed'}
              selected={filter === f}
              onPress={() => setFilter(f)}
              color={C.primary}
            />
          ))}
        </ScrollView>
      </View>

      {/* ══════ TASK LIST ══════ */}
      {loadingTasks ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="body" secondary style={{ marginTop: 12 }}>Loading tasks…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 110, gap: 10 }}>
          {filtered.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
              <Text style={{ fontSize: 36 }}>✅</Text>
              <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 12 }}>
                {filter === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
              </Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 4, textAlign: 'center' }}>
                {filter === 'all' || filter === 'pending'
                  ? 'Tap + to add your first task'
                  : filter === 'mine'
                  ? 'No tasks assigned to you yet'
                  : 'Complete some tasks first!'}
              </Text>
            </View>
          ) : (
            filtered.map(task => <TaskCard key={task.id} task={task} />)
          )}
        </ScrollView>
      )}

      {/* ══════ FAB ══════ */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: C.primary, bottom: 80 + insets.bottom }]}
        onPress={openCreate}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:      { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  backBtn:     { marginBottom: 12 },
  leaderboard: { flexDirection: 'row', gap: 12, marginTop: 20, justifyContent: 'center' },
  leaderItem:  { flex: 1, alignItems: 'center', gap: 2, maxWidth: 80 },

  // Filters
  filtersRow: { paddingVertical: 12 },

  // List
  emptyBox: {
    borderRadius: BorderRadius.xl, padding: 36, alignItems: 'center',
    borderWidth: 1, borderStyle: 'dashed', marginTop: 20,
  },

  // Task card
  taskCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, overflow: 'visible' },
  checkbox:    { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  priorityBar: { width: 4, position: 'absolute', right: 0, top: 0, bottom: 0, borderRadius: 4 },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10,
  },

  // Form modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:  { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:  { padding: 20, paddingBottom: 60 },
  titleInput: { fontSize: 22, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  descInput:  { fontSize: 15, paddingVertical: 12, borderBottomWidth: 1, marginBottom: 4, minHeight: 60, textAlignVertical: 'top' },
  formRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:   { flexDirection: 'row', alignItems: 'center' },
  rowLabel:  { marginLeft: 12, fontSize: 15 },
  section:   { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel: { color: '#888', marginBottom: 10, fontSize: 11, letterSpacing: 0.8 },

  // Priority
  priorityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  priorityDot:  { width: 8, height: 8, borderRadius: 4 },

  // Points
  pointsInput: { width: 72, textAlign: 'center', fontSize: 18, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingVertical: 8 },

  // Due date
  dueDateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },

  // Assignee
  assigneeItem:  { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: BorderRadius.xl, borderWidth: 1.5, gap: 4, minWidth: 64 },
  anyoneCircle:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  selBadge:      { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 9 },

  // Recurrence
  recurrenceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },

  // Date picker overlay
  pickerOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100 },
  pickerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 20,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle:  { paddingHorizontal: 20, paddingBottom: 8 },
  monthNav:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  navBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dateCell:    { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
