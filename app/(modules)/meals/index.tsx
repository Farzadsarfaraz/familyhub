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
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toast } from '@/store/toast.store';

const C = ModuleColors.meals;

// ── Week utilities ──────────────────────────────────────────────────────────
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmtDate(date: Date): string { return date.toISOString().slice(0, 10); }
function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Constants ──────────────────────────────────────────────────────────────
const RECIPE_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'other'];
const CAT_EMOJI: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙',
  snack: '🍿', dessert: '🍰', other: '🍽️',
};
const SLOT_ICON: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };
const SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
type Slot = typeof SLOTS[number];

// ── Types ──────────────────────────────────────────────────────────────────
interface DayMeal {
  id: string; date: string;
  breakfast?: string; lunch?: string; dinner?: string; snacks: string[];
}
interface MealPlan { id: string; weekOf: string; dayMeals: DayMeal[]; }

interface Recipe {
  id: string; name: string; description?: string;
  ingredients: string[]; instructions: string[];
  prepTime: number; cookTime: number;
  servings: number; calories?: number; category: string;
}

interface RecipeForm {
  name: string; category: string;
  prepTime: string; cookTime: string;
  calories: string; servings: string;
  description: string;
  ingredients: string;   // newline-separated
  instructions: string;  // newline-separated
}
const DEFAULT_RECIPE_FORM: RecipeForm = {
  name: '', category: 'dinner', prepTime: '0', cookTime: '30',
  calories: '', servings: '4', description: '', ingredients: '', instructions: '',
};

