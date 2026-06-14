import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card, Chip } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { ModuleColors, Spacing, BorderRadius } from '@/constants/theme';

const C = ModuleColors.meals;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_MEALS = [
  { day: 'Mon', breakfast: 'Oatmeal 🥣',    lunch: 'Chicken Wrap 🌯', dinner: 'Pasta 🍝' },
  { day: 'Tue', breakfast: 'Eggs & Toast 🍳', lunch: 'Salad 🥗',       dinner: 'Grilled Salmon 🐟' },
  { day: 'Wed', breakfast: 'Smoothie 🥤',    lunch: 'Soup 🍲',        dinner: 'Pizza Night 🍕' },
  { day: 'Thu', breakfast: 'Pancakes 🥞',    lunch: 'Sandwich 🥪',    dinner: 'Tacos 🌮' },
  { day: 'Fri', breakfast: 'Yogurt 🫙',      lunch: 'Leftovers',      dinner: 'Steak 🥩' },
  { day: 'Sat', breakfast: 'Brunch 🥂',      lunch: '',              dinner: 'BBQ 🔥' },
  { day: 'Sun', breakfast: 'French Toast 🍞', lunch: 'Family Lunch 👨‍👩‍👧', dinner: 'Roast 🍖' },
];

const RECIPES = [
  { id: '1', name: 'Spaghetti Carbonara', time: 30, emoji: '🍝', calories: 520, difficulty: 'Easy' },
  { id: '2', name: 'Chicken Stir-Fry',    time: 20, emoji: '🍜', calories: 380, difficulty: 'Easy' },
  { id: '3', name: 'Beef Tacos',          time: 25, emoji: '🌮', calories: 410, difficulty: 'Medium' },
  { id: '4', name: 'Avocado Toast',       time: 10, emoji: '🥑', calories: 290, difficulty: 'Easy' },
];

export default function MealsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [selected, setSelected] = React.useState(0);

  const today = WEEK_MEALS[selected];

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient colors={isDark ? ['#2D0000','#0A0A1A'] : ['#FEF2F2','#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Meal Planner</Text>
        <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary, marginTop: 4 }}>
          Healthy eating made easy 🥗
        </Text>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }} style={{ maxHeight: 60 }}>
        {DAYS.map((d, i) => (
          <Chip key={d} label={d} selected={selected === i} onPress={() => setSelected(i)} color={C.primary} />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 100, gap: 16 }}>
        <Text variant="h4" weight="bold">{DAYS[selected]}'s Meals</Text>
        {[
          { meal: 'Breakfast', icon: '🌅', value: today.breakfast },
          { meal: 'Lunch',     icon: '☀️', value: today.lunch     },
          { meal: 'Dinner',    icon: '🌙', value: today.dinner    },
        ].map((item) => (
          <Card key={item.meal} style={styles.mealCard} shadow="sm" onPress={() => {}}>
            <Text style={{ fontSize: 28, marginRight: 14 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text variant="caption" secondary weight="semibold">{item.meal.toUpperCase()}</Text>
              <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>{item.value || 'Tap to plan…'}</Text>
            </View>
            <TouchableOpacity style={[styles.editBtn, { backgroundColor: `${C.primary}18` }]}>
              <Ionicons name="pencil-outline" size={16} color={C.primary} />
            </TouchableOpacity>
          </Card>
        ))}

        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="bold">Recipes 📖</Text>
          <TouchableOpacity><Text variant="bodySmall" color={C.primary} weight="semibold">View all</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {RECIPES.map((r) => (
            <Card key={r.id} style={styles.recipeCard} shadow="md" onPress={() => {}}>
              <Text style={{ fontSize: 40 }}>{r.emoji}</Text>
              <Text variant="body" weight="bold" numberOfLines={1} style={{ marginTop: 8 }}>{r.name}</Text>
              <Text variant="caption" secondary>⏱ {r.time}m · 🔥 {r.calories} cal</Text>
              <View style={[styles.diffBadge, { backgroundColor: `${C.primary}18` }]}>
                <Text variant="caption" weight="semibold" color={C.primary}>{r.difficulty}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  mealCard:      { flexDirection: 'row', alignItems: 'center', padding: 16 },
  editBtn:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recipeCard:    { width: 160, padding: 16 },
  diffBadge:     { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  fab:           { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
