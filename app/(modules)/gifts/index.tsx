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
import { Text, Card, Badge, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.gifts;

// ── Types ──────────────────────────────────────────────────────────────────
type GiftStatus = 'IDEA' | 'BOUGHT' | 'WRAPPED';

interface GiftItem {
  id: string; name: string; price: number; store?: string;
  emoji?: string; status: GiftStatus; url?: string; notes?: string;
  occasionId: string;
}
interface GiftOccasion {
  id: string; name: string; date: string; budget: number;
  familyId: string; gifts: GiftItem[];
}

interface OccasionForm { name: string; date: string; budget: string; }
interface GiftForm     { name: string; price: string; store: string; emoji: string; notes: string; }

const DEFAULT_OCCASION: OccasionForm = { name: '', date: '', budget: '' };
const DEFAULT_GIFT:     GiftForm     = { name: '', price: '', store: '', emoji: '🎁', notes: '' };

const STATUS_CONFIG: Record<GiftStatus, { label: string; color: string; bg: string; next: GiftStatus }> = {
  IDEA:    { label: 'Idea',    color: Colors.primary[500], bg: Colors.primary[50],  next: 'BOUGHT'  },
  BOUGHT:  { label: 'Bought',  color: Colors.success[600], bg: Colors.success[50],  next: 'WRAPPED' },
  WRAPPED: { label: 'Wrapped', color: '#8B5CF6',           bg: '#EDE9FE',           next: 'IDEA'    },
};

const GIFT_EMOJIS = ['🎁','🎮','📚','👗','👟','🍫','🌹','🎨','🎵','💍','🏅','✈️','🧸','📱','🎧','🍾'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function GiftsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Occasion CRUD
  const [occasionModal,  setOccasionModal]  = useState(false);
  const [editOccasion,   setEditOccasion]   = useState<GiftOccasion | null>(null);
  const [occasionForm,   setOccasionForm]   = useState<OccasionForm>(DEFAULT_OCCASION);
  const [savingOccasion, setSavingOccasion] = useState(false);

  // Gift CRUD
  const [giftModal,  setGiftModal]  = useState(false);
  const [editGift,   setEditGift]   = useState<GiftItem | null>(null);
  const [giftForm,   setGiftForm]   = useState<GiftForm>(DEFAULT_GIFT);
  const [savingGift, setSavingGift] = useState(false);
  const [cyclingId,  setCyclingId]  = useState<string | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────
  const { data: occasions = [], isLoading } = useQuery<GiftOccasion[]>({
    queryKey: ['giftOccasions'],
    queryFn:  async () => { const r = await api.get('/gifts/occasions'); return r.data.data; },
    enabled:  !!user?.familyId,
    onSuccess: (data: GiftOccasion[]) => {
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      if (selectedId && !data.find((o: GiftOccasion) => o.id === selectedId) && data.length > 0) {
        setSelectedId(data[0].id);
      }
    },
  });

  const occasion = occasions.find(o => o.id === selectedId) ?? null;
  const gifts    = occasion?.gifts ?? [];
  const bought   = gifts.filter(g => g.status !== 'IDEA');
  const spent    = bought.reduce((s, g) => s + g.price, 0);
  const total    = gifts.reduce((s, g) => s + g.price, 0);

  // ── Occasion CRUD ──────────────────────────────────────────────────────────
  function openCreateOccasion() { setEditOccasion(null); setOccasionForm(DEFAULT_OCCASION); setOccasionModal(true); }
  function openEditOccasion(o: GiftOccasion) {
    setEditOccasion(o);
    setOccasionForm({ name: o.name, date: o.date.slice(0, 10), budget: String(o.budget) });
    setOccasionModal(true);
  }
  function closeOccasionModal() { if (savingOccasion) return; setOccasionModal(false); }

  async function saveOccasion() {
    if (!occasionForm.name.trim()) { Alert.alert('Required', 'Enter an occasion name.'); return; }
    if (!occasionForm.date)        { Alert.alert('Required', 'Enter a date.'); return; }
    setSavingOccasion(true);
    try {
      const body = {
        name:   occasionForm.name.trim(),
        date:   occasionForm.date,
        budget: occasionForm.budget ? parseFloat(occasionForm.budget) : 0,
      };
      if (editOccasion) {
        await api.patch(`/gifts/occasions/${editOccasion.id}`, body);
        toast.success('Occasion updated');
      } else {
        const r = await api.post('/gifts/occasions', body);
        setSelectedId(r.data.data.id);
        toast.success('Occasion added!');
      }
      qc.invalidateQueries({ queryKey: ['giftOccasions'] });
      closeOccasionModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingOccasion(false); }
  }

  function confirmDeleteOccasion(o: GiftOccasion) {
    Alert.alert('Delete Occasion', `Delete "${o.name}" and all its gifts?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/gifts/occasions/${o.id}`);
          qc.invalidateQueries({ queryKey: ['giftOccasions'] });
          toast.success('Occasion deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Gift CRUD ──────────────────────────────────────────────────────────────
  function openAddGift() { setEditGift(null); setGiftForm(DEFAULT_GIFT); setGiftModal(true); }
  function openEditGift(g: GiftItem) {
    setEditGift(g);
    setGiftForm({ name: g.name, price: String(g.price), store: g.store ?? '', emoji: g.emoji ?? '🎁', notes: g.notes ?? '' });
    setGiftModal(true);
  }
  function closeGiftModal() { if (savingGift) return; setGiftModal(false); }

  async function saveGift() {
    if (!giftForm.name.trim()) { Alert.alert('Required', 'Enter a gift name.'); return; }
    setSavingGift(true);
    try {
      const body = {
        name:  giftForm.name.trim(),
        price: giftForm.price ? parseFloat(giftForm.price) : 0,
        store: giftForm.store.trim() || undefined,
        emoji: giftForm.emoji || undefined,
        notes: giftForm.notes.trim() || undefined,
      };
      if (editGift) {
        await api.patch(`/gifts/items/${editGift.id}`, body);
        toast.success('Gift updated');
      } else {
        await api.post(`/gifts/occasions/${occasion!.id}/gifts`, body);
        toast.success('Gift added!');
      }
      qc.invalidateQueries({ queryKey: ['giftOccasions'] });
      closeGiftModal();
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingGift(false); }
  }

  async function cycleStatus(gift: GiftItem) {
    if (cyclingId === gift.id) return;
    setCyclingId(gift.id);
    try {
      await api.patch(`/gifts/items/${gift.id}/cycle`);
      qc.invalidateQueries({ queryKey: ['giftOccasions'] });
    } catch (err) { toast.error(parseApiError(err)); }
    finally { setCyclingId(null); }
  }

  function confirmDeleteGift(g: GiftItem) {
    Alert.alert('Remove Gift', `Remove "${g.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/gifts/items/${g.id}`);
          qc.invalidateQueries({ queryKey: ['giftOccasions'] });
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── No family guard ────────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Text style={{ fontSize: 64 }}>🎁</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to track gifts.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ OCCASION MODAL ══════ */}
      <Modal visible={occasionModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeOccasionModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingOccasion && { opacity: 0.35 }]} onPress={closeOccasionModal} disabled={savingOccasion}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editOccasion ? 'Edit Occasion' : 'New Occasion'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveOccasion} disabled={savingOccasion}>
              {savingOccasion ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              <TextInput
                value={occasionForm.name}
                onChangeText={t => setOccasionForm(f => ({ ...f, name: t }))}
                placeholder="Occasion name (e.g. Emma's Birthday 🎂)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />
              {[
                { label: 'Date',   key: 'date'   as const, icon: 'calendar-outline', placeholder: 'YYYY-MM-DD',      keyboard: 'default'          as const },
                { label: 'Budget', key: 'budget' as const, icon: 'cash-outline',     placeholder: '$ Gift budget',   keyboard: 'decimal-pad'      as const },
              ].map(({ label, key, icon, placeholder, keyboard }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={occasionForm[key]}
                    onChangeText={t => setOccasionForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    keyboardType={keyboard}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ GIFT MODAL ══════ */}
      <Modal visible={giftModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeGiftModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}>
            <TouchableOpacity style={[styles.modalBtn, savingGift && { opacity: 0.35 }]} onPress={closeGiftModal} disabled={savingGift}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{editGift ? 'Edit Gift' : 'Add Gift'}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveGift} disabled={savingGift}>
              {savingGift ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag">
              {/* Emoji */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {GIFT_EMOJIS.map(e => (
                  <TouchableOpacity key={e}
                    onPress={() => setGiftForm(f => ({ ...f, emoji: e }))}
                    style={[styles.emojiBtn, {
                      backgroundColor: giftForm.emoji === e ? C.primary + '22' : tokens.surfaceAlt,
                      borderColor:     giftForm.emoji === e ? C.primary : 'transparent',
                    }]}>
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={giftForm.name}
                onChangeText={t => setGiftForm(f => ({ ...f, name: t }))}
                placeholder="Gift name"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />
              {[
                { label: 'Price',    key: 'price' as const, icon: 'cash-outline',        placeholder: '0.00',            keyboard: 'decimal-pad' as const },
                { label: 'Store',    key: 'store' as const, icon: 'storefront-outline',  placeholder: 'Amazon, Target…', keyboard: 'default'     as const },
                { label: 'Notes',    key: 'notes' as const, icon: 'document-text-outline', placeholder: 'Size, color…',  keyboard: 'default'     as const },
              ].map(({ label, key, icon, placeholder, keyboard }) => (
                <View key={key} style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                  <View style={styles.rowLeft}>
                    <Ionicons name={icon as any} size={20} color={tokens.textSecondary} />
                    <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>{label}</Text>
                  </View>
                  <TextInput
                    value={giftForm[key]}
                    onChangeText={t => setGiftForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={tokens.textTertiary}
                    keyboardType={keyboard}
                    style={[styles.inlineInput, { color: tokens.text }]}
                  />
                </View>
              ))}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>🎁 Gifts</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
              {occasions.length} upcoming {occasions.length === 1 ? 'occasion' : 'occasions'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.newOccasionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#fff' }]}
            onPress={openCreateOccasion}>
            <Ionicons name="add" size={18} color={C.primary} />
            <Text variant="bodySmall" weight="semibold" style={{ color: C.primary, marginLeft: 4 }}>Occasion</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatPill emoji="🎁" label={`${gifts.length} gifts`}     isDark={isDark} />
          <StatPill emoji="✅" label={`${bought.length} bought`}   isDark={isDark} />
          <StatPill emoji="💰" label={`$${total.toFixed(0)} total`} isDark={isDark} />
        </View>
      </LinearGradient>

      {/* Occasion selector */}
      {occasions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 82, borderBottomWidth: 1, borderBottomColor: tokens.border }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          {occasions.map(o => {
            const days = daysUntil(o.date);
            return (
              <TouchableOpacity key={o.id}
                onPress={() => setSelectedId(o.id)}
                onLongPress={() => Alert.alert(o.name, 'What would you like to do?', [
                  { text: 'Edit',   onPress: () => openEditOccasion(o) },
                  { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteOccasion(o) },
                  { text: 'Cancel', style: 'cancel' },
                ])}
                style={[styles.occasionChip, {
                  backgroundColor: selectedId === o.id ? C.primary : tokens.card,
                  borderColor:     selectedId === o.id ? C.primary : tokens.border,
                }]}>
                <Text variant="bodySmall" weight="bold" numberOfLines={1}
                  style={{ color: selectedId === o.id ? '#fff' : tokens.text }}>{o.name}</Text>
                <Text variant="caption"
                  style={{ color: selectedId === o.id ? 'rgba(255,255,255,0.75)' : tokens.textSecondary }}>
                  {fmtDate(o.date)} · {days >= 0 ? `${days}d` : 'Past'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Body */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : occasions.length === 0 ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ fontSize: 72 }}>🎁</Text>
          <Text variant="h3" weight="bold" style={{ color: tokens.text, marginTop: 20 }}>No occasions yet</Text>
          <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Add birthdays, holidays, and other gift occasions
          </Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: C.primary, marginTop: 32 }]}
            onPress={openCreateOccasion}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text variant="body" weight="bold" style={{ color: '#fff', marginLeft: 8 }}>Add Occasion</Text>
          </TouchableOpacity>
        </View>
      ) : occasion ? (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 16, paddingBottom: 100 }}>
          {/* Budget card */}
          {occasion.budget > 0 && (
            <Card shadow="sm" style={{ padding: 16 }}>
              <View style={styles.budgetHeader}>
                <Text variant="h4" weight="bold" style={{ color: tokens.text }}>{occasion.name}</Text>
                {(() => {
                  const days = daysUntil(occasion.date);
                  return <Badge label={days >= 0 ? `${days} days` : 'Past'} variant={days < 30 && days >= 0 ? 'warning' : 'primary'} />;
                })()}
              </View>
              <View style={styles.budgetRow}>
                <Text variant="body" secondary>Budget</Text>
                <Text variant="body" weight="bold" style={{ color: tokens.text }}>
                  ${spent.toFixed(0)} / ${occasion.budget.toFixed(0)}
                </Text>
              </View>
              <ProgressBar
                progress={occasion.budget > 0 ? Math.min(100, Math.round((spent / occasion.budget) * 100)) : 0}
                color={C.primary}
                height={6}
                style={{ marginTop: 8 }}
              />
              <Text variant="caption" secondary style={{ marginTop: 4 }}>
                ${Math.max(0, occasion.budget - spent).toFixed(0)} remaining
              </Text>
            </Card>
          )}

          {/* Gift list */}
          <View style={styles.listHeader}>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Gift Ideas</Text>
            <TouchableOpacity style={[styles.addGiftBtn, { borderColor: C.primary }]} onPress={openAddGift}>
              <Ionicons name="add" size={16} color={C.primary} />
              <Text variant="bodySmall" weight="semibold" style={{ color: C.primary, marginLeft: 4 }}>Add Gift</Text>
            </TouchableOpacity>
          </View>

          {gifts.length === 0 ? (
            <TouchableOpacity onPress={openAddGift}>
              <Card shadow="sm" style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🎁</Text>
                <Text variant="body" secondary>No gift ideas yet — tap to add</Text>
              </Card>
            </TouchableOpacity>
          ) : (
            gifts.map(gift => {
              const sc   = STATUS_CONFIG[gift.status];
              const busy = cyclingId === gift.id;
              return (
                <TouchableOpacity key={gift.id}
                  onPress={() => cycleStatus(gift)}
                  onLongPress={() => Alert.alert(gift.name, 'What would you like to do?', [
                    { text: 'Edit',   onPress: () => openEditGift(gift) },
                    { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteGift(gift) },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                  activeOpacity={0.8}>
                  <Card shadow="sm" style={styles.giftCard}>
                    <View style={[styles.giftEmoji, { backgroundColor: sc.bg }]}>
                      <Text style={{ fontSize: 22 }}>{gift.emoji ?? '🎁'}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="body" weight="semibold" numberOfLines={1} style={{ color: tokens.text }}>{gift.name}</Text>
                      {gift.store && <Text variant="caption" secondary>{gift.store}</Text>}
                      {gift.notes && <Text variant="caption" secondary numberOfLines={1}>{gift.notes}</Text>}
                      <Text variant="body" weight="bold" style={{ color: C.primary, marginTop: 2 }}>
                        ${gift.price.toFixed(2)}
                      </Text>
                    </View>
                    {busy
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : (
                        <TouchableOpacity onPress={() => cycleStatus(gift)}
                          style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                          <Text variant="caption" weight="bold" style={{ color: sc.color }}>{sc.label}</Text>
                        </TouchableOpacity>
                      )
                    }
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : null}

      {/* FAB */}
      {occasions.length > 0 && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
          onPress={openAddGift}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatPill({ emoji, label, isDark }: { emoji: string; label: string; isDark: boolean }) {
  return (
    <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text variant="bodySmall" weight="semibold" style={{ marginLeft: 6, color: isDark ? '#fff' : '#111' }}>{label}</Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  newOccasionBtn:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full },
  statsRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  statPill:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full },
  occasionChip:  { paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.xl, borderWidth: 1.5, minWidth: 120 },
  budgetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  listHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addGiftBtn:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6 },
  giftCard:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  giftEmoji:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  createBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: BorderRadius.xl },
  fab:           { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  // Modal
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalBtn:     { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:     { padding: 20, paddingBottom: 60 },
  titleInput:   { fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  emojiBtn:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  formRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:      { flexDirection: 'row', alignItems: 'center' },
  rowLabel:     { marginLeft: 12, fontSize: 15 },
  inlineInput:  { flex: 1, textAlign: 'right', fontSize: 15 },
});
