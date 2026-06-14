import React, { useState, useCallback, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, addMonths, subMonths, getDay,
  addDays, subDays, isBefore, startOfDay,
} from 'date-fns';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';
import { scheduleEventNotifications, cancelEventNotifications } from '@/lib/notifications';

const { width: SW } = Dimensions.get('window');
const GRID_CELL = (SW - 48) / 7;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Categories ────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'PERSONAL',    label: 'Personal',    emoji: '👤', color: '#8B5CF6' },
  { value: 'FAMILY',      label: 'Family',      emoji: '👨‍👩‍👧', color: '#3B82F6' },
  { value: 'BIRTHDAY',    label: 'Birthday',    emoji: '🎂', color: '#EC4899' },
  { value: 'APPOINTMENT', label: 'Appointment', emoji: '🏥', color: '#F59E0B' },
  { value: 'SCHOOL',      label: 'School',      emoji: '📚', color: '#10B981' },
  { value: 'TRAVEL',      label: 'Travel',      emoji: '✈️', color: '#06B6D4' },
  { value: 'HOLIDAY',     label: 'Holiday',     emoji: '🎉', color: '#EF4444' },
];

// ── Reminder presets ──────────────────────────────────────────────────────
const REMINDER_PRESETS = [
  { label: 'At event time', minutes: 0 },
  { label: '5 minutes',     minutes: 5 },
  { label: '10 minutes',    minutes: 10 },
  { label: '15 minutes',    minutes: 15 },
  { label: '30 minutes',    minutes: 30 },
  { label: '1 hour',        minutes: 60 },
  { label: '2 hours',       minutes: 120 },
  { label: '1 day',         minutes: 1440 },
  { label: '2 days',        minutes: 2880 },
  { label: '1 week',        minutes: 10080 },
];

const REMINDER_UNITS = [
  { label: 'minutes', value: 'minutes' as const, factor: 1 },
  { label: 'hours',   value: 'hours'   as const, factor: 60 },
  { label: 'days',    value: 'days'    as const, factor: 1440 },
  { label: 'weeks',   value: 'weeks'   as const, factor: 10080 },
  { label: 'months',  value: 'months'  as const, factor: 43200 },
];

// 30-min time slots
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const totalMin = i * 30;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return {
    label: `${h12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`,
    value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────
function catColor(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? Colors.primary[500];
}
function catInfo(cat: string, custom?: string | null) {
  if (custom) return { label: custom, emoji: '🏷️', color: Colors.primary[500] };
  return CATEGORIES.find(c => c.value === cat) ?? { label: cat, emoji: '📅', color: Colors.primary[500] };
}
function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function buildDT(date: Date, time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const d = new Date(date); d.setHours(h, m, 0, 0); return d.toISOString();
}
function fmtReminder(min: number): string {
  if (min === 0) return 'At event time';
  const p = REMINDER_PRESETS.find(r => r.minutes === min);
  if (p) return p.label;
  if (min % 10080 === 0) return `${min / 10080} week${min / 10080 > 1 ? 's' : ''}`;
  if (min % 1440 === 0)  return `${min / 1440} day${min / 1440 > 1 ? 's' : ''}`;
  if (min % 60 === 0)    return `${min / 60} hour${min / 60 > 1 ? 's' : ''}`;
  return `${min} minutes`;
}

// ── Types ─────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string; title: string; description?: string;
  startDate: string; endDate?: string; allDay: boolean;
  category: string; customCategory?: string; color?: string; location?: string;
  reminders: number[];
  creator: { id: string; name: string; avatar?: string };
}
interface EventForm {
  title: string; description: string; allDay: boolean;
  date: Date; startTime: string; endTime: string;
  category: string; customCategoryName: string;
  location: string; reminders: number[];
}
type PickerType = 'none' | 'date' | 'time-start' | 'time-end' | 'category' | 'reminder';
type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

const DEFAULT_FORM = (date: Date): EventForm => ({
  title: '', description: '', allDay: false,
  date, startTime: '09:00', endTime: '10:00',
  category: 'FAMILY', customCategoryName: '',
  location: '', reminders: [30],
});