// ── Screen ──────────────────────────────────────────────────────────────────
export default function MealsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  // Week state
  const [weekMonday, setWeekMonday] = useState(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => {
    const dow = new Date().getDay();
    return dow === 0 ? 6 : dow - 1; // Mon=0 … Sun=6
  });
  const days = weekDays(weekMonday);
  const weekKey = fmtDate(weekMonday);

  // Meal slot edit
  const [slotModal, setSlotModal]   = useState(false);
  const [editSlot,  setEditSlot]    = useState<Slot>('dinner');
  const [slotValue, setSlotValue]   = useState('');
  const [savingSlot, setSavingSlot] = useState(false);

  // Recipe modal
  const [recipeModal,   setRecipeModal]   = useState(false);
  const [editRecipe,    setEditRecipe]    = useState<Recipe | null>(null);
  const [recipeForm,    setRecipeForm]    = useState<RecipeForm>(DEFAULT_RECIPE_FORM);
  const [savingRecipe,  setSavingRecipe]  = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: plan, isLoading: planLoading } = useQuery<MealPlan | null>({
    queryKey: ['meal-plan', weekKey],
    queryFn: async () => {
      const r = await api.get(`/meals/plan?weekOf=${weekKey}`);
      return r.data.data;
    },
    enabled: !!user?.familyId,
  });

  const { data: recipes = [], isLoading: recipesLoading } = useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => { const r = await api.get('/meals/recipes'); return r.data.data; },
    enabled: !!user?.familyId,
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function dayMealFor(dayIndex: number): DayMeal | undefined {
    const dateStr = fmtDate(days[dayIndex]);
    return plan?.dayMeals?.find(d => d.date.slice(0, 10) === dateStr);
  }
  const currentDayMeal = dayMealFor(selectedDay);

  function prevWeek() {
    const d = new Date(weekMonday); d.setDate(d.getDate() - 7);
    setWeekMonday(d);
  }
  function nextWeek() {
    const d = new Date(weekMonday); d.setDate(d.getDate() + 7);
    setWeekMonday(d);
  }
  function isToday(dayIndex: number): boolean {
    return fmtDate(days[dayIndex]) === fmtDate(new Date());
  }

  // ── Edit slot ─────────────────────────────────────────────────────────────
  function openSlotEdit(slot: Slot) {
    setEditSlot(slot);
    setSlotValue(currentDayMeal?.[slot] ?? '');
    setSlotModal(true);
  }
  function closeSlotModal() {
    if (savingSlot) return;
    setSlotModal(false);
  }
  async function saveSlot() {
    setSavingSlot(true);
    try {
      // Build full 7-day array preserving other days
      const dayMealsPayload = days.map((day, i) => {
        const existing = dayMealFor(i);
        const entry = {
          date:      fmtDate(day),
          breakfast: existing?.breakfast ?? '',
          lunch:     existing?.lunch ?? '',
          dinner:    existing?.dinner ?? '',
          snacks:    existing?.snacks ?? [],
        };
        if (i === selectedDay) entry[editSlot] = slotValue.trim();
        return entry;
      });
      await api.post('/meals/plan', { weekOf: weekKey, dayMeals: dayMealsPayload });
      qc.invalidateQueries({ queryKey: ['meal-plan', weekKey] });
      setSlotModal(false);
      toast.success('Meal updated');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally {
      setSavingSlot(false);
    }
  }
  function useRecipeForSlot(recipe: Recipe) {
    setSlotValue(recipe.name);
  }

  // ── Recipe CRUD ───────────────────────────────────────────────────────────
  function openCreateRecipe() {
    setEditRecipe(null);
    setRecipeForm(DEFAULT_RECIPE_FORM);
    setRecipeModal(true);
  }
  function openEditRecipe(r: Recipe) {
    setEditRecipe(r);
    setRecipeForm({
      name:         r.name,
      category:     r.category,
      prepTime:     String(r.prepTime),
      cookTime:     String(r.cookTime),
      calories:     r.calories ? String(r.calories) : '',
      servings:     String(r.servings),
      description:  r.description ?? '',
      ingredients:  r.ingredients.join('\n'),
      instructions: r.instructions.join('\n'),
    });
    setRecipeModal(true);
  }
  function closeRecipeModal() {
    if (savingRecipe) return;
    setRecipeModal(false);
    setEditRecipe(null);
  }
  async function saveRecipe() {
    if (!recipeForm.name.trim()) { Alert.alert('Required', 'Enter a recipe name.'); return; }
    setSavingRecipe(true);
    try {
      const payload = {
        name:         recipeForm.name.trim(),
        category:     recipeForm.category,
        prepTime:     parseInt(recipeForm.prepTime, 10) || 0,
        cookTime:     parseInt(recipeForm.cookTime, 10) || 0,
        calories:     recipeForm.calories ? parseInt(recipeForm.calories, 10) : undefined,
        servings:     parseInt(recipeForm.servings, 10) || 4,
        description:  recipeForm.description.trim() || undefined,
        ingredients:  recipeForm.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
        instructions: recipeForm.instructions.split('\n').map(s => s.trim()).filter(Boolean),
      };
      if (editRecipe) {
        await api.patch(`/meals/recipes/${editRecipe.id}`, payload);
      } else {
        await api.post('/meals/recipes', payload);
      }
      qc.invalidateQueries({ queryKey: ['recipes'] });
      closeRecipeModal();
      toast.success(editRecipe ? 'Recipe updated' : 'Recipe added');
    } catch (err) {
      Alert.alert('Error', parseApiError(err), [{ text: 'OK' }]);
    } finally {
      setSavingRecipe(false);
    }
  }
  function confirmDeleteRecipe(r: Recipe) {
    Alert.alert('Delete Recipe', `Delete "${r.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/meals/recipes/${r.id}`);
          qc.invalidateQueries({ queryKey: ['recipes'] });
          toast.success('Recipe deleted');
        } catch (err) { toast.error(parseApiError(err)); }
      }},
    ]);
  }

  // ── No family guard ───────────────────────────────────────────────────────
  if (!user?.familyId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: tokens.background }]}>
        <Text style={{ fontSize: 64 }}>🍽️</Text>
        <Text variant="h4" weight="bold" style={{ color: tokens.text, marginTop: 16 }}>No Family Yet</Text>
        <Text variant="body" secondary style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          Join or create a family to start meal planning.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>

      {/* ══════ SLOT EDIT MODAL ══════ */}
      <Modal visible={slotModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={closeSlotModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8,
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, savingSlot && { opacity: 0.35 }]}
              onPress={closeSlotModal} disabled={savingSlot}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
              {editSlot.charAt(0).toUpperCase() + editSlot.slice(1)}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveSlot} disabled={savingSlot}>
              {savingSlot
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text variant="body" weight="bold" style={{ color: C.primary }}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 20 }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {/* Meal name input */}
              <View>
                <Text variant="bodySmall" weight="semibold" style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                  WHAT'S FOR {editSlot.toUpperCase()}?
                </Text>
                <TextInput
                  value={slotValue}
                  onChangeText={setSlotValue}
                  placeholder={`e.g. Pasta, Salad, Grilled Chicken…`}
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.slotInput, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveSlot}
                />
              </View>

              {/* Pick from recipes */}
              {recipes.length > 0 && (
                <View>
                  <Text variant="bodySmall" weight="semibold" style={[styles.sectionLabel, { color: tokens.textSecondary }]}>
                    OR PICK A RECIPE
                  </Text>
                  <View style={{ gap: 8 }}>
                    {recipes.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.recipePickRow, {
                          backgroundColor: slotValue === r.name ? C.primary + '18' : tokens.surfaceAlt,
                          borderColor:     slotValue === r.name ? C.primary : tokens.border,
                        }]}
                        onPress={() => useRecipeForSlot(r)}
                      >
                        <Text style={{ fontSize: 20, marginRight: 10 }}>{CAT_EMOJI[r.category] ?? '🍽️'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text variant="body" weight="semibold" style={{ color: tokens.text }}>{r.name}</Text>
                          <Text variant="caption" secondary>
                            ⏱ {r.prepTime + r.cookTime}m
                            {r.calories ? ` · 🔥 ${r.calories} cal` : ''}
                          </Text>
                        </View>
                        {slotValue === r.name && <Ionicons name="checkmark-circle" size={20} color={C.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ RECIPE CREATE / EDIT MODAL ══════ */}
      <Modal visible={recipeModal} animationType="slide" onRequestClose={closeRecipeModal} statusBarTranslucent>
        <View style={[styles.root, { backgroundColor: tokens.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, {
            paddingTop: insets.top + 8,
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
          }]}>
            <TouchableOpacity style={[styles.modalBtn, savingRecipe && { opacity: 0.35 }]}
              onPress={closeRecipeModal} disabled={savingRecipe}>
              <Text variant="body" style={{ color: tokens.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
              {editRecipe ? 'Edit Recipe' : 'New Recipe'}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={saveRecipe} disabled={savingRecipe}>
              {savingRecipe
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
              {/* Name */}
              <TextInput
                value={recipeForm.name}
                onChangeText={t => setRecipeForm(f => ({ ...f, name: t }))}
                placeholder="Recipe name"
                placeholderTextColor={tokens.textTertiary}
                style={[styles.titleInput, { color: tokens.text, borderBottomColor: tokens.border }]}
                autoFocus={!editRecipe}
              />

              {/* Category */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RECIPE_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, {
                        backgroundColor: recipeForm.category === cat ? C.primary + '22' : tokens.surfaceAlt,
                        borderColor:     recipeForm.category === cat ? C.primary : tokens.border,
                      }]}
                      onPress={() => setRecipeForm(f => ({ ...f, category: cat }))}
                    >
                      <Text style={{ fontSize: 14 }}>{CAT_EMOJI[cat]}</Text>
                      <Text
                        variant="bodySmall"
                        weight={recipeForm.category === cat ? 'bold' : 'regular'}
                        style={{ color: recipeForm.category === cat ? C.primary : tokens.textSecondary, marginLeft: 4 }}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Times + Stats */}
              <View style={{ flexDirection: 'row', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border, paddingVertical: 14 }}>
                {[
                  { label: 'Prep (min)', key: 'prepTime' as const, icon: 'time-outline' },
                  { label: 'Cook (min)', key: 'cookTime' as const, icon: 'flame-outline' },
                  { label: 'Servings',   key: 'servings'  as const, icon: 'people-outline' },
                  { label: 'Calories',   key: 'calories'  as const, icon: 'fitness-outline' },
                ].map(({ label, key, icon }) => (
                  <View key={key} style={{ flex: 1, alignItems: 'center' }}>
                    <Ionicons name={icon as any} size={18} color={tokens.textSecondary} />
                    <TextInput
                      value={recipeForm[key]}
                      onChangeText={t => setRecipeForm(f => ({ ...f, [key]: t.replace(/[^0-9]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={tokens.textTertiary}
                      style={[styles.statInput, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                      maxLength={4}
                    />
                    <Text variant="caption" secondary style={{ marginTop: 4, textAlign: 'center' }}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Description */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>DESCRIPTION</Text>
                <TextInput
                  value={recipeForm.description}
                  onChangeText={t => setRecipeForm(f => ({ ...f, description: t }))}
                  placeholder="Short description (optional)"
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.textArea, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt }]}
                  multiline numberOfLines={2}
                />
              </View>

              {/* Ingredients */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>
                  INGREDIENTS (one per line)
                </Text>
                <TextInput
                  value={recipeForm.ingredients}
                  onChangeText={t => setRecipeForm(f => ({ ...f, ingredients: t }))}
                  placeholder={'2 cups flour\n1 tsp salt\n…'}
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.textArea, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt, minHeight: 100 }]}
                  multiline
                />
              </View>

              {/* Instructions */}
              <View style={[styles.section, { borderBottomColor: tokens.border }]}>
                <Text variant="bodySmall" weight="semibold" style={styles.sectionLabel}>
                  INSTRUCTIONS (one step per line)
                </Text>
                <TextInput
                  value={recipeForm.instructions}
                  onChangeText={t => setRecipeForm(f => ({ ...f, instructions: t }))}
                  placeholder={'Preheat oven to 180°C\nMix dry ingredients\n…'}
                  placeholderTextColor={tokens.textTertiary}
                  style={[styles.textArea, { color: tokens.text, borderColor: tokens.border, backgroundColor: tokens.surfaceAlt, minHeight: 120 }]}
                  multiline
                />
              </View>

              {/* Delete (edit mode) */}
              {editRecipe && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: Colors.error[500] }]}
                  onPress={() => { closeRecipeModal(); setTimeout(() => confirmDeleteRecipe(editRecipe), 300); }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error[500]} />
                  <Text variant="body" weight="semibold" style={{ color: Colors.error[500], marginLeft: 8 }}>
                    Delete Recipe
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════ MAIN CONTENT ══════ */}

      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#2D0000', '#0A0A1A'] : ['#FEF2F2', '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>Meal Planner</Text>
            <Text variant="caption" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              Healthy eating made easy 🥗
            </Text>
          </View>
        </View>

        {/* Week navigation */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={prevWeek} style={styles.weekNavBtn}>
            <Ionicons name="chevron-back" size={20} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
          <Text variant="body" weight="semibold" style={{ color: isDark ? '#fff' : tokens.text }}>
            {MONTH_NAMES[days[0].getMonth()]} {days[0].getDate()} – {MONTH_NAMES[days[6].getMonth()]} {days[6].getDate()}
          </Text>
          <TouchableOpacity onPress={nextWeek} style={styles.weekNavBtn}>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#fff' : tokens.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        style={{ maxHeight: 66, flexGrow: 0 }}
      >
        {DAY_NAMES.map((name, i) => {
          const isSelected = selectedDay === i;
          const today = isToday(i);
          const hasMeal = !!dayMealFor(i);
          return (
            <TouchableOpacity
              key={name}
              onPress={() => setSelectedDay(i)}
              style={[styles.dayChip, {
                backgroundColor: isSelected ? C.primary : today ? C.primary + '18' : tokens.surfaceAlt,
                borderColor:     isSelected ? C.primary : today ? C.primary : tokens.border,
              }]}
            >
              <Text variant="caption" weight="semibold"
                style={{ color: isSelected ? '#fff' : today ? C.primary : tokens.textSecondary }}>
                {name}
              </Text>
              <Text variant="bodySmall" weight="bold"
                style={{ color: isSelected ? '#fff' : tokens.text }}>
                {days[i].getDate()}
              </Text>
              {hasMeal && !isSelected && (
                <View style={[styles.mealDot, { backgroundColor: C.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], paddingBottom: 120, gap: 16 }}>

        {/* Day header */}
        <View style={styles.sectionHeader}>
          <Text variant="h4" weight="bold" style={{ color: tokens.text }}>
            {DAY_NAMES[selectedDay]}, {MONTH_NAMES[days[selectedDay].getMonth()]} {days[selectedDay].getDate()}
          </Text>
          {planLoading && <ActivityIndicator size="small" color={C.primary} />}
        </View>

        {/* Meal slots */}
        {SLOTS.map(slot => {
          const value = currentDayMeal?.[slot];
          return (
            <Card key={slot} style={styles.mealCard} shadow="sm">
              <Text style={{ fontSize: 28, marginRight: 14 }}>{SLOT_ICON[slot]}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="caption" secondary weight="semibold">
                  {slot.toUpperCase()}
                </Text>
                <Text variant="body" weight="semibold" style={{ marginTop: 2, color: value ? tokens.text : tokens.textTertiary }}>
                  {value || 'Tap to plan…'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: `${C.primary}18` }]}
                onPress={() => openSlotEdit(slot)}
              >
                <Ionicons name="pencil-outline" size={16} color={C.primary} />
              </TouchableOpacity>
            </Card>
          );
        })}

        {/* Recipes section */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text variant="h4" weight="bold" style={{ color: tokens.text }}>Recipes 📖</Text>
          <TouchableOpacity onPress={openCreateRecipe}>
            <Text variant="bodySmall" weight="semibold" style={{ color: C.primary }}>+ Add recipe</Text>
          </TouchableOpacity>
        </View>

        {recipesLoading ? (
          <ActivityIndicator color={C.primary} />
        ) : recipes.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: tokens.surfaceAlt, borderColor: tokens.border }]}>
            <Text style={{ fontSize: 32 }}>📖</Text>
            <Text variant="body" weight="semibold" style={{ color: tokens.text, marginTop: 10 }}>No recipes yet</Text>
            <Text variant="bodySmall" secondary style={{ marginTop: 4 }}>Tap "+ Add recipe" to get started</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {recipes.map(r => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.85}
                onLongPress={() => Alert.alert(r.name, 'What would you like to do?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Edit',   onPress: () => openEditRecipe(r) },
                  { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteRecipe(r) },
                ])}
              >
                <Card style={styles.recipeCard} shadow="md">
                  <Text style={{ fontSize: 36 }}>{CAT_EMOJI[r.category] ?? '🍽️'}</Text>
                  <Text variant="body" weight="bold" numberOfLines={2}
                    style={{ marginTop: 8, color: tokens.text }}>{r.name}</Text>
                  <Text variant="caption" secondary style={{ marginTop: 4 }}>
                    ⏱ {r.prepTime + r.cookTime}m{r.calories ? ` · 🔥 ${r.calories}` : ''}
                  </Text>
                  <View style={[styles.catBadge, { backgroundColor: `${C.primary}18` }]}>
                    <Text variant="caption" weight="semibold" style={{ color: C.primary }}>
                      {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: C.primary, bottom: 32 + insets.bottom }]}
        onPress={openCreateRecipe}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  weekNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekNavBtn:{ padding: 4 },

  // Day chips
  dayChip:  { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.xl, borderWidth: 1.5, minWidth: 52 },
  mealDot:  { width: 5, height: 5, borderRadius: 3, marginTop: 4 },

  // Meal cards
  mealCard:  { flexDirection: 'row', alignItems: 'center', padding: 16 },
  editBtn:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // Recipes
  recipeCard: { width: 160, padding: 16 },
  catBadge:   { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },

  // FAB
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10,
  },

  // Empty
  emptyBox: { borderRadius: BorderRadius.xl, padding: 30, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },

  // Slot modal
  recipePickRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: BorderRadius.xl, borderWidth: 1.5 },
  slotInput:     { fontSize: 18, padding: 14, borderRadius: BorderRadius.xl, borderWidth: 1.5 },

  // Recipe modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBtn:    { minWidth: 64, height: 36, justifyContent: 'center' },
  formBody:    { padding: 20, paddingBottom: 60 },
  titleInput:  { fontSize: 22, fontWeight: '700', paddingVertical: 14, borderBottomWidth: 1, marginBottom: 4 },
  section:     { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel:{ fontSize: 11, letterSpacing: 0.8, marginBottom: 10 },
  chip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  statInput:   { width: '100%', textAlign: 'center', fontSize: 18, fontWeight: '700', borderWidth: 1, borderRadius: 8, paddingVertical: 8, marginTop: 6 },
  textArea:    { padding: 12, borderRadius: BorderRadius.xl, borderWidth: 1.5, fontSize: 15, lineHeight: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 14, borderRadius: BorderRadius.xl, borderWidth: 1.5 },
});
