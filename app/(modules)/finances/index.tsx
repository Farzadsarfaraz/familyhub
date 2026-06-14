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
import { Text, Card, Chip, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.finances;

// ── Constants ──────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LETTERS = ['M','T','W','T','F','S','S'];

const CATEGORIES = ['FOOD','TRANSPORT','HEALTH','EDUCATION','ENTERTAINMENT','UTILITIES','CLOTHING','SAVINGS','OTHER'] as const;
type FinanceCategory = typeof CATEGORIES[number];

const CAT_EMOJI: Record<string, string> = {
  FOOD:'🛒', TRANSPORT:'🚗', HEALTH:'💊', EDUCATION:'🎓',
  ENTERTAINMENT:'🎬', UTILITIES:'⚡', CLOTHING:'👗', SAVINGS:'💰', OTHER:'💳',
};
const CAT_LABEL: Record<string, string> = {
  FOOD:'Food', TRANSPORT:'Transport', HEALTH:'Health', EDUCATION:'Education',
  ENTERTAINMENT:'Entertainment', UTILITIES:'Utilities', CLOTHING:'Clothing', SAVINGS:'Savings', OTHER:'Other',
};

// ── Utilities ──────────────────────────────────────────────────────────────
function fmtMonth(str: string): string {
  const [y, m] = str.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function fmtDisplayDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function progressColor(pct: number): string {
  if (pct >= 90) return Colors.error[500];
  if (pct >= 70) return Colors.warning[500];
  return Colors.success[500];
}

// ── Types ──────────────────────────────────────────────────────────────────
type TxType = 'INCOME' | 'EXPENSE';
type Tab = 'overview' | 'expenses' | 'budgets' | 'savings';

interface Transaction {
  id: string; title: string; amount: number; type: TxType;
  category: FinanceCategory; date: string; note?: string;
}
interface Budget { id: string; category: FinanceCategory; limit: number; spent: number; month: string; }
interface SavingsGoal {
  id: string; name: string; targetAmount: number; savedAmount: number;
  targetDate?: string; emoji?: string;
}
interface Summary { income: number; expense: number; balance: number; transactionCount: number; }

interface TxForm {
  title: string; amount: string; type: TxType;
  category: FinanceCategory; date: string; note: string;
}
const DEFAULT_TX: TxForm = {
  title: '', amount: '', type: 'EXPENSE',
  category: 'OTHER', date: todayStr(), note: '',
};
interface BudgetForm { category: FinanceCategory; limit: string; }
const DEFAULT_BUDGET: BudgetForm = { category: 'FOOD', limit: '' };
interface GoalForm { name: string; targetAmount: string; emoji: string; targetDate: string; }
const DEFAULT_GOAL: GoalForm = { name: '', targetAmount: '', emoji: '🎯', targetDate: '' };

// ── Screen ──────────────────────────────────────────────────────────────────
export default function FinancesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  // Month navigation
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  function prevMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(d.toISOString().slice(0, 7));
  }
  function nextMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    setMonth(d.toISOString().slice(0, 7));
  }

  // Active tab
  const [tab, setTab] = useState<Tab>('overview');

  // Transaction modal
  const [txModal,   setTxModal]   = useState(false);
  const [txForm,    setTxForm]    = useState<TxForm>(DEFAULT_TX);
  const [savingTx,  setSavingTx]  = useState(false);
  const [txDateOpen, setTxDateOpen] = useState(false);
  const [txCalMonth, setTxCalMonth] = useState(() => new Date());

  // Budget modal
  const [budgetModal,   setBudgetModal]   = useState(false);
  const [budgetForm,    setBudgetForm]    = useState<BudgetForm>(DEFAULT_BUDGET);
  const [savingBudget,  setSavingBudget]  = useState(false);

  // Savings goal modal
  const [goalModal,   setGoalModal]   = useState(false);
  const [goalForm,    setGoalForm]    = useState<GoalForm>(DEFAULT_GOAL);
  const [savingGoal,  setSavingGoal]  = useState(false);

  // Contribution modal
  const [contribGoal,   setContribGoal]   = useState<SavingsGoal | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [savingContrib, setSavingContrib] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const enabled = !!user?.familyId;

  const { data: summary, isLoading: summaryLoading } = useQuery<Summary>({
    queryKey: ['fin-summary', month],
    queryFn:  async () => { const r = await api.get(`/finances/summary?month=${month}`); return r.data.data; },
    enabled,
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', month],
    queryFn:  async () => { const r = await api.get(`/finances/transactions?month=${month}`); return r.data.data; },
    enabled,
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ['budgets', month],
    queryFn:  async () => { const r = await api.get(`/finances/budgets?month=${month}`); return r.data.data; },
    enabled,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery<SavingsGoal[]>({
    queryKey: ['savings-goals'],
    queryFn:  async () => { const r = await api.get('/finances/savings'); return r.data.data; },
    enabled,
  });

  // Compute spent per category from real transactions
  function spentFor(cat: FinanceCategory): number {
    return transactions
      .filter(t => t.type === 'EXPENSE' && t.category === cat)
      .reduce((s, t) => s + t.amount, 0);
  }

  // ── Delete transaction ────────────────────────────────────────────────────
  function confirmDeleteTx(tx: Transaction) {
    Alert.alert('Delete Transaction', `Delete "${tx.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/finances/transactions/${tx.id}`);
          qc.invalidateQueries({ queryKey: ['transactions', month] });
          qc.invalidateQueries({ queryKey: ['fin-summary', month] });
          toast.success('Transaction deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── Save transaction ──────────────────────────────────────────────────────
  function openAddTx() {
    setTxForm({ ...DEFAULT_TX, date: todayStr() });
    setTxCalMonth(new Date());
    setTxDateOpen(false);
    setTxModal(true);
  }
  function closeTxModal() { if (savingTx) return; setTxModal(false); setTxDateOpen(false); }
  async function saveTx() {
    if (!txForm.title.trim()) { Alert.alert('Required', 'Enter a title.'); return; }
    const amt = parseFloat(txForm.amount);
    if (!amt || amt <= 0) { Alert.alert('Required', 'Enter a valid amount.'); return; }
    setSavingTx(true);
    try {
      await api.post('/finances/transactions', {
        title:    txForm.title.trim(),
        amount:   amt,
        type:     txForm.type,
        category: txForm.category,
        date:     txForm.date,
        note:     txForm.note.trim() || undefined,
      });
      qc.invalidateQueries({ queryKey: ['transactions', month] });
      qc.invalidateQueries({ queryKey: ['fin-summary', month] });
      setTxModal(false);
      toast.success('Transaction added');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingTx(false); }
  }

  // ── Save budget ───────────────────────────────────────────────────────────
  function openSetBudget(cat?: FinanceCategory) {
    setBudgetForm({ category: cat ?? 'FOOD', limit: '' });
    setBudgetModal(true);
  }
  function closeBudgetModal() { if (savingBudget) return; setBudgetModal(false); }
  async function saveBudget() {
    const limit = parseFloat(budgetForm.limit);
    if (!limit || limit <= 0) { Alert.alert('Required', 'Enter a budget limit.'); return; }
    setSavingBudget(true);
    try {
      await api.post('/finances/budgets', { category: budgetForm.category, limit, month });
      qc.invalidateQueries({ queryKey: ['budgets', month] });
      setBudgetModal(false);
      toast.success('Budget saved');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingBudget(false); }
  }

  // ── Savings goals ─────────────────────────────────────────────────────────
  function openAddGoal() { setGoalForm(DEFAULT_GOAL); setGoalModal(true); }
  function closeGoalModal() { if (savingGoal) return; setGoalModal(false); }
  async function saveGoal() {
    if (!goalForm.name.trim()) { Alert.alert('Required', 'Enter a goal name.'); return; }
    const target = parseFloat(goalForm.targetAmount);
    if (!target || target <= 0) { Alert.alert('Required', 'Enter a target amount.'); return; }
    setSavingGoal(true);
    try {
      await api.post('/finances/savings', {
        name:         goalForm.name.trim(),
        targetAmount: target,
        emoji:        goalForm.emoji || '🎯',
        targetDate:   goalForm.targetDate || undefined,
      });
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
      setGoalModal(false);
      toast.success('Goal created');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingGoal(false); }
  }
  function confirmDeleteGoal(g: SavingsGoal) {
    Alert.alert('Delete Goal', `Delete "${g.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/finances/savings/${g.id}`);
          qc.invalidateQueries({ queryKey: ['savings-goals'] });
          toast.success('Goal deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // Contribution
  async function saveContrib() {
    const amt = parseFloat(contribAmount);
    if (!amt || amt <= 0) { Alert.alert('Required', 'Enter an amount.'); return; }
    setSavingContrib(true);
    try {
      const newSaved = (contribGoal!.savedAmount + amt);
      await api.patch(`/finances/savings/${contribGoal!.id}`, { savedAmount: newSaved });
      qc.invalidateQueries({ queryKey: ['savings-goals'] });
      setContribGoal(null);
      setContribAmount('');
      toast.success('Funds added!');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally { setSavingContrib(false); }
  }

  // ── Mini calendar for tx date ─────────────────────────────────────────────
  function TxDatePickerContent() {
    const year   = txCalMonth.getFullYear();
    const mo     = txCalMonth.getMonth();
    const first  = new Date(year, mo, 1).getDay();
    const total  = new Date(year, mo + 1, 0).getDate();
    const offset = first === 0 ? 6 : first - 1;
    const cells  = Array.from({ length: offset + total }, (_, i) => (i < offset ? null : i - offset + 1));
    return (
      <View style={[styles.miniCal, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        <View style={styles.calNavRow}>
          <TouchableOpacity onPress={() => { const d = new Date(txCalMonth); d.setMonth(d.getMonth() - 1); setTxCalMonth(d); }}>
            <Ionicons name="chevron-back" size={18} color={tokens.text} />
          </TouchableOpacity>
          <Text variant="body" weight="semibold" style={{ color: tokens.text }}>
            {MONTH_SHORT[mo]} {year}
          </Text>
          <TouchableOpacity onPress={() => { const d = new Date(txCalMonth); d.setMonth(d.getMonth() + 1); setTxCalMonth(d); }}>
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
            const dateStr = `${year}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const selected = txForm.date === dateStr;
            return (
              <TouchableOpacity
                key={i}
                style={{ width: '14.28%', height: 36, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => { setTxForm(f => ({ ...f, date: dateStr })); setTxDateOpen(false); }}
              >
                <View style={[
                  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
                  selected && { backgroundColor: C.primary },
                ]}>
                  <Text variant="bodySmall" style={{ color: selected ? '#fff' : tokens.text }}>{day}</Text>
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
        <Text style={{ fontSize: 64 }}>💰</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to track finances together.
        </Text>
      </View>
    );
  }

  const income  = summary?.income  ?? 0;
  const expense = summary?.expense ?? 0;
  const balance = summary?.balance ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ ADD TRANSACTION MODAL ══════ */}
      <Modal visible={txModal} animationType="slide" onRequestClose={closeTxModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, savingTx && { opacity: 0.35 }]} onPress={closeTxModal} disabled={savingTx}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Add Transaction</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveTx} disabled={savingTx}>
              {savingTx
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
              {/* Amount + type toggle */}
              <View style={styles.amountRow}>
                <Text variant="h1" weight="black" style={{ color: txForm.type === 'INCOME' ? Colors.success[500] : Colors.error[500] }}>
                  {txForm.type === 'INCOME' ? '+' : '−'}
                </Text>
                <TextInput
                  value={txForm.amount}
                  onChangeText={t => setTxForm(f => ({ ...f, amount: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                  placeholderTextColor={tokens.textTertiary}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: txForm.type === 'INCOME' ? Colors.success[500] : Colors.error[500] }]}
                  autoFocus
                />
              </View>

              {/* Income / Expense toggle */}
              <View style={[styles.typeToggle, { backgroundColor: tokens.surfaceAlt, borderRadius: BorderRadius.xl }]}>
                {(['EXPENSE', 'INCOME'] as TxType[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, txForm.type === t && { backgroundColor: t === 'INCOME' ? Colors.success[500] : Colors.error[500] }]}
                    onPress={() => setTxForm(f => ({ ...f, type: t }))}
                  >
                    <Text variant="body" weight="semibold"
                      style={{ color: txForm.type === t ? '#fff' : tokens.textSecondary }}>
                      {t === 'INCOME' ? 'Income' : 'Expense'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <TextInput
                value={txForm.title}
                onChangeText={t => setTxForm(f => ({ ...f, title: t }))}
                placeholder="Title (e.g. Grocery Store)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
              />

              {/* Category */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, {
                        backgroundColor: txForm.category === cat ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     txForm.category === cat ? C.primary : tokens.border,
                      }]}
                      onPress={() => setTxForm(f => ({ ...f, category: cat }))}
                    >
                      <Text style={{ fontSize: 14 }}>{CAT_EMOJI[cat]}</Text>
                      <Text
                        variant="bodySmall"
                        weight={txForm.category === cat ? 'bold' : 'regular'}
                        style={{ color: txForm.category === cat ? C.primary : tokens.textSecondary, marginLeft: 4 }}
                      >
                        {CAT_LABEL[cat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date row */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Date</Text>
                </View>
                <TouchableOpacity onPress={() => setTxDateOpen(v => !v)}>
                  <Text variant="body" weight="semibold" style={{ color: C.primary }}>
                    {fmtDisplayDate(txForm.date)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date picker (inline, not overlay — avoids keyboard conflicts) */}
              {txDateOpen && TxDatePickerContent()}

              {/* Note */}
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="document-text-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Note</Text>
                </View>
                <TextInput
                  value={txForm.note}
                  onChangeText={t => setTxForm(f => ({ ...f, note: t }))}
                  placeholder="Optional"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.inlineInput, { color: tokens.text }]}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ SET BUDGET MODAL ══════ */}
      <Modal visible={budgetModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeBudgetModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, savingBudget && { opacity: 0.35 }]} onPress={closeBudgetModal} disabled={savingBudget}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Set Budget</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveBudget} disabled={savingBudget}>
              {savingBudget
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>
              }
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always">
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, {
                        backgroundColor: budgetForm.category === cat ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     budgetForm.category === cat ? C.primary : tokens.border,
                      }]}
                      onPress={() => setBudgetForm(f => ({ ...f, category: cat }))}
                    >
                      <Text style={{ fontSize: 14 }}>{CAT_EMOJI[cat]}</Text>
                      <Text variant="bodySmall"
                        weight={budgetForm.category === cat ? 'bold' : 'regular'}
                        style={{ color: budgetForm.category === cat ? C.primary : tokens.textSecondary, marginLeft: 4 }}>
                        {CAT_LABEL[cat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>MONTHLY LIMIT ($)</Text>
                <TextInput
                  value={budgetForm.limit}
                  onChangeText={t => setBudgetForm(f => ({ ...f, limit: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                  placeholderTextColor={tokens.textTertiary}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: tokens.text, fontSize: 36 }]}
                  autoFocus
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ ADD SAVINGS GOAL MODAL ══════ */}
      <Modal visible={goalModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeGoalModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, savingGoal && { opacity: 0.35 }]} onPress={closeGoalModal} disabled={savingGoal}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>New Goal</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveGoal} disabled={savingGoal}>
              {savingGoal
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>
              }
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formBody} keyboardShouldPersistTaps="always">
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 48 }}>{goalForm.emoji || '🎯'}</Text>
              </View>
              {/* Common emojis */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                {['🎯','✈️','🚗','🏠','💍','🎓','🏖️','🛍️','💻','🎸','⛵','🏦'].map(e => (
                  <TouchableOpacity key={e}
                    style={[styles.emojiChip, {
                      backgroundColor: goalForm.emoji === e ? C.primary + '22' : tokens.surfaceAlt,
                      borderColor:     goalForm.emoji === e ? C.primary : tokens.border,
                    }]}
                    onPress={() => setGoalForm(f => ({ ...f, emoji: e }))}>
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                value={goalForm.name}
                onChangeText={t => setGoalForm(f => ({ ...f, name: t }))}
                placeholder="Goal name (e.g. Summer Vacation)"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus
              />
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="cash-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Target ($)</Text>
                </View>
                <TextInput
                  value={goalForm.targetAmount}
                  onChangeText={t => setGoalForm(f => ({ ...f, targetAmount: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                  placeholderTextColor={tokens.textTertiary}
                  keyboardType="decimal-pad"
                  style={[styles.inlineInput, { color: tokens.text }]}
                />
              </View>
              <View style={[styles.formRow, { borderBottomColor: tokens.border }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={tokens.textSecondary} />
                  <Text variant="body" style={[styles.rowLabel, { color: tokens.text }]}>Target Date</Text>
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

      {/* ══════ CONTRIBUTION MODAL ══════ */}
      <Modal visible={!!contribGoal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => { if (!savingContrib) { setContribGoal(null); setContribAmount(''); } }}
        statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8, backgroundColor: tokens.surface, borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, savingContrib && { opacity: 0.35 }]}
              onPress={() => { if (!savingContrib) { setContribGoal(null); setContribAmount(''); } }} disabled={savingContrib}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Add Funds</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveContrib} disabled={savingContrib}>
              {savingContrib
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Add</Text>
              }
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>{contribGoal?.emoji ?? '🎯'}</Text>
              <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 12 }}>{contribGoal?.name}</Text>
              <Text variant="body" secondary style={{ marginTop: 4 }}>
                ${(contribGoal?.savedAmount ?? 0).toLocaleString()} of ${(contribGoal?.targetAmount ?? 0).toLocaleString()} saved
              </Text>
              <TextInput
                value={contribAmount}
                onChangeText={t => setContribAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="Amount to add ($)"
                placeholderTextColor={tokens.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.contribInput, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                autoFocus
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ HEADER ══════ */}
      <LinearGradient
        colors={isDark ? ['#002D2A', '#0A0A1A'] : ['#F0FDFA', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          {/* Month navigation */}
          <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }}>
            <Ionicons name="chevron-back" size={18} color={isDark ? 'rgba(255,255,255,0.7)' : tokens.textSecondary} />
          </TouchableOpacity>
          <Text variant="body" weight="semibold"
            style={{ color: isDark ? 'rgba(255,255,255,0.8)' : tokens.textSecondary, minWidth: 130, textAlign: 'center' }}>
            {fmtMonth(month)}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }}>
            <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.7)' : tokens.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        {summaryLoading
          ? <ActivityIndicator color={isDark ? '#fff' : C.primary} style={{ marginTop: 16 }} />
          : <>
              <Text variant="h1" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 8 }}>
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
                Net balance
              </Text>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
                  <Ionicons name="arrow-down-circle" size={20} color={Colors.success[500]} />
                  <Text variant="caption" secondary style={{ marginTop: 6 }}>Income</Text>
                  <Text variant="h4" weight="bold" style={{ color: Colors.success[600] }}>
                    ${income.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </Text>
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
                  <Ionicons name="arrow-up-circle" size={20} color={Colors.error[500]} />
                  <Text variant="caption" secondary style={{ marginTop: 6 }}>Expenses</Text>
                  <Text variant="h4" weight="bold" style={{ color: Colors.error[600] }}>
                    ${expense.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>
            </>
        }
      </LinearGradient>

      {/* ══════ TABS ══════ */}
      <View style={[styles.tabBar, { backgroundColor: tokens.background, borderBottomColor: tokens.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {(['overview', 'expenses', 'budgets', 'savings'] as Tab[]).map(t => (
            <Chip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)}
              selected={tab === t} onPress={() => setTab(t)} color={C.primary} />
          ))}
        </ScrollView>
      </View>

      {/* ══════ CONTENT ══════ */}
      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 120, gap: 16 }}>

        {/* OVERVIEW + EXPENSES */}
        {(tab === 'overview' || tab === 'expenses') && (
          <>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
              {tab === 'expenses' ? 'Expenses' : 'Recent Transactions'}
            </Text>

            {txLoading
              ? <ActivityIndicator color={C.primary} />
              : (() => {
                  const shown = tab === 'expenses'
                    ? transactions.filter(t => t.type === 'EXPENSE')
                    : transactions.slice(0, 10);
                  if (shown.length === 0) return (
                    <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                      <Text style={{ fontSize: 32 }}>💳</Text>
                      <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 10 }}>No transactions yet</Text>
                      <Text variant="bodySmall" secondary style={{ marginTop: 4 }}>Tap + to add one</Text>
                    </View>
                  );
                  return shown.map(tx => (
                    <TouchableOpacity key={tx.id} activeOpacity={0.85}
                      onLongPress={() => confirmDeleteTx(tx)}>
                      <Card style={styles.txCard} shadow="sm">
                        <View style={[styles.txIcon, {
                          backgroundColor: tx.type === 'INCOME' ? Colors.success[50] : Colors.error[50],
                        }]}>
                          <Text style={{ fontSize: 18 }}>{CAT_EMOJI[tx.category] ?? '💳'}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text variant="body" weight="semibold" numberOfLines={1} style={{ color: tokens.text }}>{tx.title}</Text>
                          <Text variant="caption" secondary>
                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {CAT_LABEL[tx.category]}
                          </Text>
                        </View>
                        <Text variant="body" weight="bold"
                          style={{ color: tx.type === 'INCOME' ? Colors.success[600] : Colors.error[600] }}>
                          {tx.type === 'INCOME' ? '+' : '−'}${tx.amount.toFixed(2)}
                        </Text>
                      </Card>
                    </TouchableOpacity>
                  ));
                })()
            }
          </>
        )}

        {/* BUDGETS */}
        {tab === 'budgets' && (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Monthly Budgets</Text>
              <TouchableOpacity onPress={() => openSetBudget()}>
                <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Set budget</Text>
              </TouchableOpacity>
            </View>

            {budgetsLoading
              ? <ActivityIndicator color={C.primary} />
              : budgets.length === 0
                ? (
                  <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                    <Text style={{ fontSize: 32 }}>📊</Text>
                    <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 10 }}>No budgets set</Text>
                    <Text variant="bodySmall" secondary style={{ marginTop: 4 }}>Tap "+ Set budget" to get started</Text>
                  </View>
                )
                : budgets.map(b => {
                    const spent = spentFor(b.category);
                    const pct   = Math.min(100, Math.round((spent / b.limit) * 100));
                    const color = progressColor(pct);
                    return (
                      <TouchableOpacity key={b.id} onPress={() => openSetBudget(b.category)} activeOpacity={0.85}>
                        <Card style={styles.budgetCard} shadow="sm">
                          <View style={styles.budgetTop}>
                            <Text style={{ fontSize: 24 }}>{CAT_EMOJI[b.category]}</Text>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{CAT_LABEL[b.category]}</Text>
                              <Text variant="caption" secondary>
                                ${spent.toFixed(0)} spent of ${b.limit.toFixed(0)}
                              </Text>
                            </View>
                            <Text variant="body" weight="bold" style={{ color }}>
                              {pct}%
                            </Text>
                          </View>
                          <ProgressBar progress={pct} color={color} height={6} style={{ marginTop: 10 }} />
                        </Card>
                      </TouchableOpacity>
                    );
                  })
            }
          </>
        )}

        {/* SAVINGS */}
        {tab === 'savings' && (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Savings Goals</Text>
            </View>

            {goalsLoading
              ? <ActivityIndicator color={C.primary} />
              : goals.length === 0
                ? (
                  <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
                    <Text style={{ fontSize: 32 }}>🎯</Text>
                    <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 10 }}>No savings goals</Text>
                    <Text variant="bodySmall" secondary style={{ marginTop: 4 }}>Tap + to create your first goal</Text>
                  </View>
                )
                : goals.map(g => {
                    const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
                    return (
                      <TouchableOpacity
                        key={g.id}
                        activeOpacity={0.85}
                        onPress={() => { setContribGoal(g); setContribAmount(''); }}
                        onLongPress={() => Alert.alert(g.name, 'What would you like to do?', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteGoal(g) },
                        ])}
                      >
                        <Card style={{ overflow: 'hidden', padding: 0 }} shadow="md">
                          <LinearGradient
                            colors={isDark ? ['#001A15', '#001010'] : ['#F0FDFA', '#E6FDF7']}
                            style={styles.savingsGradient}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ fontSize: 30, marginRight: 10 }}>{g.emoji ?? '🎯'}</Text>
                              <View style={{ flex: 1 }}>
                                <Text variant="h4" weight="bold" numberOfLines={1} style={{ color: tokens.text }}>{g.name}</Text>
                                {g.targetDate && (
                                  <Text variant="caption" secondary>
                                    Target: {new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </Text>
                                )}
                              </View>
                              <View style={[styles.addFundsBtn, { backgroundColor: C.primary + '22', borderColor: C.primary }]}>
                                <Ionicons name="add" size={16} color={C.primary} />
                                <Text variant="caption" weight="bold" style={{ color: C.primary, marginLeft: 2 }}>Add</Text>
                              </View>
                            </View>
                            <Text variant="body" secondary>
                              ${g.savedAmount.toLocaleString()} of ${g.targetAmount.toLocaleString()}
                            </Text>
                            <ProgressBar progress={pct} color={C.primary} height={8} style={{ marginTop: 12 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                              <Text variant="bodySmall" weight="bold" style={{ color: C.primary }}>{pct}% saved</Text>
                              <Text variant="bodySmall" secondary>
                                ${(g.targetAmount - g.savedAmount).toLocaleString()} to go
                              </Text>
                            </View>
                          </LinearGradient>
                        </Card>
                      </TouchableOpacity>
                    );
                  })
            }

            <TouchableOpacity style={[styles.addGoalBtn, { borderColor: C.primary }]} onPress={openAddGoal}>
              <Ionicons name="add-circle-outline" size={20} color={C.primary} />
              <Text variant="body" weight="semibold" style={{ color: C.primary, marginLeft: 8 }}>Add Savings Goal</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {(tab === 'overview' || tab === 'expenses') && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
          onPress={openAddTx}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      {tab === 'budgets' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
          onPress={() => openSetBudget()}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      {tab === 'savings' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
          onPress={openAddGoal}
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

  // Header
  header:   { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statsRow: { flexDirection: 'row', marginTop: 20 },
  statCard: { flex: 1, borderRadius: BorderRadius.xl, padding: 16 },

  // Tabs
  tabBar: { borderBottomWidth: 1, paddingVertical: 10 },

  // Transaction card
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  // Budget card
  budgetCard: { padding: 16 },
  budgetTop:  { flexDirection: 'row', alignItems: 'center' },

  // Savings
  savingsGradient: { padding: Spacing[5], borderRadius: BorderRadius.xl },
  addFundsBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  addGoalBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: BorderRadius.xl, padding: 16 },

  // FAB
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10,
  },

  // Empty state
  emptyBox: { borderRadius: BorderRadius.xl, padding: 30, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Modal shared
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:    { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:    { padding: 20, paddingBottom: 60 },
  section:     { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel:{ fontSize: 11, letterSpacing: 0.8, marginBottom: 10, color: '#888' },
  chip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  formRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft:     { flexDirection: 'row', alignItems: 'center' },
  rowLabel:    { marginLeft: 12, fontSize: 15 },
  inlineInput: { flex: 1, textAlign: 'right', fontSize: 15 },
  titleInput:  { fontSize: 20, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },

  // Amount
  amountRow:   { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 20 },
  amountInput: { fontSize: 48, fontWeight: '900', textAlign: 'center', flex: 1 },
  typeToggle:  { flexDirection: 'row', padding: 4, marginBottom: 8 },
  typeBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.xl },

  // Mini calendar
  miniCal:     { borderRadius: BorderRadius.xl, borderWidth: 1, padding: 12, marginBottom: 8 },
  calNavRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },

  // Emoji chips
  emojiChip:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  // Contribution
  contribInput: { fontSize: 32, fontWeight: '900', textAlign: 'center', borderWidth: 1.5, borderRadius: BorderRadius.xl, paddingVertical: 16, marginTop: 24, width: '80%' },
});
