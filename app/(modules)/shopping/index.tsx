import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
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

const C = ModuleColors.shopping;

// ── Constants ──────────────────────────────────────────────────────────────
const PRESET_CATEGORIES = [
  'Produce', 'Dairy', 'Meat', 'Bakery',
  'Snacks', 'Beverages', 'Household', 'Other',
];

const EMOJI_PRESETS = [
  '🛒','🍎','🍌','🍅','🥦','🥕','🫑','🥑','🍇',
  '🥛','🧀','🥚','🍗','🥩','🐟','🍞','🥐',
  '🍺','🥤','☕','🍫','🍪','🧴','🧹','🧻','🧺',
];

// ── Types ──────────────────────────────────────────────────────────────────
interface ShoppingItem {
  id: string; name: string; quantity: number;
  unit?: string; category?: string;
  checked: boolean; emoji?: string;
  listId: string; addedBy: string;
}
interface ShoppingList {
  id: string; name: string; items: ShoppingItem[];
}
interface ItemForm {
  name: string; quantity: string;
  unit: string; category: string; emoji: string;
}
const DEFAULT_FORM: ItemForm = { name: '', quantity: '1', unit: '', category: '', emoji: '🛒' };

// ── Screen ─────────────────────────────────────────────────────────────────
export default function ShoppingScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user     = useAuthStore(s => s.user);
  const qc       = useQueryClient();

  // Quick-add
  const [quickInput,  setQuickInput]  = useState('');
  const [quickAdding, setQuickAdding] = useState(false);

  // Category filter (derived from real items)
  const [catFilter, setCatFilter] = useState('All');

  // Create/Edit modal
  const [modal,    setModal]    = useState(false);
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null);
  const [form,     setForm]     = useState<ItemForm>(DEFAULT_FORM);
  const [saving,   setSaving]   = useState(false);

  // In-flight state
  const [toggling, setToggling] = useState<string | null>(null);
  const [qtyBusy,  setQtyBusy]  = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const { data: list, isLoading } = useQuery<ShoppingList>({
    queryKey: ['shopping-list'],
    queryFn:  async () => { const r = await api.get('/shopping/list'); return r.data.data; },
    enabled:  !!user?.familyId,
  });

  const items   = list?.items ?? [];
  const checked = items.filter(i => i.checked).length;

  // Category chips — only show categories that appear in the list
  const usedCats: string[] = ['All'];
  for (const c of PRESET_CATEGORIES) {
    if (items.some(i => i.category === c)) usedCats.push(c);
  }
  for (const item of items) {
    if (item.category && !PRESET_CATEGORIES.includes(item.category) && !usedCats.includes(item.category)) {
      usedCats.push(item.category);
    }
  }

  const filtered  = catFilter === 'All' ? items : items.filter(i => i.category === catFilter);
  const unchecked = filtered.filter(i => !i.checked);
  const inCart    = filtered.filter(i => i.checked);

  // ── Quick add ────────────────────────────────────────────────────────────
  async function quickAdd() {
    const name = quickInput.trim();
    if (!name) return;
    setQuickAdding(true);
    try {
      await api.post('/shopping/items', { name, quantity: 1, emoji: '🛒' });
      qc.invalidateQueries({ queryKey: ['shopping-list'] });
      setQuickInput('');
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setQuickAdding(false);
    }
  }

  // ── Toggle ───────────────────────────────────────────────────────────────
  async function toggleItem(item: ShoppingItem) {
    if (toggling === item.id) return;
    setToggling(item.id);
    try {
      await api.patch(`/shopping/items/${item.id}`, { checked: !item.checked });
      qc.invalidateQueries({ queryKey: ['shopping-list'] });
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setToggling(null);
    }
  }

  // ── Qty ──────────────────────────────────────────────────────────────────
  async function changeQty(item: ShoppingItem, delta: number) {
    const next = Math.max(1, item.quantity + delta);
    if (next === item.quantity || qtyBusy === item.id) return;
    setQtyBusy(item.id);
    try {
      await api.patch(`/shopping/items/${item.id}`, { quantity: next });
      qc.invalidateQueries({ queryKey: ['shopping-list'] });
    } catch (err) {
      toast.error(parseApiError(err));
    } finally {
      setQtyBusy(null);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  function confirmDelete(item: ShoppingItem) {
    Alert.alert('Remove Item', `Remove "${item.name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/shopping/items/${item.id}`);
          qc.invalidateQueries({ queryKey: ['shopping-list'] });
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Clear checked ─────────────────────────────────────────────────────────
  function confirmClearChecked() {
    Alert.alert('Clear Cart', 'Remove all checked items from the list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        setClearing(true);
        try {
          await api.delete('/shopping/list/checked');
          qc.invalidateQueries({ queryKey: ['shopping-list'] });
        } catch (err) { toast.error(parseApiError(err)); }
        finally { setClearing(false); }
      }},
    ]);
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditItem(null);
    setForm(DEFAULT_FORM);
    setModal(true);
  }
  function openEdit(item: ShoppingItem) {
    setEditItem(item);
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit ?? '', category: item.category ?? '', emoji: item.emoji ?? '🛒' });
    setModal(true);
  }
  function closeModal() {
    if (saving) return;
    setModal(false);
    setEditItem(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveItem() {
    if (!form.name.trim()) { Alert.alert('Required', 'Enter an item name.'); return; }
    const qty = parseInt(form.quantity, 10);
    setSaving(true);
    try {
      const payload = {
        name:     form.name.trim(),
        quantity: qty > 0 ? qty : 1,
        unit:     form.unit.trim() || undefined,
        category: form.category || undefined,
        emoji:    form.emoji || '🛒',
      };
      if (editItem) {
        await api.patch(`/shopping/items/${editItem.id}`, payload);
      } else {
        await api.post('/shopping/items', payload);
      }
      qc.invalidateQueries({ queryKey: ['shopping-list'] });
      closeModal();
      toast.success(editItem ? 'Item updated' : 'Item added');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }

  // ── Item row (plain function — no component boundary) ─────────────────────
  function ItemRow(item: ShoppingItem) {
    const busy  = toggling === item.id;
    const qbusy = qtyBusy  === item.id;
    return (
      <Card key={item.id} style={styles.itemCard} shadow="sm">
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => toggleItem(item)}
          style={[styles.checkbox, {
            borderColor:     item.checked ? Colors.success[500] : tokens.border,
            backgroundColor: item.checked ? Colors.success[500] : 'transparent',
          }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {busy
            ? <ActivityIndicator size="small" color={item.checked ? '#fff' : tokens.textTertiary} />
            : item.checked && <Ionicons name="checkmark" size={14} color="#fff" />
          }
        </TouchableOpacity>

        {/* Emoji */}
        <Text style={{ fontSize: 22, marginHorizontal: 8 }}>{item.emoji ?? '🛒'}</Text>

        {/* Name + meta — tap to edit */}
        <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(item)} activeOpacity={0.7}>
          <Text
            variant="body" weight="medium"
            style={item.checked ? { textDecorationLine: 'line-through' } : undefined}
            secondary={item.checked}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {(item.unit || item.category) && (
            <Text variant="caption" secondary numberOfLines={1}>
              {[item.unit, item.category].filter(Boolean).join(' · ')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Qty stepper */}
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: tokens.border }]}
            onPress={() => changeQty(item, -1)}
            disabled={!!qbusy || item.quantity <= 1}
          >
            <Text style={{ color: item.quantity <= 1 ? tokens.textTertiary : tokens.text }}>−</Text>
          </TouchableOpacity>
          {qbusy
            ? <ActivityIndicator size="small" color={C.primary} style={{ width: 28 }} />
            : <Text variant="body" weight="bold" style={{ width: 28, textAlign: 'center', color: tokens.text }}>
                {item.quantity}
              </Text>
          }
          <TouchableOpacity
            style={[styles.stepBtn, { borderColor: tokens.border }]}
            onPress={() => changeQty(item, +1)}
            disabled={!!qbusy}
          >
            <Text style={{ color: tokens.text }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Delete */}
        <TouchableOpacity onPress={() => confirmDelete(item)} style={{ padding: 4, marginLeft: 4 }}>
          <Ionicons name="trash-outline" size={18} color={tokens.textTertiary} />
        </TouchableOpacity>
      </Card>
    );
  }

  // ── No family guard ───────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Ionicons name="cart-outline" size={64} color={tokens.textTertiary} />
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to share a shopping list.
        </Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ CREATE / EDIT MODAL ══════ */}
      <Modal visible={modal} animationType="slide" onRequestClose={closeModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8,
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, saving && { opacity: 0.35 }]} onPress={closeModal} disabled={saving}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
              {editItem ? 'Edit Item' : 'Add Item'}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveItem} disabled={saving}>
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
              {/* Emoji picker */}
              <View style={[styles.emojiSection, { borderBottomColor: tokens.border }]}>
                <Text style={{ fontSize: 44, textAlign: 'center' }}>{form.emoji || '🛒'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingTop: 12, paddingBottom: 4 }}>
                  {EMOJI_PRESETS.map(e => (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setForm(f => ({ ...f, emoji: e }))}
                      style={[styles.emojiChip, {
                        backgroundColor: form.emoji === e ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     form.emoji === e ? C.primary : tokens.border,
                      }]}
                    >
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Name */}
              <TextInput
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
                placeholder="Item name (e.g. Organic Milk)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus={!editItem}
              />

              {/* Quantity */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="layers-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Quantity</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: tokens.border }]}
                    onPress={() => setForm(f => ({ ...f, quantity: String(Math.max(1, parseInt(f.quantity || '1', 10) - 1)) }))}
                  >
                    <Text style={{ color: tokens.text }}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={form.quantity}
                    onChangeText={t => setForm(f => ({ ...f, quantity: t.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    style={[styles.qtyInput, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                    maxLength={3}
                  />
                  <TouchableOpacity
                    style={[styles.stepBtn, { borderColor: tokens.border }]}
                    onPress={() => setForm(f => ({ ...f, quantity: String(parseInt(f.quantity || '1', 10) + 1) }))}
                  >
                    <Text style={{ color: tokens.text }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Unit */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="resize-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Unit</Text>
                </View>
                <TextInput
                  value={form.unit}
                  onChangeText={t => setForm(f => ({ ...f, unit: t }))}
                  placeholder="kg, pcs, bottles…"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.inlineInput, { color: tokens.text }]}
                  returnKeyType="done"
                />
              </View>

              {/* Category */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {PRESET_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, {
                        backgroundColor: form.category === cat ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     form.category === cat ? C.primary : tokens.border,
                      }]}
                      onPress={() => setForm(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                    >
                      <Text
                        variant="bodySmall"
                        weight={form.category === cat ? 'bold' : 'regular'}
                        style={{ color: form.category === cat ? C.primary : tokens.textSecondary }}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Delete button (edit mode) */}
              {editItem && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: Colors.error[500] }]}
                  onPress={() => { closeModal(); setTimeout(() => confirmDelete(editItem), 300); }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error[500]} />
                  <Text variant="body" weight="semibold" style={{ color: Colors.error[500], marginLeft: 8 }}>
                    Remove from list
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
      <LinearGradient
        colors={isDark ? ['#003320', '#0A0A1A'] : ['#ECFDF5', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Shopping List</Text>
            <Text variant="caption" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {isLoading ? 'Loading…' : `${checked}/${items.length} items checked`}
            </Text>
          </View>
          <TouchableOpacity style={[styles.addFab, { backgroundColor: C.primary }]} onPress={openCreate}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick-add input */}
        <View style={[styles.addRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: tokens.border }]}>
          <TextInput
            style={[styles.addInput, { color: tokens.text }]}
            placeholder="Quick add item…"
            placeholderTextColor={tokens.textTertiary}
            value={quickInput}
            onChangeText={setQuickInput}
            onSubmitEditing={quickAdd}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={quickAdd}
            disabled={quickAdding || !quickInput.trim()}
            style={[styles.addBtn, { backgroundColor: quickInput.trim() ? C.primary : tokens.border }]}
          >
            {quickAdding
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-forward" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>

        {/* Clear checked */}
        {checked > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={confirmClearChecked} disabled={clearing}>
            {clearing
              ? <ActivityIndicator size="small" color={Colors.error[500]} />
              : <Ionicons name="trash-outline" size={15} color={Colors.error[500]} />
            }
            <Text variant="caption" weight="semibold" style={{ color: Colors.error[500], marginLeft: 6 }}>
              Clear {checked} checked {checked === 1 ? 'item' : 'items'}
            </Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ══════ CATEGORY FILTER ══════ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}
        style={{ maxHeight: 52, flexGrow: 0 }}
      >
        {usedCats.map(cat => (
          <Chip key={cat} label={cat} selected={catFilter === cat} onPress={() => setCatFilter(cat)} color={C.primary} />
        ))}
      </ScrollView>

      {/* ══════ LIST ══════ */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text variant="body" secondary style={{ marginTop: 12 }}>Loading list…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 40, gap: 8 }}>
          {unchecked.length === 0 && inCart.length === 0 && (
            <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
              <Text style={{ fontSize: 36 }}>🛒</Text>
              <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 12 }}>
                Your list is empty
              </Text>
              <Text variant="bodySmall" secondary style={{ marginTop: 4, textAlign: 'center' }}>
                Type above to quick-add, or tap + for details
              </Text>
            </View>
          )}

          {unchecked.map(item => ItemRow(item))}

          {inCart.length > 0 && (
            <>
              <View style={styles.sectionDivider}>
                <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
                <Text variant="caption" weight="bold" style={{ color: tokens.textSecondary, marginHorizontal: 12 }}>
                  IN CART ({inCart.length})
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
              </View>
              {inCart.map(item => ItemRow(item))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:    { paddingHorizontal: Spacing[4], paddingBottom: Spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  addFab:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.xl, borderWidth: 1.5, overflow: 'hidden' },
  addInput:  { flex: 1, height: 48, paddingHorizontal: 16, fontSize: 15 },
  addBtn:    { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  clearBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12 },

  // Item card
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepper:  { flexDirection: 'row', alignItems: 'center' },
  stepBtn:  { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Divider
  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine:    { flex: 1, height: 1 },

  // Empty state
  emptyBox: {
    borderRadius: BorderRadius.xl, padding: 36,
    alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', marginTop: 20,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:   { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:   { padding: 20, paddingBottom: 60 },
  titleInput: { fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  formRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:    { flexDirection: 'row', alignItems: 'center' },
  rowLabel:   { marginLeft: 12, fontSize: 15 },
  inlineInput:{ flex: 1, textAlign: 'right', fontSize: 15 },
  qtyInput:   { width: 56, textAlign: 'center', fontSize: 18, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingVertical: 6 },

  // Emoji
  emojiSection: { alignItems: 'center', paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  emojiChip:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  // Category
  section:      { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel: { color: '#888', marginBottom: 10, fontSize: 11, letterSpacing: 0.8 },
  catChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 14, borderRadius: BorderRadius.xl, borderWidth: 1.5 },
});
