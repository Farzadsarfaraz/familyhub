import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Badge, Chip, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C   = ModuleColors.finances;
const { width } = Dimensions.get('window');

type Tab = 'overview' | 'expenses' | 'budgets' | 'savings';

const TRANSACTIONS = [
  { id: '1', title: 'Grocery Store',    amount: -84.50, category: 'food',        icon: '🛒', date: 'Today',     type: 'expense' },
  { id: '2', title: 'Netflix',          amount: -15.99, category: 'entertainment', icon: '🎬', date: 'Today',     type: 'expense' },
  { id: '3', title: 'Salary',           amount: 4200,   category: 'income',      icon: '💼', date: 'Jun 1',     type: 'income'  },
  { id: '4', title: 'Electric Bill',    amount: -127,   category: 'utilities',   icon: '⚡', date: 'Yesterday', type: 'expense' },
  { id: '5', title: 'Piano Lessons',    amount: -80,    category: 'education',   icon: '🎹', date: 'Jun 12',    type: 'expense' },
  { id: '6', title: 'Freelance Work',   amount: 650,    category: 'income',      icon: '💻', date: 'Jun 10',    type: 'income'  },
];

const BUDGETS = [
  { category: 'food',          emoji: '🛒', limit: 600,  spent: 320, color: Colors.success[500]  },
  { category: 'entertainment', emoji: '🎬', limit: 150,  spent: 130, color: Colors.warning[500]  },
  { category: 'utilities',     emoji: '⚡', limit: 300,  spent: 270, color: Colors.error[500]    },
  { category: 'education',     emoji: '🎓', limit: 200,  spent: 80,  color: Colors.primary[500]  },
  { category: 'transport',     emoji: '🚗', limit: 400,  spent: 95,  color: Colors.success[500]  },
];

const SAVINGS_GOALS = [
  { name: 'Summer Vacation 🏖️',  target: 3000, saved: 1860, emoji: '✈️' },
  { name: 'New Car Fund 🚗',      target: 15000, saved: 4200, emoji: '🚗' },
  { name: 'Emergency Fund 🏦',   target: 10000, saved: 7500, emoji: '🏦' },
];

export default function FinancesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [tab,   setTab]   = useState<Tab>('overview');

  const totalIncome  = TRANSACTIONS.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = Math.abs(TRANSACTIONS.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  const balance      = totalIncome - totalExpense;

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Hero */}
      <LinearGradient
        colors={isDark ? ['#002D2A', '#0A0A1A'] : ['#F0FDFA', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>

        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>June 2025</Text>
        <Text variant="h1" weight="black" style={{ color: isDark ? '#fff' : tokens.text, marginTop: 4 }}>
          ${balance.toFixed(2)}
        </Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>Current balance</Text>

        <View style={styles.statsRow}>
          <StatCard label="Income" amount={totalIncome} icon="arrow-down-circle" color={Colors.success[500]} isDark={isDark} tokens={tokens} />
          <View style={{ width: 12 }} />
          <StatCard label="Expenses" amount={totalExpense} icon="arrow-up-circle" color={Colors.error[500]} isDark={isDark} tokens={tokens} />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: tokens.background, borderBottomColor: tokens.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {(['overview', 'expenses', 'budgets', 'savings'] as Tab[]).map((t) => (
            <Chip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} selected={tab === t} onPress={() => setTab(t)} color={C.primary} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 16 }}>
        {(tab === 'overview' || tab === 'expenses') && (
          <>
            <Text variant="h4" weight="bold">Recent Transactions</Text>
            {TRANSACTIONS.filter((t) => tab === 'expenses' ? t.type === 'expense' : true).map((tx) => (
              <Card key={tx.id} style={styles.txCard} shadow="sm">
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'income' ? Colors.success[50] : Colors.error[50] }]}>
                  <Text style={{ fontSize: 20 }}>{tx.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>{tx.title}</Text>
                  <Text variant="caption" secondary>{tx.date} · {tx.category}</Text>
                </View>
                <Text
                  variant="body"
                  weight="bold"
                  color={tx.type === 'income' ? Colors.success[600] : Colors.error[600]}
                >
                  {tx.type === 'income' ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                </Text>
              </Card>
            ))}
          </>
        )}

        {tab === 'budgets' && (
          <>
            <Text variant="h4" weight="bold">Monthly Budgets</Text>
            {BUDGETS.map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100);
              return (
                <Card key={b.category} style={styles.budgetCard} shadow="sm">
                  <View style={styles.budgetTop}>
                    <Text style={{ fontSize: 24 }}>{b.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text variant="body" weight="semibold" style={{ textTransform: 'capitalize' }}>{b.category}</Text>
                      <Text variant="caption" secondary>${b.spent} / ${b.limit}</Text>
                    </View>
                    <Text variant="body" weight="bold" color={pct > 85 ? Colors.error[500] : Colors.success[600]}>
                      {pct}%
                    </Text>
                  </View>
                  <ProgressBar progress={pct} color={b.color} height={6} style={{ marginTop: 10 }} />
                </Card>
              );
            })}
          </>
        )}

        {tab === 'savings' && (
          <>
            <Text variant="h4" weight="bold">Savings Goals</Text>
            {SAVINGS_GOALS.map((g) => {
              const pct = Math.round((g.saved / g.target) * 100);
              return (
                <Card key={g.name} style={styles.savingsCard} shadow="md">
                  <LinearGradient
                    colors={isDark ? ['#001A15', '#001010'] : ['#F0FDFA', '#E6FDF7']}
                    style={styles.savingsGradient}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>{g.emoji}</Text>
                    <Text variant="h4" weight="bold" numberOfLines={1}>{g.name}</Text>
                    <Text variant="body" secondary style={{ marginTop: 4 }}>
                      ${g.saved.toLocaleString()} of ${g.target.toLocaleString()}
                    </Text>
                    <ProgressBar progress={pct} color={C.primary} height={8} style={{ marginTop: 14 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text variant="bodySmall" weight="bold" color={C.primary}>{pct}% saved</Text>
                      <Text variant="bodySmall" secondary>${(g.target - g.saved).toLocaleString()} to go</Text>
                    </View>
                  </LinearGradient>
                </Card>
              );
            })}
            <TouchableOpacity style={[styles.addGoalBtn, { borderColor: C.primary }]}>
              <Ionicons name="add-circle-outline" size={20} color={C.primary} />
              <Text variant="body" weight="semibold" color={C.primary} style={{ marginLeft: 8 }}>Add Savings Goal</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function StatCard({ label, amount, icon, color, isDark, tokens }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text variant="caption" secondary style={{ marginTop: 6 }}>{label}</Text>
      <Text variant="h4" weight="bold" color={color}>${amount.toFixed(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  statsRow:      { flexDirection: 'row', marginTop: 20 },
  statCard:      { flex: 1, borderRadius: BorderRadius.xl, padding: 16 },
  tabBar:        { borderBottomWidth: 1, paddingVertical: 10 },
  txCard:        { flexDirection: 'row', alignItems: 'center', padding: 14 },
  txIcon:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  budgetCard:    { padding: 16 },
  budgetTop:     { flexDirection: 'row', alignItems: 'center' },
  savingsCard:   { overflow: 'hidden', padding: 0 },
  savingsGradient: { padding: Spacing[5], borderRadius: BorderRadius.xl },
  addGoalBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: BorderRadius.xl, padding: 16 },
  fab:           { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
