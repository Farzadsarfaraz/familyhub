import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Card } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Colors, ModuleColors, BorderRadius, Spacing } from '@/constants/theme';

const C = ModuleColors.documents;

type Doc = {
  id: string; name: string; category: string; type: string;
  size: string; date: string; member?: string; emoji: string; expires?: string;
};

const DOCUMENTS: Doc[] = [
  { id: '1',  name: "Dad's Passport",          category: 'Personal', type: 'PDF',  size: '2.1 MB', date: 'Jun 1',  member: 'Dad',  emoji: '🛂', expires: 'Mar 2030' },
  { id: '2',  name: "Mom's Passport",           category: 'Personal', type: 'PDF',  size: '2.3 MB', date: 'Jun 1',  member: 'Mom',  emoji: '🛂', expires: 'Jul 2028' },
  { id: '3',  name: "Emma's Birth Certificate", category: 'Personal', type: 'PDF',  size: '0.8 MB', date: 'May 28', member: 'Emma', emoji: '📋'  },
  { id: '4',  name: 'Home Insurance Policy',    category: 'Legal',    type: 'PDF',  size: '4.5 MB', date: 'Jan 15', emoji: '🏠', expires: 'Jan 2026' },
  { id: '5',  name: 'Car Insurance',            category: 'Legal',    type: 'PDF',  size: '1.2 MB', date: 'Mar 2',  emoji: '🚗', expires: 'Mar 2026' },
  { id: '6',  name: 'Mortgage Statement',       category: 'Financial', type: 'PDF', size: '0.6 MB', date: 'Jun 1',  emoji: '🏦' },
  { id: '7',  name: 'Tax Return 2024',          category: 'Financial', type: 'PDF', size: '3.2 MB', date: 'Apr 15', emoji: '📊' },
  { id: '8',  name: 'Health Insurance Card',    category: 'Medical',  type: 'IMG', size: '0.4 MB', date: 'Jan 1',  emoji: '💊', expires: 'Dec 2025' },
  { id: '9',  name: "Emma's School Records",    category: 'School',   type: 'PDF', size: '1.8 MB', date: 'Sep 5',  member: 'Emma', emoji: '🎓' },
  { id: '10', name: 'Vaccination Records',      category: 'Medical',  type: 'PDF', size: '0.9 MB', date: 'May 10', emoji: '💉'  },
  { id: '11', name: 'Will & Testament',         category: 'Legal',    type: 'PDF', size: '2.7 MB', date: 'Feb 20', emoji: '⚖️'  },
  { id: '12', name: 'Vehicle Title',            category: 'Legal',    type: 'PDF', size: '1.1 MB', date: 'Oct 3',  emoji: '🚘'  },
];

const CATEGORIES = ['All', 'Personal', 'Legal', 'Financial', 'Medical', 'School'];

const CATEGORY_COLOR: Record<string, string> = {
  Personal:  Colors.primary[500],
  Legal:     '#8B5CF6',
  Financial: Colors.success[500],
  Medical:   Colors.error[500],
  School:    Colors.warning[500],
};

const TYPE_COLOR: Record<string, string> = {
  PDF: Colors.error[500],
  IMG: Colors.primary[500],
  DOC: Colors.warning[500],
};

export default function DocumentsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();
  const [category, setCategory] = useState('All');
  const [search,   setSearch]   = useState('');

  const filtered = DOCUMENTS.filter((d) => {
    if (category !== 'All' && d.category !== category) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const expiringSoon = DOCUMENTS.filter((d) => d.expires).slice(0, 2);

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient
        colors={isDark ? [C.dark, '#0A0A1A'] : [C.light, '#FAFAFA']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : tokens.text} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text variant="h2" weight="black" style={{ color: isDark ? '#fff' : tokens.text }}>📄 Documents</Text>
            <Text variant="bodySmall" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : tokens.textSecondary }}>
              {DOCUMENTS.length} files · Encrypted vault
            </Text>
          </View>
          <View style={[styles.lockBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
            <Ionicons name="lock-closed" size={18} color={C.primary} />
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff', borderColor: isDark ? 'transparent' : tokens.border }]}>
          <Ionicons name="search" size={16} color={isDark ? 'rgba(255,255,255,0.5)' : tokens.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#fff' : tokens.text }]}
            placeholder="Search documents..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : tokens.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </LinearGradient>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, borderBottomWidth: 1, borderBottomColor: tokens.border }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={[styles.catChip, {
              backgroundColor: category === cat ? (CATEGORY_COLOR[cat] ?? C.primary) : tokens.card,
              borderColor: category === cat ? (CATEGORY_COLOR[cat] ?? C.primary) : tokens.border,
            }]}
          >
            <Text variant="caption" weight="semibold" color={category === cat ? '#fff' : tokens.text}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: 12, paddingBottom: 100 }}>
        {/* Expiring soon */}
        {expiringSoon.length > 0 && category === 'All' && !search && (
          <View style={[styles.expireBanner, { backgroundColor: Colors.warning[50], borderColor: Colors.warning[200] }]}>
            <Ionicons name="time-outline" size={18} color={Colors.warning[600]} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="bodySmall" weight="bold" color={Colors.warning[700]}>Documents expiring soon</Text>
              {expiringSoon.map((d) => (
                <Text key={d.id} variant="caption" color={Colors.warning[600]}>{d.name} · expires {d.expires}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Count */}
        <Text variant="bodySmall" secondary>{filtered.length} document{filtered.length !== 1 ? 's' : ''}</Text>

        {filtered.map((doc) => {
          const catColor = CATEGORY_COLOR[doc.category] ?? C.primary;
          return (
            <TouchableOpacity key={doc.id} activeOpacity={0.85}>
              <Card shadow="sm" style={styles.docCard}>
                <View style={[styles.docIcon, { backgroundColor: catColor + '18' }]}>
                  <Text style={{ fontSize: 24 }}>{doc.emoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>{doc.name}</Text>
                  <View style={styles.metaRow}>
                    <Text variant="caption" secondary>{doc.date}</Text>
                    <Text variant="caption" secondary> · {doc.size}</Text>
                    {doc.member && <Text variant="caption" secondary> · {doc.member}</Text>}
                  </View>
                  {doc.expires && (
                    <Text variant="caption" color={Colors.warning[500]}>Expires {doc.expires}</Text>
                  )}
                </View>
                <View style={styles.docRight}>
                  <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLOR[doc.type] ?? C.primary) + '18' }]}>
                    <Text variant="caption" weight="bold" color={TYPE_COLOR[doc.type] ?? C.primary}>{doc.type}</Text>
                  </View>
                  <Ionicons name="cloud-download-outline" size={18} color={tokens.textSecondary} style={{ marginTop: 8 }} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: C.primary }]}>
        <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: Spacing[4], paddingBottom: Spacing[5] },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  lockBadge:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: 12, height: 40 },
  searchInput:   { flex: 1, fontSize: 14 },
  catChip:       { paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  expireBanner:  { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: BorderRadius.lg, borderWidth: 1 },
  docCard:       { flexDirection: 'row', alignItems: 'center', padding: 14 },
  docIcon:       { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metaRow:       { flexDirection: 'row', marginTop: 2 },
  docRight:      { alignItems: 'center' },
  typeBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  fab:           { position: 'absolute', bottom: 32, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
});
