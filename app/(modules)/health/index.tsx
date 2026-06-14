import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Card, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.health;

// ── Constants ──────────────────────────────────────────────────────────────
const FREQ_OPTIONS = ['Daily', 'Twice daily', 'Three times daily', 'Weekly', 'As needed'];
const TIME_PRESETS = [
  { label: 'Morning',   value: '8:00 AM'  },
  { label: 'Noon',      value: '12:00 PM' },
  { label: 'Afternoon', value: '3:00 PM'  },
  { label: 'Evening',   value: '6:00 PM'  },
  { label: 'Night',     value: '9:00 PM'  },
];
const DAY_LETTERS  = ['M','T','W','T','F','S','S'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EMERGENCY_CONTACTS = [
  { name: 'Emergency Services', role: 'Emergency',      phone: '911'          },
  { name: 'Poison Control',     role: 'Poison Control', phone: '800-222-1222' },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface Medication {
  id: string; name: string; dosage: string;
  frequency: string; times: string[]; active: boolean; userId: string;
}
interface HealthAppointment {
  id: string; title: string; doctor?: string;
  location?: string; date: string; notes?: string; userId: string;
}
interface FamilyMember {
  id: string; name: string; avatar?: string;
  medications: Medication[];
  appointments: HealthAppointment[];
}

interface MedForm  { name: string; dosage: string; frequency: string; times: string[]; }
interface ApptForm { title: string; doctor: string; location: string; date: string; notes: string; }

const DEFAULT_MED:  MedForm  = { name: '', dosage: '', frequency: 'Daily', times: ['8:00 AM'] };
const DEFAULT_APPT: ApptForm = {
  title: '', doctor: '', location: '',
  date: new Date().toISOString().slice(0, 10), notes: '',
};

function fmtApptDate(iso: string): { month: string; day: string; full: string } {
  const d = new Date(iso);
  return {
    month: MONTH_SHORT[d.getMonth()],
    day:   String(d.getDate()),
    full:  `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
  };
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function HealthScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [activeMember, setActiveMember] = useState('All');

  // Session-only "taken today" tracking (not backed by DB)
  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());

  // Medication modal
  const [medModal,   setMedModal]   = useState(false);
  const [editMed,    setEditMed]    = useState<Medication | null>(null);
  const [medForm,    setMedForm]    = useState<MedForm>(DEFAULT_MED);
  const [savingMed,  setSavingMed]  = useState(false);

  // Appointment modal
  const [apptModal,   setApptModal]   = useState(false);
  const [editAppt,    setEditAppt]    = useState<HealthAppointment | null>(null);
  const [apptForm,    setApptForm]    = useState<ApptForm>(DEFAULT_APPT);
  const [savingAppt,  setSavingAppt]  = useState(false);
  const [apptDateOpen, setApptDateOpen] = useState(false);
  const [apptCalMonth, setApptCalMonth] = useState(() => new Date());

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: familyMembers = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ['health-family'],
    queryFn:  async () => { const r = await api.get('/health/family'); return r.data.data; },
    enabled:  !!user?.familyId,
  });

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = activeMember === 'All'
    ? familyMembers
    : familyMembers.filter(m => m.id === activeMember);

  const allMeds  = filtered.flatMap(m => m.medications.map(med => ({ ...med, memberName: m.name })));
  const allAppts = filtered.flatMap(m => m.appointments.map(apt => ({ ...apt, memberName: m.name })));

  const totalMeds  = familyMembers.reduce((s, m) => s + m.medications.length, 0);
  const totalAppts = familyMembers.reduce((s, m) => s + m.appointments.length, 0);

  // ── Taken toggle (session-only) ───────────────────────────────────────────
  function toggleTaken(id: string) {
    setTakenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Medication CRUD ───────────────────────────────────────────────────────
  function openAddMed() {
    setEditMed(null);
    setMedForm(DEFAULT_MED);
    setMedModal(true);
  }
  function openEditMed(med: Medication) {
    setEditMed(med);
    setMedForm({ name: med.name, dosage: med.dosage, frequency: med.frequency, times: med.times });
    setMedModal(true);
  }
  function closeMedModal() { if (savingMed) return; setMedModal(false); setEditMed(null); }

  async function saveMed() {
    if (!medForm.name.trim())   { Alert.alert('Required', 'Enter a medication name.'); return; }
    if (!medForm.dosage.trim()) { Alert.alert('Required', 'Enter the dosage.'); return; }
    setSavingMed(true);
    try {
      const payload = { name: medForm.name.trim(), dosage: medForm.dosage.trim(), frequency: medForm.frequency, times: medForm.times };
      if (editMed) {
        await api.patch(`/health/medications/${editMed.id}`, payload);
      } else {
        await api.post('/health/medications', payload);
      }
      qc.invalidateQueries({ queryKey: ['health-family'] });
      closeMedModal();
      toast.success(editMed ? 'Medication updated' : 'Medication added');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingMed(false); }
  }

  function confirmDeleteMed(med: Medication) {
    Alert.alert('Delete Medication', `Delete "${med.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/health/medications/${med.id}`);
          qc.invalidateQueries({ queryKey: ['health-family'] });
          toast.success('Medication removed');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  function toggleTime(t: string) {
    setMedForm(f => ({
      ...f,
      times: f.times.includes(t) ? f.times.filter(x => x !== t) : [...f.times, t],
    }));
  }

  // ── Appointment CRUD ──────────────────────────────────────────────────────
  function openAddAppt() {
    setEditAppt(null);
    setApptForm({ ...DEFAULT_APPT, date: new Date().toISOString().slice(0, 10) });
    setApptCalMonth(new Date());
    setApptDateOpen(false);
    setApptModal(true);
  }
  function openEditAppt(appt: HealthAppointment) {
    setEditAppt(appt);
    setApptForm({
      title:    appt.title,
      doctor:   appt.doctor   ?? '',
      location: appt.location ?? '',
      date:     appt.date.slice(0, 10),
      notes:    appt.notes    ?? '',
    });
    setApptCalMonth(new Date(appt.date));
    setApptDateOpen(false);
    setApptModal(true);
  }
  function closeApptModal() { if (savingAppt) return; setApptModal(false); setEditAppt(null); setApptDateOpen(false); }

  async function saveAppt() {
    if (!apptForm.title.trim()) { Alert.alert('Required', 'Enter an appointment title.'); return; }
    setSavingAppt(true);
    try {
      const payload = {
        title:    apptForm.title.trim(),
        doctor:   apptForm.doctor.trim()   || undefined,
        location: apptForm.location.trim() || undefined,
        date:     apptForm.date,
        notes:    apptForm.notes.trim()    || undefined,
      };
      if (editAppt) {
        await api.patch(`/health/appointments/${editAppt.id}`, payload);
      } else {
        await api.post('/health/appointments', payload);
      }
      qc.invalidateQueries({ queryKey: ['health-family'] });
      closeApptModal();
      toast.success(editAppt ? 'Appointment updated' : 'Appointment added');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingAppt(false); }
  }

  function confirmDeleteAppt(appt: HealthAppointment) {
    Alert.alert('Delete Appointment', `Delete "${appt.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/health/appointments/${appt.id}`);
          qc.invalidateQueries({ queryKey: ['health-family'] });
          toast.success('Appointment removed');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Mini-calendar for appointment date (inline) ───────────────────────────
  function ApptDatePickerContent() {
    const year  = apptCalMonth.getFullYear();
    const mo    = apptCalMonth.getMonth();
    const first = new Date(year, mo, 1).getDay();
    const total = new Date(year, mo + 1, 0).getDate();
    const off   = first === 0 ? 6 : first - 1;
    const cells = Array.from({ length: off + total }, (_, i) => (i < off ? null : i - off + 1));
    return (
      <View style={[styles.miniCal, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.calNavRow}>
          <TouchableOpacity onPress={() => { const d = new Date(apptCalMonth); d.setMonth(d.getMonth() - 1); setApptCalMonth(d); }}>
            <Ionicons name="chevron-back" size={18} color={tokens.text} />
          </TouchableOpacity>
          <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{MONTH_SHORT[mo]} {year}</Text>
          <TouchableOpacity onPress={() => { const d = new Date(apptCalMonth); d.setMonth(d.getMonth() + 1); setApptCalMonth(d); }}>
            <Ionicons name="chevron-forward" size={18} color={tokens.text} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          {DAY_LETTERS.map((l, i) => (
            <Text key={i} variant="caption" secondary style={{ width: '14.28%', textAlign: 'center' }}>{l}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={{ width: '14.28%', height: 36 }} />;
            const ds = `${year}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const sel = apptForm.date === ds;
            return (
              <TouchableOpacity key={i}
                style={{ width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => { setApptForm(f => ({ ...f, date: ds })); setApptDateOpen(false); }}>
                <View style={[{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, sel && { backgroundColor: C.primary }]}>
                  <Text variant="bodySmall" style={{ color: sel ? '#fff' : tokens.text }}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── No family guard ───────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Text style={{ fontSize: 64 }}>💊</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to track health together.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ MEDICATION MODAL ══════ */}
      <Modal visible={medModal} animationType="slide" onRequestClose={closeMedModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingMed && { opacity: 0.35 }]} onPress={closeMedModal} disabled={savingMed}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editMed ? 'Edit Medication' : 'Add Medication'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveMed} disabled={savingMed}>
              {savingMed ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              {/* Name */}
              <TextInput
                value={medForm.name}
                onChangeText={t => setMedForm(f => ({ ...f, name: t }))}
                placeholder="Medication name (e.g. Vitamin D)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus={!editMed}
              />
              {/* Dosage */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="medical-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Dosage</Text>
                </View>
                <TextInput
                  value={medForm.dosage}
                  onChangeText={t => setMedForm(f => ({ ...f, dosage: t }))}
                  placeholder="e.g. 500mg, 1 tablet"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.inlineInput, { color: tokens.text }]}
                />
              </View>
              {/* Frequency */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>FREQUENCY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {FREQ_OPTIONS.map(f => (
                    <TouchableOpacity key={f}
                      style={[styles.chip, {
                        backgroundColor: medForm.frequency === f ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     medForm.frequency === f ? C.primary : tokens.border,
                      }]}
                      onPress={() => setMedForm(m => ({ ...m, frequency: f }))}>
                      <Text variant="bodySmall"
                        weight={medForm.frequency === f ? 'bold' : 'regular'}
                        style={{ color: medForm.frequency === f ? C.primary : tokens.textSecondary }}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Times */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>TIMES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TIME_PRESETS.map(t => (
                    <TouchableOpacity key={t.value}
                      style={[styles.chip, {
                        backgroundColor: medForm.times.includes(t.value) ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     medForm.times.includes(t.value) ? C.primary : tokens.border,
                      }]}
                      onPress={() => toggleTime(t.value)}>
                      <Text variant="bodySmall"
                        weight={medForm.times.includes(t.value) ? 'bold' : 'regular'}
                        style={{ color: medForm.times.includes(t.value) ? C.primary : tokens.textSecondary }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Delete */}
              {editMed && editMed.userId === user?.id && (
                <TouchableOpacity style={[styles.deleteBtn, { borderColor: Colors.error[500] }]}
                  onPress={() => { closeMedModal(); setTimeout(() => confirmDeleteMed(editMed), 300); }}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error[500]} />
                  <Text variant="body" weight="semibold" style={{ color: Colors.error[500], marginLeft: 8 }}>Delete Medication</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ APPOINTMENT MODAL ══════ */}
      <Modal visible={apptModal} animationType="slide" onRequestClose={closeApptModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingAppt && { opacity: 0.35 }]} onPress={closeApptModal} disabled={savingAppt}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editAppt ? 'Edit Appointment' : 'Add Appointment'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveAppt} disabled={savingAppt}>
              {savingAppt ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <TextInput
                value={apptForm.title}
                onChangeText={t => setApptForm(f => ({ ...f, title: t }))}
                placeholder="Appointment title (e.g. Dentist)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus={!editAppt}
              />
              {[
                { label: 'Doctor',   key: 'doctor'   as const, icon: 'person-outline',   placeholder: 'Dr. Smith'         },
                { label: 'Location', key: 'location' as const, icon: 'location-outline',  placeholder: 'City Medical Center' },
              ].map(({ label, key, icon, placeholder }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={apptForm[key]}
                    onChangeText={t => setApptForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
              {/* Date row */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Date</Text>
                </View>
                <TouchableOpacity onPress={() => setApptDateOpen(v => !v)}>
                  <Text variant="body" weight="semibold" style={{ color: C.primary }}>
                    {fmtApptDate(apptForm.date).full}
                  </Text>
                </TouchableOpacity>
              </View>
              {apptDateOpen && ApptDatePickerContent()}
              {/* Notes */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>NOTES (optional)</Text>
                <TextInput
                  value={apptForm.notes}
                  onChangeText={t => setApptForm(f => ({ ...f, notes: t }))}
                  placeholder="Any notes or reminders…"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.textArea, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                  multiline numberOfLines={3}
                />
              </View>
              {/* Delete */}
              {editAppt && editAppt.userId === user?.id && (
                <TouchableOpacity style={[styles.deleteBtn, { borderColor: Colors.error[500] }]}
                  onPress={() => { closeApptModal(); setTimeout(() => confirmDeleteAppt(editAppt), 300); }}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error[500]} />
                  <Text variant="body" weight="semibold" style={{ color: Colors.error[500], marginLeft: 8 }}>Delete Appointment</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
      <LinearGradient
        colors={isDark ? ['#002D0F', '#0A0A1A'] : ['#F0FDF4', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Health Hub</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              Track medications, appointments & wellness
            </Text>
          </View>
          {isLoading && <ActivityIndicator color={isDark ? '#fff' : C.primary} />}
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {[
            { icon: '💊', label: 'Medications', value: isLoading ? '…' : `${totalMeds} active`,   color: C.primary           },
            { icon: '📅', label: 'Upcoming',    value: isLoading ? '…' : `${totalAppts} appts`,   color: Colors.primary[500] },
            { icon: '👨‍👩‍👧', label: 'Members',    value: isLoading ? '…' : `${familyMembers.length} people`, color: Colors.success[500] },
          ].map(s => (
            <View key={s.label} style={[styles.statChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text variant="caption" secondary style={{ marginTop: 4 }}>{s.label}</Text>
              <Text variant="bodySmall" weight="bold" style={{ color: s.color }}>{s.value}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ══════ MEMBER FILTER ══════ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        style={{ maxHeight: 52, flexGrow: 0 }}>
        <Chip label="All" selected={activeMember === 'All'} onPress={() => setActiveMember('All')} color={C.primary} />
        {familyMembers.map(m => (
          <Chip key={m.id} label={m.name.split(' ')[0]} selected={activeMember === m.id}
            onPress={() => setActiveMember(m.id)} color={C.primary} />
        ))}
      </ScrollView>

      {/* ══════ CONTENT ══════ */}
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 60, gap: 20 }}>

        {/* Medications */}
        <View>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Medications 💊</Text>
            <TouchableOpacity onPress={openAddMed}>
              <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? <ActivityIndicator color={C.primary} style={{ marginTop: 8 }} />
            : allMeds.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                <Text style={{ fontSize: 28 }}>💊</Text>
                <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 8 }}>No medications</Text>
                <Text variant="bodySmall" secondary style={{ marginTop: 4 }}>Tap "+ Add" to track medications</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {allMeds.map(med => {
                  const taken   = takenIds.has(med.id);
                  const isOwn   = med.userId === user?.id;
                  const timeStr = med.times.length > 0 ? med.times.join(', ') : med.frequency;
                  return (
                    <TouchableOpacity
                      key={med.id}
                      activeOpacity={0.85}
                      onLongPress={() => {
                        if (!isOwn) return;
                        Alert.alert(med.name, 'What would you like to do?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Edit',   onPress: () => openEditMed(med) },
                          { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteMed(med) },
                        ]);
                      }}
                    >
                      <Card style={styles.medCard} shadow="sm">
                        <View style={[styles.medIcon, { backgroundColor: taken ? Colors.success[50] : `${C.primary}18` }]}>
                          <Text style={{ fontSize: 22 }}>💊</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{med.name}</Text>
                          <Text variant="caption" secondary>{med.dosage} · {timeStr}</Text>
                          <Text variant="caption" secondary>{med.memberName}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => toggleTaken(med.id)}
                          style={[styles.takenBtn, {
                            backgroundColor: taken ? Colors.success[500] : 'transparent',
                            borderColor:     taken ? Colors.success[500] : tokens.border,
                          }]}>
                          <Ionicons name={taken ? 'checkmark' : 'checkmark-outline'} size={16}
                            color={taken ? '#fff' : tokens.textTertiary} />
                        </TouchableOpacity>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          }
        </View>

        {/* Appointments */}
        <View>
          <View style={styles.sectionHeader}>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Appointments 📅</Text>
            <TouchableOpacity onPress={openAddAppt}>
              <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? <ActivityIndicator color={C.primary} style={{ marginTop: 8 }} />
            : allAppts.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                <Text style={{ fontSize: 28 }}>📅</Text>
                <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 8 }}>No upcoming appointments</Text>
                <Text variant="bodySmall" secondary style={{ marginTop: 4 }}>Tap "+ Add" to schedule one</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {allAppts.map(appt => {
                  const dt    = fmtApptDate(appt.date);
                  const isOwn = appt.userId === user?.id;
                  return (
                    <TouchableOpacity
                      key={appt.id}
                      activeOpacity={0.85}
                      onPress={() => isOwn && openEditAppt(appt)}
                      onLongPress={() => {
                        if (!isOwn) return;
                        Alert.alert(appt.title, 'What would you like to do?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Edit',   onPress: () => openEditAppt(appt) },
                          { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteAppt(appt) },
                        ]);
                      }}
                    >
                      <Card style={styles.apptCard} shadow="sm">
                        <View style={[styles.apptDate, { backgroundColor: `${C.primary}18` }]}>
                          <Text variant="caption" weight="bold" style={{ color: C.primary }}>{dt.month}</Text>
                          <Text variant="h3" weight="black" style={{ color: C.primary }}>{dt.day}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{appt.title}</Text>
                          {appt.doctor   && <Text variant="caption" secondary>{appt.doctor}</Text>}
                          {appt.location && <Text variant="caption" secondary>{appt.location}</Text>}
                          <Text variant="caption" secondary>{appt.memberName}</Text>
                        </View>
                        {isOwn && <Ionicons name="chevron-forward" size={16} color={tokens.textTertiary} />}
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          }
        </View>

        {/* Emergency Contacts */}
        <View>
          <Text variant="h4" weight="bold" style={{ marginBottom: 12, color: tokens.text }}>Emergency Contacts 🚨</Text>
          <Card style={styles.emergencyCard} shadow="sm">
            {EMERGENCY_CONTACTS.map((c, i) => (
              <View key={c.name} style={[
                styles.contactRow,
                i < EMERGENCY_CONTACTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border },
              ]}>
                <View style={[styles.contactIcon, { backgroundColor: `${C.primary}18` }]}>
                  <Ionicons name="call-outline" size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{c.name}</Text>
                  <Text variant="caption" secondary>{c.role}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: C.primary }]}
                  onPress={() => Linking.openURL(`tel:${c.phone.replace(/[^0-9]/g, '')}`)}
                >
                  <Text variant="caption" weight="bold" style={{ color: '#fff' }}>{c.phone}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:    { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statsRow:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  statChip:  { flex: 1, borderRadius: BorderRadius.xl, padding: 14, alignItems: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  medCard:  { flexDirection: 'row', alignItems: 'center', padding: 14 },
  medIcon:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  takenBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  apptCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  apptDate: { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  emergencyCard: { padding: 0 },
  contactRow:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  contactIcon:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  callBtn:       { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },

  emptyBox: { borderRadius: BorderRadius.xl, padding: 24, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:    { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:    { padding: 20, paddingBottom: 60 },
  titleInput:  { fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  formRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:     { flexDirection: 'row', alignItems: 'center' },
  rowLabel:    { marginLeft: 12, fontSize: 15 },
  inlineInput: { flex: 1, textAlign: 'right', fontSize: 15 },
  section:     { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel:{ fontSize: 11, letterSpacing: 0.8, marginBottom: 10, color: '#888' },
  chip:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  textArea:    { padding: 12, borderRadius: BorderRadius.xl, borderWidth: 1.5, fontSize: 15, lineHeight: 22, minHeight: 80 },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 14, borderRadius: BorderRadius.xl, borderWidth: 1.5 },

  miniCal:   { borderRadius: BorderRadius.xl, borderWidth: 1, padding: 12, marginBottom: 8 },
  calNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
});