// ── Screen ────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const insets      = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user        = useAuthStore(s => s.user);
  const qc          = useQueryClient();
  const hasFamilyId = !!user?.familyId;

  // Main calendar state
  const [current,  setCurrent]  = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  // Form modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState<EventForm>(DEFAULT_FORM(new Date()));
  const [customCatVisible, setCustomCatVisible] = useState(false);

  // Which picker is open inside the form modal (overlay, not nested Modal)
  const [picker,            setPicker]            = useState<PickerType>('none');
  const [pickerMonth,       setPickerMonth]       = useState(new Date());
  const [editReminderIdx,   setEditReminderIdx]   = useState(-1);
  const [showCustomRem,     setShowCustomRem]     = useState(false);
  const [customRemVal,      setCustomRemVal]      = useState('30');
  const [customRemUnit,     setCustomRemUnit]     = useState<ReminderUnit>('minutes');

  // ── Fetch events ──────────────────────────────────────────────────────
  const monthKey   = format(current, 'yyyy-MM');
  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay   = getDay(monthStart);

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events', monthKey],
    queryFn: async () => {
      const from = format(subDays(monthStart, 7), "yyyy-MM-dd'T'00:00:00");
      const to   = format(addDays(monthEnd,   7), "yyyy-MM-dd'T'23:59:59");
      const res  = await api.get(`/calendar/events?from=${from}&to=${to}`);
      return res.data.data as CalEvent[];
    },
    enabled: hasFamilyId,
  });

  const events = useMemo(() => data ?? [], [data]);
  const eventsForDay = useCallback(
    (d: Date) => events.filter(e => isSameDay(new Date(e.startDate), d)),
    [events],
  );
  const selectedEvents = eventsForDay(selected);
  const upcoming = events
    .filter(e => !isBefore(new Date(e.startDate), startOfDay(new Date())))
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))
    .slice(0, 5);

  // ── Form open/close ───────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM(selected));
    setCustomCatVisible(false);
    setPicker('none');
    setModalVisible(true);
  }
  function openEdit(ev: CalEvent) {
    setEditingId(ev.id);
    const d  = new Date(ev.startDate);
    const ed = ev.endDate ? new Date(ev.endDate) : d;
    setForm({
      title: ev.title, description: ev.description ?? '',
      allDay: ev.allDay, date: d,
      startTime: `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`,
      endTime:   `${ed.getHours().toString().padStart(2,'0')}:${ed.getMinutes().toString().padStart(2,'0')}`,
      category: ev.category, customCategoryName: ev.customCategory ?? '',
      location: ev.location ?? '', reminders: ev.reminders ?? [],
    });
    setCustomCatVisible(!!ev.customCategory);
    setPicker('none');
    setModalVisible(true);
  }
  function closeModal() {
    if (saving) return; // block dismiss while a save is in flight
    setModalVisible(false);
    setEditingId(null);
    setPicker('none');
    setSaving(false);
    setCustomCatVisible(false);
  }

  // ── Picker helpers ────────────────────────────────────────────────────
  function closePicker() { setPicker('none'); }

  function openDatePicker() {
    setPickerMonth(form.date);
    setPicker('date');
  }
  function openTimePicker(which: 'start' | 'end') {
    setPicker(which === 'start' ? 'time-start' : 'time-end');
  }
  function openCatPicker() {
    setCustomCatVisible(!!form.customCategoryName);
    setPicker('category');
  }
  function openReminderPicker(idx: number) {
    setEditReminderIdx(idx);
    setShowCustomRem(false);
    setCustomRemVal('30');
    setCustomRemUnit('minutes');
    setPicker('reminder');
  }

  // Category selection
  function selectCategory(val: string) {
    if (val === '__custom__') {
      setCustomCatVisible(true);
    } else {
      setCustomCatVisible(false);
      setForm(f => ({ ...f, category: val, customCategoryName: '' }));
      closePicker();
    }
  }

  // Reminder selection
  function applyReminder(minutes: number) {
    if (editReminderIdx === -1) {
      setForm(f => ({ ...f, reminders: [...f.reminders, minutes] }));
    } else {
      setForm(f => {
        const r = [...f.reminders];
        r[editReminderIdx] = minutes;
        return { ...f, reminders: r };
      });
    }
    closePicker();
  }
  function confirmCustomReminder() {
    const n = parseInt(customRemVal, 10);
    if (!n || n <= 0) { toast.error('Enter a valid number'); return; }
    const factor = REMINDER_UNITS.find(u => u.value === customRemUnit)!.factor;
    applyReminder(n * factor);
  }
  function removeReminder(idx: number) {
    setForm(f => ({ ...f, reminders: f.reminders.filter((_, i) => i !== idx) }));
  }

  // ── Save / Delete ─────────────────────────────────────────────────────
  async function saveEvent() {
    setPicker('none'); // close any open picker overlay
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }
    setSaving(true);
    try {
      const isCustom = customCatVisible && form.customCategoryName.trim();
      const payload: any = {
        title:          form.title.trim(),
        description:    form.description.trim() || undefined,
        allDay:         form.allDay,
        category:       form.category,
        customCategory: isCustom ? form.customCategoryName.trim() : undefined,
        color:          isCustom ? Colors.primary[500] : catColor(form.category),
        location:       form.location.trim() || undefined,
        reminders:      form.reminders,
        startDate: form.allDay
          ? (() => { const d = new Date(form.date); d.setHours(0,0,0,0); return d.toISOString(); })()
          : buildDT(form.date, form.startTime),
        endDate: form.allDay ? undefined : buildDT(form.date, form.endTime),
      };
      let savedId: string;
      if (editingId) {
        const res = await api.patch(`/calendar/events/${editingId}`, payload);
        savedId = (res.data?.data ?? res.data)?.id ?? editingId;
      } else {
        const res = await api.post('/calendar/events', payload);
        savedId = (res.data?.data ?? res.data)?.id;
      }
      qc.invalidateQueries({ queryKey: ['calendar-events'] });

      // Schedule local push notifications for each reminder
      if (savedId && !form.allDay && form.reminders.length > 0) {
        scheduleEventNotifications(
          savedId,
          form.title.trim(),
          new Date(payload.startDate),
          form.reminders,
        ).catch(() => {}); // non-blocking, don't fail save if notifications fail
      }

      // Only close + show success AFTER the request completes — modal is still open at this point
      setModalVisible(false);
      setEditingId(null);
      setCustomCatVisible(false);
      toast.success(editingId ? 'Event updated' : 'Event created');
    } catch (err) {
      // Show error as a blocking Alert so it appears INSIDE the modal context, not after leaving
      Alert.alert('Could not save event', parseApiError(err), [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(ev: CalEvent) {
    Alert.alert('Delete Event', `Delete "${ev.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/calendar/events/${ev.id}`);
          cancelEventNotifications(ev.id).catch(() => {});
          qc.invalidateQueries({ queryKey: ['calendar-events'] });
          toast.success('Event deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }
  function handleEventPress(ev: CalEvent) {
    Alert.alert(ev.title,
      `${format(new Date(ev.startDate), 'EEE, MMM d')} • ${ev.allDay ? 'All day' : format(new Date(ev.startDate), 'h:mm a')}`
      + (ev.location ? `\n📍 ${ev.location}` : '')
      + (ev.reminders?.length ? `\n🔔 ${ev.reminders.map(fmtReminder).join(', ')}` : ''),
      [
        { text: 'Edit',   onPress: () => openEdit(ev) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(ev) },
        { text: 'Close',  style: 'cancel' },
      ],
    );
  }

  // ── Picker overlay content ────────────────────────────────────────────
  function DatePickerSheet() {
    const pStart = startOfMonth(pickerMonth);
    const pEnd   = endOfMonth(pickerMonth);
    const pDays  = eachDayOfInterval({ start: pStart, end: pEnd });
    const pGap   = getDay(pStart);
    const W      = (SW - 64) / 7;
    return (
      <>
        <View style={[styles.sheetHandle, { backgroundColor: tokens.border }]} />
        <Text variant="h4" weight="bold" style={[styles.sheetTitle, { color: tokens.text }]}>Pick a Date</Text>
        {/* Month nav */}
        <View style={styles.pickerMonthNav}>
          <TouchableOpacity onPress={() => setPickerMonth(m => subMonths(m, 1))} style={styles.pickerNavBtn}>
            <Ionicons name="chevron-back" size={22} color={tokens.text} />
          </TouchableOpacity>
          <Text variant="body" weight="bold" style={{ color: tokens.text }}>
            {format(pickerMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setPickerMonth(m => addMonths(m, 1))} style={styles.pickerNavBtn}>
            <Ionicons name="chevron-forward" size={22} color={tokens.text} />
          </TouchableOpacity>
        </View>
        {/* Day headers */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 }}>
          {DAYS.map(d => (
            <View key={d} style={{ width: W, alignItems: 'center' }}>
              <Text variant="caption" weight="semibold" style={{ color: tokens.textSecondary }}>{d}</Text>
            </View>
          ))}
        </View>
        {/* Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 8 }}>
          {Array.from({ length: pGap }).map((_, i) => (
            <View key={`g-${i}`} style={{ width: W, height: W }} />
          ))}
          {pDays.map(day => {
            const sel   = isSameDay(day, form.date);
            const today = isToday(day);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={{ width: W, height: W, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => { setForm(f => ({ ...f, date: day })); closePicker(); }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dateCell,
                  sel   && { backgroundColor: Colors.primary[500] },
                  today && !sel && { borderWidth: 2, borderColor: Colors.primary[500] },
                ]}>
                  <Text
                    variant="bodySmall"
                    weight={sel || today ? 'bold' : 'regular'}
                    style={{ color: sel ? '#fff' : today ? Colors.primary[500] : tokens.text }}
                  >
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

  function TimePickerSheet() {
    const isStart = picker === 'time-start';
    const current = isStart ? form.startTime : form.endTime;
    return (
      <>
        <View style={[styles.sheetHandle, { backgroundColor: tokens.border }]} />
        <Text variant="h4" weight="bold" style={[styles.sheetTitle, { color: tokens.text }]}>
          {isStart ? 'Start Time' : 'End Time'}
        </Text>
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {TIME_SLOTS.map(slot => {
            const active = slot.value === current;
            return (
              <TouchableOpacity
                key={slot.value}
                style={[styles.sheetRow, active && { backgroundColor: Colors.primary[500] + '18' }]}
                onPress={() => {
                  setForm(f => ({
                    ...f,
                    [isStart ? 'startTime' : 'endTime']: slot.value,
                  }));
                  closePicker();
                }}
              >
                <Text
                  variant="body"
                  weight={active ? 'bold' : 'regular'}
                  style={{ color: active ? Colors.primary[500] : tokens.text, flex: 1 }}
                >
                  {slot.label}
                </Text>
                {active && <Ionicons name="checkmark" size={18} color={Colors.primary[500]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );
  }

  function CategoryPickerSheet() {
    return (
      <>
        <View style={[styles.sheetHandle, { backgroundColor: tokens.border }]} />
        <Text variant="h4" weight="bold" style={[styles.sheetTitle, { color: tokens.text }]}>Category</Text>
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="always">
          {CATEGORIES.map(cat => {
            const active = form.category === cat.value && !customCatVisible;
            return (
              <TouchableOpacity
                key={cat.value}
                style={styles.sheetRow}
                onPress={() => selectCategory(cat.value)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                  <Text variant="body" weight={active ? 'semibold' : 'regular'} style={{ color: tokens.text }}>
                    {cat.label}
                  </Text>
                </View>
                {active && <Ionicons name="checkmark" size={20} color={cat.color} />}
              </TouchableOpacity>
            );
          })}

          {/* Custom */}
          <TouchableOpacity style={styles.sheetRow} onPress={() => selectCategory('__custom__')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
              <View style={[styles.catDot, { backgroundColor: Colors.primary[500] }]} />
              <Text style={{ fontSize: 18 }}>🏷️</Text>
              <Text variant="body" weight={customCatVisible ? 'semibold' : 'regular'} style={{ color: tokens.text }}>
                Custom…
              </Text>
            </View>
            {customCatVisible && <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />}
          </TouchableOpacity>

          {customCatVisible && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <TextInput
                value={form.customCategoryName}
                onChangeText={t => setForm(f => ({ ...f, customCategoryName: t }))}
                placeholder="e.g. Soccer Practice, Movie Night…"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.customInput, {
                  color: tokens.text,
                  borderColor: Colors.primary[500],
                  backgroundColor: tokens.surfaceAlt,
                }]}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={closePicker}
              />
              <TouchableOpacity
                style={[styles.sheetDoneBtn, { backgroundColor: Colors.primary[500] }]}
                onPress={closePicker}
              >
                <Text variant="body" weight="bold" color="#fff">Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </>
    );
  }

  function ReminderPickerSheet() {
    const curMin = editReminderIdx >= 0 ? form.reminders[editReminderIdx] : -1;
    return (
      <>
        <View style={[styles.sheetHandle, { backgroundColor: tokens.border }]} />
        <Text variant="h4" weight="bold" style={[styles.sheetTitle, { color: tokens.text }]}>
          {editReminderIdx === -1 ? 'Add Reminder' : 'Change Reminder'}
        </Text>
        <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="always">
          {REMINDER_PRESETS.map(opt => {
            const active = curMin === opt.minutes;
            return (
              <TouchableOpacity
                key={opt.minutes}
                style={[styles.sheetRow, active && { backgroundColor: Colors.primary[500] + '18' }]}
                onPress={() => applyReminder(opt.minutes)}
              >
                <Text
                  variant="body"
                  weight={active ? 'semibold' : 'regular'}
                  style={{ color: active ? Colors.primary[500] : tokens.text, flex: 1 }}
                >
                  {opt.label}
                </Text>
                {active && <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />}
              </TouchableOpacity>
            );
          })}

          {/* Custom / Benutzerdefiniert */}
          <TouchableOpacity
            style={[styles.sheetRow, showCustomRem && { backgroundColor: Colors.primary[500] + '10' }]}
            onPress={() => setShowCustomRem(s => !s)}
          >
            <Text
              variant="body"
              weight={showCustomRem ? 'semibold' : 'regular'}
              style={{ color: Colors.primary[500], flex: 1 }}
            >
              Custom (Benutzerdefiniert)…
            </Text>
            <Ionicons
              name={showCustomRem ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.primary[500]}
            />
          </TouchableOpacity>

          {showCustomRem && (
            <View style={[styles.customRemBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
              <View style={styles.customRemRow}>
                <TextInput
                  value={customRemVal}
                  onChangeText={setCustomRemVal}
                  keyboardType="number-pad"
                  style={[styles.customRemNum, {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  }]}
                  maxLength={4}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {REMINDER_UNITS.map(u => {
                      const active = customRemUnit === u.value;
                      return (
                        <TouchableOpacity
                          key={u.value}
                          style={[styles.unitChip, {
                            backgroundColor: active ? Colors.primary[500] : tokens.surface,
                            borderColor: active ? Colors.primary[500] : tokens.border,
                          }]}
                          onPress={() => setCustomRemUnit(u.value)}
                        >
                          <Text
                            variant="caption"
                            weight={active ? 'bold' : 'regular'}
                            style={{ color: active ? '#fff' : tokens.textSecondary }}
                          >
                            {u.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
              <TouchableOpacity
                style={[styles.sheetDoneBtn, { backgroundColor: Colors.primary[500] }]}
                onPress={confirmCustomReminder}
              >
                <Text variant="body" weight="bold" color="#fff">Add Reminder</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </>
    );
  }

  // ── Event card ────────────────────────────────────────────────────────
  function EventCard({ ev }: { ev: CalEvent }) {
    const info  = catInfo(ev.category, ev.customCategory);
    const color = ev.color ?? info.color;
    return (
      <Card style={styles.eventCard} shadow="sm" onPress={() => handleEventPress(ev)}>
        <View style={[styles.eventAccent, { backgroundColor: color }]} />
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Text variant="body" weight="semibold" numberOfLines={1}>{info.emoji} {ev.title}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            <Text variant="caption" secondary>
              {ev.allDay ? 'All day' : format(new Date(ev.startDate), 'h:mm a')}
            </Text>
            {ev.location ? <Text variant="caption" secondary>📍 {ev.location}</Text> : null}
          </View>
          {ev.reminders?.length > 0 && (
            <Text variant="caption" color={Colors.primary[400]} style={{ marginTop: 2 }}>
              🔔 {ev.reminders.map(fmtReminder).join(' · ')}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />
      </Card>
    );
  }

  // ── Derived display values ────────────────────────────────────────────
  const displayCat = customCatVisible && form.customCategoryName.trim()
    ? { label: form.customCategoryName, emoji: '🏷️', color: Colors.primary[500] }
    : catInfo(form.category);

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ EVENT FORM MODAL ══════ */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeModal} statusBarTranslucent>
        {/* Use plain View so we can layer picker overlays absolutely on top */}
        <View style={[styles.root, { backgroundColor: tokens.background }]}>

          {/* Header */}
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
              {editingId ? 'Edit Event' : 'New Event'}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveEvent} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.primary[500]} />
                : <Text variant="body" weight="bold" style={{ color: Colors.primary[500] }}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Form */}
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
                placeholder="Event title"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
              />

              {/* All Day */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="sunny-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>All Day</Text>
                </View>
                <Switch
                  value={form.allDay}
                  onValueChange={v => setForm(f => ({ ...f, allDay: v }))}
                  trackColor={{ true: Colors.primary[500] }}
                  thumbColor="#fff"
                />
              </View>

              {/* Date — tap opens date picker overlay */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: tokens.border }]}
                onPress={openDatePicker}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Date</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text variant="body" weight="semibold" style={{ color: Colors.primary[500] }}>
                    {format(form.date, 'EEE, MMM d, yyyy')}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.primary[500]} />
                </View>
              </TouchableOpacity>

              {/* Start / End time */}
              {!form.allDay && (
                <>
                  <TouchableOpacity
                    style={[styles.formRow, { borderBottomColor: tokens.border }]}
                    onPress={() => openTimePicker('start')}
                  >
                    <View style={styles.rowLeft}>
                      <Ionicons name="time-outline" size={20} color={tokens.textSecondary} />
                      <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Start</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text variant="body" weight="semibold" style={{ color: Colors.primary[500] }}>
                        {fmt12(form.startTime)}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={Colors.primary[500]} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.formRow, { borderBottomColor: tokens.border }]}
                    onPress={() => openTimePicker('end')}
                  >
                    <View style={styles.rowLeft}>
                      <Ionicons name="time-outline" size={20} color={tokens.textSecondary} />
                      <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>End</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text variant="body" weight="semibold" style={{ color: Colors.primary[500] }}>
                        {fmt12(form.endTime)}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={Colors.primary[500]} />
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Category */}
              <TouchableOpacity
                style={[styles.formRow, { borderBottomColor: tokens.border }]}
                onPress={openCatPicker}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="pricetag-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Category</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.catDot, { backgroundColor: displayCat.color }]} />
                  <Text variant="body" weight="semibold" style={{ color: tokens.text }}>
                    {displayCat.emoji} {displayCat.label}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={tokens.textSecondary} />
                </View>
              </TouchableOpacity>

              {/* Location */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="location-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Location</Text>
                </View>
                <TextInput
                  value={form.location}
                  onChangeText={t => setForm(f => ({ ...f, location: t }))}
                  placeholder="Add location"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.inlineInput, { color: tokens.text }]}
                  returnKeyType="done"
                />
              </View>

              {/* Reminders */}
              <View style={[styles.remSection, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="notifications-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Reminders</Text>
                </View>
                {form.reminders.map((min, idx) => (
                  <View key={idx} style={styles.remRow}>
                    <View style={{ width: 32 }} />
                    <TouchableOpacity
                      style={styles.remValueBtn}
                      onPress={() => openReminderPicker(idx)}
                    >
                      <Text variant="body" weight="semibold" style={{ color: Colors.primary[500] }}>
                        {fmtReminder(min)}
                      </Text>
                      <Ionicons name="chevron-down" size={15} color={Colors.primary[500]} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeReminder(idx)} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={22} color={tokens.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addRemBtn} onPress={() => openReminderPicker(-1)}>
                  <View style={{ width: 32 }} />
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primary[500]} />
                  <Text variant="body" style={{ color: Colors.primary[500], marginLeft: 8 }}>Add reminder</Text>
                </TouchableOpacity>
              </View>

              {/* Notes */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border, alignItems: 'flex-start', paddingTop: 16 }]}>
                <View style={[styles.rowLeft, { paddingTop: 2 }]}>
                  <Ionicons name="document-text-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Notes</Text>
                </View>
                <TextInput
                  value={form.description}
                  onChangeText={t => setForm(f => ({ ...f, description: t }))}
                  placeholder="Add notes…"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.notesInput, { color: tokens.text }]}
                  multiline
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* ══════ PICKER OVERLAYS — inside the modal, absolutely on top ══════
               KeyboardAvoidingView pushes the sheet up when the keyboard appears,
               so custom text inputs (category name, custom reminder) are always visible. */}
          {picker !== 'none' && (
            <KeyboardAvoidingView
              style={[StyleSheet.absoluteFillObject, styles.pickerOverlay]}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              {/* Tap backdrop to dismiss */}
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closePicker} />
              {/* Sheet — called as plain functions, NOT as JSX components.
                   This keeps the returned JSX in the parent's render tree so
                   TextInput nodes are stable across re-renders (no unmount/remount
                   → no keyboard dismissal on every keystroke). */}
              <View style={[styles.pickerSheet, { backgroundColor: tokens.surface }]}>
                {picker === 'date'                                  && DatePickerSheet()}
                {(picker === 'time-start' || picker === 'time-end') && TimePickerSheet()}
                {picker === 'category'                              && CategoryPickerSheet()}
                {picker === 'reminder'                              && ReminderPickerSheet()}
              </View>
            </KeyboardAvoidingView>
          )}

        </View>
      </Modal>

      {/* ══════ MAIN CALENDAR HEADER ══════ */}
      <LinearGradient
        colors={isDark ? ['#0A0820', '#0A0A1A'] : ['#EEF4FF', '#F5F7FF']}
        style={[styles.calHeader, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => setCurrent(subMonths(current, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCurrent(new Date()); setSelected(new Date()); }}>
            <Text variant="h3" weight="bold" style={{ color: isDark ? '#fff' : tokens.text }}>
              {format(current, 'MMMM yyyy')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrent(addMonths(current, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {DAYS.map(d => (
            <View key={d} style={[styles.gridCell, { width: GRID_CELL }]}>
              <Text variant="caption" weight="semibold" style={{ color: tokens.textSecondary }}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: startDay }).map((_, i) => (
            <View key={`e${i}`} style={[styles.gridCell, { width: GRID_CELL, height: GRID_CELL }]} />
          ))}
          {days.map(day => {
            const evs   = eventsForDay(day);
            const isSel = isSameDay(day, selected);
            const today = isToday(day);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[styles.gridCell, { width: GRID_CELL, height: GRID_CELL }]}
                onPress={() => setSelected(day)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dateBubble,
                  isSel  && { backgroundColor: Colors.primary[500] },
                  today && !isSel && { borderWidth: 2, borderColor: Colors.primary[500] },
                ]}>
                  <Text
                    variant="bodySmall"
                    weight={today || isSel ? 'bold' : 'regular'}
                    style={{ color: isSel ? '#fff' : today ? Colors.primary[500] : tokens.text }}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                {evs.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                    {evs.slice(0, 3).map((e, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: e.color ?? catColor(e.category) }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {isLoading && <ActivityIndicator size="small" color={Colors.primary[500]} style={{ marginVertical: 4 }} />}
      </LinearGradient>

      {/* ══════ EVENTS LIST ══════ */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing[4], paddingBottom: 56 + insets.bottom + 20 }}>
        <View style={styles.dayHeader}>
          <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
            {isToday(selected) ? 'Today' : format(selected, 'EEEE, MMM d')}
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: Colors.primary[500] }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text variant="bodySmall" weight="semibold" style={{ color: '#fff', marginLeft: 4 }}>Add Event</Text>
          </TouchableOpacity>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
            <Text style={{ fontSize: 32 }}>☀️</Text>
            <Text variant="body" secondary style={{ marginTop: 8 }}>No events — free day!</Text>
            <TouchableOpacity style={{ marginTop: 12 }} onPress={openCreate}>
              <Text variant="bodySmall" weight="semibold" style={{ color: Colors.primary[500] }}>+ Add something</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {selectedEvents.map(ev => <EventCard key={ev.id} ev={ev} />)}
          </View>
        )}

        {upcoming.length > 0 && (
          <>
            <Text variant="h4" weight="bold" style={{ marginTop: 28, marginBottom: 12, color: tokens.text }}>Upcoming</Text>
            <View style={{ gap: 10 }}>
              {upcoming.map(ev => {
                const info  = catInfo(ev.category, ev.customCategory);
                const color = ev.color ?? info.color;
                return (
                  <Card key={ev.id} style={styles.upcomingCard} shadow="sm" onPress={() => handleEventPress(ev)}>
                    <View style={[styles.upcomingDate, { backgroundColor: `${color}18` }]}>
                      <Text variant="caption" weight="bold" style={{ color }}>{format(new Date(ev.startDate), 'MMM')}</Text>
                      <Text variant="h3" weight="black" style={{ color }}>{format(new Date(ev.startDate), 'd')}</Text>
                    </View>
                    <View style={{ flex: 1, paddingLeft: 14 }}>
                      <Text variant="body" weight="semibold" numberOfLines={1}>{info.emoji} {ev.title}</Text>
                      <Text variant="caption" secondary>
                        {ev.allDay ? 'All day' : format(new Date(ev.startDate), 'h:mm a')}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </Text>
                      {ev.reminders?.length > 0 && (
                        <Text variant="caption" style={{ color: Colors.primary[400] }}>
                          🔔 {ev.reminders.map(fmtReminder).join(' · ')}
                        </Text>
                      )}
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Main calendar
  calHeader:  { paddingHorizontal: 20, paddingBottom: 12 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  gridCell:   { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  dateBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot:        { width: 5, height: 5, borderRadius: 2.5 },
  dayHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  emptyDay:   { borderRadius: BorderRadius.xl, padding: 32, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  eventCard:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  eventAccent:{ width: 4, position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  upcomingCard:{ flexDirection: 'row', alignItems: 'center', padding: 14 },
  upcomingDate:{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Form modal
  modalHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:   { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:   { padding: 20, paddingBottom: 60 },
  titleInput: { fontSize: 22, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  formRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:    { flexDirection: 'row', alignItems: 'center' },
  rowLabel:   { marginLeft: 12, fontSize: 15 },
  inlineInput:{ flex: 1, textAlign: 'right', fontSize: 15 },
  notesInput: { flex: 1, textAlign: 'right', fontSize: 15, minHeight: 44, textAlignVertical: 'top' },
  catDot:     { width: 14, height: 14, borderRadius: 7 },

  // Reminders
  remSection: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  remRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  remValueBtn:{ flex: 1, flexDirection: 'row', alignItems: 'center' },
  addRemBtn:  { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },

  // Picker overlay (inside modal, absolutely positioned)
  pickerOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100 },
  pickerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingBottom: 44,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 20,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle:  { paddingHorizontal: 20, paddingBottom: 8 },
  sheetRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },

  // Date picker
  pickerMonthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  pickerNavBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dateCell:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // Category custom input
  customInput:   { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  sheetDoneBtn:  { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },

  // Reminder custom
  customRemBox:  { marginHorizontal: 20, marginTop: 4, borderRadius: 12, padding: 14, borderWidth: 1, gap: 12 },
  customRemRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customRemNum:  { width: 72, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  unitChip:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
});
