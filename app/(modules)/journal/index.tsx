import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.journal;

const MOODS = [
  { emoji: '😄', label: 'Great',  color: Colors.success[500] },
  { emoji: '😊', label: 'Good',   color: '#4ADE80' },
  { emoji: '😐', label: 'Okay',   color: Colors.warning[400] },
  { emoji: '😔', label: 'Low',    color: '#FB923C' },
  { emoji: '😢', label: 'Tough',  color: Colors.error[400] },
];

const ENTRIES = [
  {
    id: '1', date: 'Today', time: '8:32 AM', mood: 0,
    title: 'Morning walk with Max 🐕',
    body: 'We went to the park early this morning. Emma came along and she fed the ducks. Max chased every single one of them. Perfect start to the day.',
    tags: ['family', 'outdoors'],
  },
  {
    id: '2', date: 'Yesterday', time: '9:10 PM', mood: 1,
    title: 'Emma\'s school play 🎭',
    body: 'She played the lead role in the school play tonight. I could not be more proud. She forgot one line but improvised perfectly — the whole audience laughed.',
    tags: ['emma', 'milestone'],
  },
  {
    id: '3', date: 'Jun 11', time: '7:45 PM', mood: 1,
    title: 'Family game night 🎲',
    body: 'We played Catan for three hours. Dad won again (suspicious). Mom made homemade pizza. Grandma video-called from Portugal. One of those evenings you want to bottle.',
    tags: ['family', 'fun'],
  },
  {
    id: '4', date: 'Jun 10', time: '10:22 AM', mood: 2,
    title: 'Rainy Sunday thoughts',
    body: 'Nothing planned today. Coffee, a book, the kids watching cartoons. Sometimes the quiet days are the ones that stick.',
    tags: ['reflection'],
  },
  {
    id: '5', date: 'Jun 8', time: '6:00 PM', mood: 3,
    title: 'Stressful week wrapping up',
    body: 'Work was brutal but we made it to Friday. Took the family out for dinner. Emma ordered two desserts and somehow we let her. Worth it for the smile.',
    tags: ['work', 'family'],
  },
];

export default function JournalScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = ENTRIES.filter((e) => {
    if (filter && !e.tags.includes(filter)) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allTags = Array.from(new Set(ENTRIES.flatMap((e) => e.tags)));

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>

        <View style={styles.headerTop}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>📓 Journal</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {ENTRIES.length} entries · 14-day streak 🔥
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
            <Text style={{ fontSize: 22 }}>🔥</Text>
            <Text variant="h4" weight="black" color={C.primary}>14</Text>
          </View>
        </View>

        {/* Mood row */}
        <View style={styles.moodRow}>
          {MOODS.map((m, i) => (
            <TouchableOpacity key={i} style={styles.moodBtn}>
              <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
              <Text variant="caption" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: tokens.background, borderBottomColor: tokens.border }]}>
        <View style={[styles.searchBox, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <Ionicons name="search" size={16} color={tokens.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: tokens.text }]}
            placeholder="Search entries..."
            placeholderTextColor={tokens.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tag filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 48, borderBottomWidth: 1, borderBottomColor: tokens.border }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        <TouchableOpacity
          onPress={() => setFilter(null)}
          style={[styles.tag, { backgroundColor: !filter ? C.primary : tokens.card, borderColor: !filter ? C.primary : tokens.border }]}
        >
          <Text variant="caption" weight="semibold" color={!filter ? '#fff' : tokens.text}>All</Text>
        </TouchableOpacity>
        {allTags.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setFilter(filter === t ? null : t)}
            style={[styles.tag, { backgroundColor: filter === t ? C.primary : tokens.card, borderColor: filter === t ? C.primary : tokens.border }]}
          >
            <Text variant="caption" weight="semibold" color={filter === t ? '#fff' : tokens.text}>#{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 14, paddingBottom: 100 }}>
        {filtered.map((entry) => {
          const mood = MOODS[entry.mood];
          return (
            <TouchableOpacity key={entry.id} activeOpacity={0.85}>
              <Card shadow="sm" style={styles.entryCard}>
                <View style={styles.entryTop}>
                  <View style={[styles.moodDot, { backgroundColor: mood.color + '22', borderColor: mood.color }]}>
                    <Text style={{ fontSize: 18 }}>{mood.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="body" weight="bold" numberOfLines={1}>{entry.title}</Text>
                    <Text variant="caption" secondary>{entry.date} · {entry.time}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={tokens.textSecondary} />
                </View>
                <Text variant="bodySmall" secondary numberOfLines={2} style={styles.entryBody}>{entry.body}</Text>
                <View style={styles.tagRow}>
                  {entry.tags.map((t) => (
                    <View key={t} style={[styles.tagPill, { backgroundColor: C.primary + '18' }]}>
                      <Text variant="caption" color={C.primary}>#{t}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  streakBadge: { alignItems: 'center', borderRadius: 16, padding: 12, minWidth: 60 },
  moodRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  moodBtn:     { alignItems: 'center', gap: 4 },
  searchRow:   { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: 12, height: 38 },
  searchInput: { flex: 1, fontSize: 14 },
  tag:         { paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
  entryCard:   { padding: 16 },
  entryTop:    { flexDirection: 'row', alignItems: 'center' },
  moodDot:     { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  entryBody:   { marginTop: 10, lineHeight: 20 },
  tagRow:      { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tagPill:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  fab:         { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
