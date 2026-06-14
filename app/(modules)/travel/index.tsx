import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, Card, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.travel;

// ── Constants ──────────────────────────────────────────────────────────────
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LETTERS  = ['M','T','W','T','F','S','S'];

// ── Types ──────────────────────────────────────────────────────────────────
interface ItineraryItem {
  id: string; day: number; time?: string;
  activity: string; location?: string; notes?: string; tripId: string;
}
interface PackingItem {
  id: string; name: string; packed: boolean; qty: number; tripId: string;
}
interface Trip {
  id: string; name: string; destination: string;
  startDate: string; endDate: string;
  budget?: number; coverImage?: string;
  familyId: string; createdBy: string; createdAt: string;
  itinerary: ItineraryItem[];
  packingList: PackingItem[];
}

interface TripForm {
  name: string; destination: string;
  startDate: string; endDate: string;
  budget: string; coverImage: string;
}
interface ItinForm {
  day: string; time: string; activity: string; location: string; notes: string;
}

const DEFAULT_TRIP: TripForm = {
  name: '', destination: '', startDate: '', endDate: '', budget: '', coverImage: '',
};
const DEFAULT_ITIN: ItinForm = {
  day: '1', time: '', activity: '', location: '', notes: '',
};

// ── Utilities ──────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function fmtDateFull(iso: string): string {
  return `${MONTH_SHORT[new Date(iso).getMonth()]} ${new Date(iso).getDate()}, ${new Date(iso).getFullYear()}`;
}
function tripStatus(t: Trip): 'upcoming' | 'ongoing' | 'past' {
  const now = Date.now();
  if (now < new Date(t.startDate).getTime()) return 'upcoming';
  if (now > new Date(t.endDate).getTime())   return 'past';
  return 'ongoing';
}
function statusLabel(s: string) {
  if (s === 'upcoming') return '✈️ Upcoming';
  if (s === 'ongoing')  return '🌍 Ongoing';
  return '✅ Past';
}
function tripDays(t: Trip): number {
  return Math.round((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86_400_000) + 1;
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function TravelScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create trip modal
  const [tripModal,  setTripModal]  = useState(false);
  const [tripForm,   setTripForm]   = useState<TripForm>(DEFAULT_TRIP);
  const [savingTrip, setSavingTrip] = useState(false);
  // Date picker inside trip modal
  const [dateField,  setDateField]  = useState<'start' | 'end' | null>(null);
  const [calMonth,   setCalMonth]   = useState(() => new Date());

  // Add itinerary item modal
  const [itinModal,  setItinModal]  = useState(false);
  const [itinForm,   setItinForm]   = useState<ItinForm>(DEFAULT_ITIN);
  const [savingItin, setSavingItin] = useState(false);

  // Packing quick-add
  const [packInput,   setPackInput]   = useState('');
  const [packAdding,  setPackAdding]  = useState(false);
  const [toggling,    setToggling]    = useState<Set<string>>(new Set());

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['trips'],
    queryFn:  async () => { const r = await api.get('/travel/trips'); return r.data.data; },
    enabled:  !!user?.familyId,
  });

  // Keep selectedId in sync with trips list
  useEffect(() => {
    if (trips.length > 0 && !selectedId) setSelectedId(trips[0].id);
    if (selectedId && !trips.find(t => t.id === selectedId) && trips.length > 0) {
      setSelectedId(trips[0].id);
    }
  }, [trips]);

  const selected = trips.find(t => t.id === selectedId) ?? null;

  // ── Trip CRUD ─────────────────────────────────────────────────────────────
  function openCreateTrip() { setTripForm(DEFAULT_TRIP); setDateField(null); setTripModal(true); }
  function closeTripModal() { if (savingTrip) return; setTripModal(false); setDateField(null); }

  async function saveTrip() {
    if (!tripForm.name.trim())        { Alert.alert('Required', 'Enter a trip name.'); return; }
    if (!tripForm.destination.trim()) { Alert.alert('Required', 'Enter a destination.'); return; }
    if (!tripForm.startDate)          { Alert.alert('Required', 'Select a start date.'); return; }
    if (!tripForm.endDate)            { Alert.alert('Required', 'Select an end date.'); return; }
    setSavingTrip(true);
    try {
      const r = await api.post('/travel/trips', {
        name:        tripForm.name.trim(),
        destination: tripForm.destination.trim(),
        startDate:   tripForm.startDate,
        endDate:     tripForm.endDate,
        budget:      tripForm.budget ? parseFloat(tripForm.budget) : undefined,
        coverImage:  tripForm.coverImage.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['trips'] });
      setSelectedId(r.data.data.id);
      closeTripModal();
      toast.success('Trip created!');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingTrip(false); }
  }

  function confirmDeleteTrip(trip: Trip) {
    Alert.alert('Delete Trip', `Delete "${trip.name}"? All itinerary and packing data will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/travel/trips/${trip.id}`);
          qc.invalidateQueries({ queryKey: ['trips'] });
          toast.success('Trip deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Itinerary CRUD ────────────────────────────────────────────────────────
  function openAddItin() { setItinForm(DEFAULT_ITIN); setItinModal(true); }
  function closeItinModal() { if (savingItin) return; setItinModal(false); }

  async function saveItin() {
    if (!itinForm.activity.trim()) { Alert.alert('Required', 'Enter an activity.'); return; }
    const day = parseInt(itinForm.day, 10);
    if (!day || day < 1) { Alert.alert('Required', 'Enter a valid day number.'); return; }
    setSavingItin(true);
    try {
      await api.post(`/travel/trips/${selected!.id}/itinerary`, {
        day,
        time:     itinForm.time.trim()     || undefined,
        activity: itinForm.activity.trim(),
        location: itinForm.location.trim() || undefined,
        notes:    itinForm.notes.trim()    || undefined,
      });
      qc.invalidateQueries({ queryKey: ['trips'] });
      closeItinModal();
      toast.success('Day added');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingItin(false); }
  }

  function confirmDeleteItin(item: ItineraryItem) {
    Alert.alert('Remove', `Remove "Day ${item.day}: ${item.activity}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/travel/itinerary/${item.id}`);
          qc.invalidateQueries({ queryKey: ['trips'] });
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Packing CRUD ──────────────────────────────────────────────────────────
  async function addPackingItem() {
    const name = packInput.trim();
    if (!name || !selected) return;
    setPackAdding(true);
    try {
      await api.post(`/travel/trips/${selected.id}/packing`, { name });
      qc.invalidateQueries({ queryKey: ['trips'] });
      setPackInput('');
    } catch (err) { toast.error(parseApiError(err)); }
    finally { setPackAdding(false); }
  }

  async function togglePacking(item: PackingItem) {
    if (toggling.has(item.id)) return;
    setToggling(prev => new Set(prev).add(item.id));
    try {
      await api.patch(`/travel/packing/${item.id}/toggle`);
      qc.invalidateQueries({ queryKey: ['trips'] });
    } catch (err) { toast.error(parseApiError(err)); }
    finally { setToggling(prev => { const s = new Set(prev); s.delete(item.id); return s; }); }
  }

  function confirmDeletePacking(item: PackingItem) {
    Alert.alert('Remove', `Remove "${item.name}" from packing list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/travel/packing/${item.id}`);
          qc.invalidateQueries({ queryKey: ['trips'] });
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Mini-calendar for trip dates ──────────────────────────────────────────
  function DatePickerContent() {
    const year  = calMonth.getFullYear();
    const mo    = calMonth.getMonth();
    const first = new Date(year, mo, 1).getDay();
    const total = new Date(year, mo + 1, 0).getDate();
    const off   = first === 0 ? 6 : first - 1;
    const cells = Array.from({ length: off + total }, (_, i) => (i < off ? null : i - off + 1));
    const selDate = dateField === 'start' ? tripForm.startDate : tripForm.endDate;
    return (
      <View style={[styles.miniCal, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
        <View style={styles.calNavRow}>
          <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth()-1); setCalMonth(d); }}>
            <Ionicons name="chevron-back" size={18} color={tokens.text} />
          </TouchableOpacity>
          <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{MONTH_SHORT[mo]} {year}</Text>
          <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth()+1); setCalMonth(d); }}>
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
            if (!day) return <View key={i} style={{ width: '14.28%', height: 34 }} />;
            const ds  = `${year}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const sel = selDate === ds;
            return (
              <TouchableOpacity key={i}
                style={{ width: '14.28%', height: 34, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  if (dateField === 'start') setTripForm(f => ({ ...f, startDate: ds }));
                  else setTripForm(f => ({ ...f, endDate: ds }));
                  setDateField(null);
                }}>
                <View style={[{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, sel && { backgroundColor: C.primary }]}>
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
        <Text style={{ fontSize: 64 }}>✈️</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to plan trips together.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ CREATE TRIP MODAL ══════ */}
      <Modal visible={tripModal} animationType="slide" onRequestClose={closeTripModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingTrip && { opacity: 0.35 }]} onPress={closeTripModal} disabled={savingTrip}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>New Trip</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveTrip} disabled={savingTrip}>
              {savingTrip ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Create</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <TextInput
                value={tripForm.name}
                onChangeText={t => setTripForm(f => ({ ...f, name: t }))}
                placeholder="Trip name (e.g. Italy Family Trip ✈️)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />
              {[
                { label: 'Destination', key: 'destination' as const, icon: 'location-outline',   placeholder: 'Rome & Florence, Italy' },
                { label: 'Cover Image', key: 'coverImage'  as const, icon: 'image-outline',      placeholder: 'Image URL (optional)'   },
              ].map(({ label, key, icon, placeholder }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={tripForm[key]}
                    onChangeText={t => setTripForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
              {/* Start date */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Start Date</Text>
                </View>
                <TouchableOpacity onPress={() => { setDateField(dateField === 'start' ? null : 'start'); setCalMonth(tripForm.startDate ? new Date(tripForm.startDate) : new Date()); }}>
                  <Text variant="body" weight="semibold" style={{ color: C.primary }}>
                    {tripForm.startDate ? fmtDateFull(tripForm.startDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
              {dateField === 'start' && DatePickerContent()}
              {/* End date */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>End Date</Text>
                </View>
                <TouchableOpacity onPress={() => { setDateField(dateField === 'end' ? null : 'end'); setCalMonth(tripForm.endDate ? new Date(tripForm.endDate) : new Date()); }}>
                  <Text variant="body" weight="semibold" style={{ color: C.primary }}>
                    {tripForm.endDate ? fmtDateFull(tripForm.endDate) : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
              {dateField === 'end' && DatePickerContent()}
              {/* Budget */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="cash-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Budget ($)</Text>
                </View>
                <TextInput
                  value={tripForm.budget}
                  onChangeText={t => setTripForm(f => ({ ...f, budget: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="Optional"
                  placeholderTextColor={tokens.textTertiary}
                  keyboardType="decimal-pad"
                  style={[styles.inlineInput, { color: tokens.text }]}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ ADD ITINERARY MODAL ══════ */}
      <Modal visible={itinModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeItinModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingItin && { opacity: 0.35 }]} onPress={closeItinModal} disabled={savingItin}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Add to Itinerary</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveItin} disabled={savingItin}>
              {savingItin ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Add</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <TextInput
                value={itinForm.activity}
                onChangeText={t => setItinForm(f => ({ ...f, activity: t }))}
                placeholder="Activity (e.g. Colosseum tour)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />
              {[
                { label: 'Day',      key: 'day'      as const, icon: 'today-outline',     placeholder: '1',           keyboardType: 'number-pad' as const },
                { label: 'Time',     key: 'time'     as const, icon: 'time-outline',      placeholder: '9:00 AM (optional)', keyboardType: 'default' as const  },
                { label: 'Location', key: 'location' as const, icon: 'location-outline',  placeholder: 'Optional',    keyboardType: 'default' as const  },
                { label: 'Notes',    key: 'notes'    as const, icon: 'document-text-outline', placeholder: 'Optional', keyboardType: 'default' as const },
              ].map(({ label, key, icon, placeholder, keyboardType }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={itinForm[key]}
                    onChangeText={t => setItinForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    keyboardType={keyboardType}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ MAIN CONTENT ══════ */}
      {isLoading ? (
        <View style={[styles.center, { paddingTop: insets.top + 80 }]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="body" secondary style={{ marginTop: 12 }}>Loading trips…</Text>
        </View>
      ) : trips.length === 0 ? (
        /* ── Empty state ── */
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 12, left: 20 }}>
            <Ionicons name="chevron-back" size={24} color={tokens.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 72 }}>✈️</Text>
          <Text variant="h3" weight="bold" style={{ color: tokens.text, marginTop: 20 }}>No trips yet</Text>
          <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Plan your next family adventure together
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: C.primary, marginTop: 32 }]}
            onPress={openCreateTrip}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text variant="body" weight="bold" style={{ color: '#fff', marginLeft: 8 }}>Plan a Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* ── Hero ── */}
          <View style={{ height: 280 }}>
            {selected?.coverImage ? (
              <Image source={{ uri: selected.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[C.primary, isDark ? '#001A2E' : '#0050A0']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
            <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              {selected && (
                <View>
                  <View style={[styles.statusBadge, { backgroundColor: C.primary + 'CC' }]}>
                    <Text variant="caption" weight="bold" style={{ color: '#fff' }}>
                      {statusLabel(tripStatus(selected))}
                    </Text>
                  </View>
                  <Text variant="h2" weight="black" style={{ color: '#fff', marginTop: 8 }}>{selected.name}</Text>
                  <View style={styles.tripMeta}>
                    <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>{selected.destination}</Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    {fmtDate(selected.startDate)} – {fmtDate(selected.endDate)} · {tripDays(selected)} days
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Trip selector ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 10 }}
            style={{ maxHeight: 72, flexGrow: 0 }}
          >
            {trips.map(trip => (
              <TouchableOpacity
                key={trip.id}
                onPress={() => setSelectedId(trip.id)}
                onLongPress={() => confirmDeleteTrip(trip)}
                style={[styles.tripChip, {
                  backgroundColor: selectedId === trip.id ? C.primary : tokens.card,
                  borderColor: selectedId === trip.id ? C.primary : tokens.border,
                }]}
              >
                <Text variant="bodySmall" weight="semibold" numberOfLines={1}
                  style={{ color: selectedId === trip.id ? '#fff' : tokens.text }}>
                  {trip.name.replace(/\s*[✈️🏖️🌍🗺️🏔️🎡]\s*$/, '').trim()}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.tripChip, { borderColor: C.primary, borderStyle: 'dashed', backgroundColor: 'transparent' }]}
              onPress={openCreateTrip}
            >
              <Ionicons name="add" size={16} color={C.primary} />
              <Text variant="bodySmall" weight="semibold" style={{ color: C.primary, marginLeft: 4 }}>New Trip</Text>
            </TouchableOpacity>
          </ScrollView>

          {selected && (
            <View style={{ paddingHorizontal: Spacing[4], gap: 20 }}>
              {/* Budget card */}
              {selected.budget != null && (
                <Card shadow="sm">
                  <View style={styles.budgetHeader}>
                    <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Budget 💰</Text>
                    <Text variant="h3" weight="black" style={{ color: C.primary }}>
                      ${selected.budget.toLocaleString()}
                    </Text>
                  </View>
                  <Text variant="bodySmall" secondary>Total trip budget</Text>
                </Card>
              )}

              {/* Itinerary */}
              <View>
                <View style={styles.sectionHeader}>
                  <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Itinerary 🗓️</Text>
                  <TouchableOpacity onPress={openAddItin}>
                    <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add day</Text>
                  </TouchableOpacity>
                </View>

                {selected.itinerary.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                    <Text style={{ fontSize: 24 }}>🗓️</Text>
                    <Text variant="bodySmall" secondary style={{ marginTop: 6 }}>No itinerary yet — tap "+ Add day"</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {selected.itinerary.map((item, i) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.85}
                        onLongPress={() => confirmDeleteItin(item)}
                      >
                        <View style={styles.itinRow}>
                          <View style={[styles.dayBubble, { backgroundColor: `${C.primary}18` }]}>
                            <Text variant="caption" weight="bold" style={{ color: C.primary }}>Day</Text>
                            <Text variant="h4" weight="black" style={{ color: C.primary }}>{item.day}</Text>
                          </View>
                          <View style={styles.itinLine}>
                            {i < selected.itinerary.length - 1 && (
                              <View style={[styles.connector, { backgroundColor: tokens.border }]} />
                            )}
                          </View>
                          <Card style={styles.itinCard} shadow="sm">
                            <View style={{ flex: 1 }}>
                              <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{item.activity}</Text>
                              {(item.time || item.location) && (
                                <Text variant="caption" secondary>
                                  {[item.time, item.location].filter(Boolean).join(' · ')}
                                </Text>
                              )}
                              {item.notes && <Text variant="caption" secondary>{item.notes}</Text>}
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={tokens.textTertiary} />
                          </Card>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Packing list */}
              <View style={{ marginBottom: 8 }}>
                <View style={styles.sectionHeader}>
                  <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Packing List 🧳</Text>
                  {selected.packingList.length > 0 && (
                    <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>
                      {selected.packingList.filter(p => p.packed).length}/{selected.packingList.length} packed
                    </Text>
                  )}
                </View>

                {/* Packing progress bar */}
                {selected.packingList.length > 0 && (
                  <ProgressBar
                    progress={Math.round((selected.packingList.filter(p => p.packed).length / selected.packingList.length) * 100)}
                    color={C.primary}
                    height={5}
                    style={{ marginBottom: 12 }}
                  />
                )}

                {/* Quick-add row */}
                <View style={[styles.packAddRow, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                  <TextInput
                    value={packInput}
                    onChangeText={setPackInput}
                    placeholder="Add item…"
                    placeholderTextColor={tokens.textTertiary}
                    style={[styles.packInput, { color: tokens.text }]}
                    onSubmitEditing={addPackingItem}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={addPackingItem}
                    disabled={packAdding || !packInput.trim()}
                    style={[styles.packAddBtn, { backgroundColor: packInput.trim() ? C.primary : tokens.border }]}
                  >
                    {packAdding
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Ionicons name="add" size={20} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>

                {selected.packingList.length === 0 ? (
                  <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                    <Text style={{ fontSize: 24 }}>🧳</Text>
                    <Text variant="bodySmall" secondary style={{ marginTop: 6 }}>No items yet — type above to add</Text>
                  </View>
                ) : (
                  <Card shadow="sm" padding={0}>
                    {selected.packingList.map((item, i) => {
                      const busy = toggling.has(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.packRow, i < selected.packingList.length - 1 && { borderBottomWidth: 1, borderBottomColor: tokens.border }]}
                          onPress={() => togglePacking(item)}
                          onLongPress={() => confirmDeletePacking(item)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.packCheck, {
                            borderColor:     item.packed ? Colors.success[500] : tokens.border,
                            backgroundColor: item.packed ? Colors.success[500] : 'transparent',
                          }]}>
                            {busy
                              ? <ActivityIndicator size="small" color={item.packed ? '#fff' : tokens.textTertiary} />
                              : item.packed && <Ionicons name="checkmark" size={12} color="#fff" />
                            }
                          </View>
                          <Text variant="body" weight="medium"
                            secondary={item.packed}
                            style={{ marginLeft: 12, flex: 1, textDecorationLine: item.packed ? 'line-through' : 'none', color: tokens.text }}>
                            {item.name}
                          </Text>
                          {item.qty > 1 && (
                            <Text variant="caption" secondary>×{item.qty}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </Card>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB (only when trips exist) */}
      {trips.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
          onPress={openCreateTrip}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroContent: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 20 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  tripMeta:    { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  tripChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },

  itinRow:  { flexDirection: 'row', alignItems: 'flex-start' },
  dayBubble:{ width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itinLine: { width: 20, alignItems: 'center' },
  connector:{ width: 2, flex: 1, marginVertical: 4 },
  itinCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },

  packAddRow: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.xl, borderWidth: 1.5, overflow: 'hidden', marginBottom: 10 },
  packInput:  { flex: 1, height: 46, paddingHorizontal: 14, fontSize: 15 },
  packAddBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  packRow:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  packCheck:  { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  emptyBox: { borderRadius: BorderRadius.xl, padding: 20, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  createBtn:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.xl },

  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10,
  },

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

  miniCal:   { borderRadius: BorderRadius.xl, borderWidth: 1, padding: 12, marginBottom: 8 },
  calNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
});
